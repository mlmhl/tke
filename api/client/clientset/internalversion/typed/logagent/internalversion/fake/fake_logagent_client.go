/*
 * Tencent is pleased to support the open source community by making TKEStack
 * available.
 *
 * Copyright (C) 2012-2019 Tencent. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the
 * License at
 *
 * https://opensource.org/licenses/Apache-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OF ANY KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations under the License.
 */

// Code generated by client-gen. DO NOT EDIT.

package fake

import (
	rest "k8s.io/client-go/rest"
	testing "k8s.io/client-go/testing"
	internalversion "tkestack.io/tke/api/client/clientset/internalversion/typed/logagent/internalversion"
)

type FakeLogagent struct {
	*testing.Fake
}

func (c *FakeLogagent) ConfigMaps() internalversion.ConfigMapInterface {
	return &FakeConfigMaps{c}
}

func (c *FakeLogagent) LogAgents() internalversion.LogAgentInterface {
	return &FakeLogAgents{c}
}

// RESTClient returns a RESTClient that is used to communicate
// with API server by this client implementation.
func (c *FakeLogagent) RESTClient() rest.Interface {
	var ret *rest.RESTClient
	return ret
}