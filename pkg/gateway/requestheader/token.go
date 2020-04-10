/*
 * Tencent is pleased to support the open source community by making TKEStack
 * available.
 *
 * Copyright (C) 2012-2019 Tencent. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”); you may not use
 * this file except in compliance with the License. You may obtain a copy of the
 * License at
 *
 * https://opensource.org/licenses/Apache-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS, WITHOUT
 * WARRANTIES OF ANY KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations under the License.
 */

package requestheader

import (
	"context"
	"fmt"
	"net/http"

	gooidc "github.com/coreos/go-oidc"
	"github.com/emicklei/go-restful"
	"golang.org/x/oauth2"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apiserver/pkg/endpoints/handlers/responsewriters"

	"tkestack.io/tke/pkg/apiserver/authentication/authenticator/oidc"
	"tkestack.io/tke/pkg/gateway/token"
)

// GroupName is the api group name for gateway.
const GroupName = "gateway.tkestack.io"

// Version is the api version for gateway.
const Version = "v1"

// UserInfo defines a data structure containing user information.
type UserInfo struct {
	Name   string              `json:"name"`
	UID    string              `json:"uid"`
	Groups []string            `json:"groups"`
	Extra  map[string][]string `json:"extra"`
}

const (
	nameHeader   = "X-Remote-User"
	tenantHeader = "X-Remote-Extra-TenantID"
)

func RegisterTokenRoute(container *restful.Container, oauthConfig *oauth2.Config, oidcHTTPClient *http.Client) {
	ws := new(restful.WebService)
	ws.Path(fmt.Sprintf("/apis/%s/%s/tokens", GroupName, Version))

	ws.Route(ws.
		POST("/").
		Doc("generate token by username and password").
		Operation("createPasswordToken").
		Produces(restful.MIME_JSON).
		Returns(http.StatusCreated, "Created", v1.Status{}).
		Returns(http.StatusInternalServerError, "InternalError", v1.Status{}).
		Returns(http.StatusUnauthorized, "Unauthorized", v1.Status{}).
		To(handleTokenGenerateFunc(oauthConfig, oidcHTTPClient)))
	ws.Route(ws.
		GET("info").
		Doc("obtain the user information corresponding to the token").
		Operation("getInfo").
		Consumes(restful.MIME_JSON).
		Produces(restful.MIME_JSON).
		Returns(http.StatusOK, "Ok", UserInfo{}).
		Returns(http.StatusInternalServerError, "InternalError", v1.Status{}).
		Returns(http.StatusUnauthorized, "Unauthorized", v1.Status{}).
		To(handleTokenInfo()))
	ws.Route(ws.
		GET("redirect").
		Doc("redirect to OpenID Connect server for authentication").
		Operation("createRedirect").
		Consumes(restful.MIME_JSON).
		Produces(restful.MIME_JSON).
		Returns(http.StatusFound, "Found", v1.Status{}).
		To(handleTokenRedirectFunc()))
	ws.Route(ws.
		POST("renew").
		Doc("renew a token by refresh token").
		Operation("createRenewToken").
		Consumes(restful.MIME_JSON).
		Produces(restful.MIME_JSON).
		Returns(http.StatusCreated, "Created", v1.Status{}).
		Returns(http.StatusNoContent, "NoContent", v1.Status{}).
		Returns(http.StatusInternalServerError, "InternalError", v1.Status{}).
		Returns(http.StatusUnauthorized, "Unauthorized", v1.Status{}).
		To(handleTokenRenewFunc()))
	container.Add(ws)
}

func handleTokenGenerateFunc(oauthConfig *oauth2.Config, httpClient *http.Client) func(*restful.Request, *restful.Response) {
	return func(request *restful.Request, response *restful.Response) {
		username, password, err := retrievePassword(request.Request)
		if err != nil {
			responsewriters.WriteRawJSON(http.StatusUnauthorized, errors.NewUnauthorized(err.Error()), response.ResponseWriter)
			return
		}

		ctx := gooidc.ClientContext(context.Background(), httpClient)
		t, err := oauthConfig.PasswordCredentialsToken(ctx, username, password)
		if err != nil {
			responsewriters.WriteRawJSON(http.StatusUnauthorized, errors.NewUnauthorized(err.Error()), response.ResponseWriter)
			return
		}

		if err := token.ResponseToken(t, response.ResponseWriter); err != nil {
			responsewriters.WriteRawJSON(http.StatusInternalServerError, errors.NewInternalError(err), response.ResponseWriter)
			return
		}

		responsewriters.WriteRawJSON(http.StatusCreated, v1.Status{
			Status: v1.StatusSuccess,
			Code:   http.StatusCreated,
		}, response.ResponseWriter)
	}
}

func handleTokenInfo() func(*restful.Request, *restful.Response) {
	return func(request *restful.Request, response *restful.Response) {
		userInfo := &UserInfo{
			Name: request.HeaderParameter(nameHeader),
			UID:  request.HeaderParameter(nameHeader),
		}

		if request.HeaderParameter(tenantHeader) != "" {
			userInfo.Extra = map[string][]string{
				oidc.TenantIDKey: {
					request.HeaderParameter(tenantHeader),
				},
			}
		}
		responsewriters.WriteRawJSON(http.StatusOK, userInfo, response.ResponseWriter)
	}
}

func handleTokenRedirectFunc() func(*restful.Request, *restful.Response) {
	return func(request *restful.Request, response *restful.Response) {
		responsewriters.WriteRawJSON(http.StatusFound, v1.Status{
			Status: v1.StatusSuccess,
			Code:   http.StatusFound,
		}, response.ResponseWriter)
	}
}

func handleTokenRenewFunc() func(*restful.Request, *restful.Response) {
	return func(request *restful.Request, response *restful.Response) {
		responsewriters.WriteRawJSON(http.StatusCreated, v1.Status{
			Status: v1.StatusSuccess,
			Code:   http.StatusCreated,
		}, response.ResponseWriter)
	}
}

func retrievePassword(request *http.Request) (string, string, error) {
	userName := request.PostFormValue("username")
	password := request.PostFormValue("password")

	if len(userName) == 0 || len(password) == 0 {
		return "", "", fmt.Errorf("username or password is empty")
	}

	return userName, password, nil
}
