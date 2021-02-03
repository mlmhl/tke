import { QueryState, RecordSet, uuid } from '@tencent/ff-redux';
import axios from 'axios';
import { resourceConfig } from '../../../../config/resourceConfig';
import { reduceK8sRestfulPath } from '../../../../helpers';
import { Method, reduceNetworkRequest } from '../../../../helpers/reduceNetwork';
import { RequestParams, Resource } from '../../../modules/common';
import { ResourceInfo } from '../../common/models/ResourceInfo';
import { Namespace, ResourceFilter } from '../models';
const tips = seajs.require('tips');
// const url = 'http://c.oa.com/api/';
const url = '/web-api/cmdb';
const jsonrpc = '2.0';

/**
 * 获取部门信息
 */
export async function fetchDepartmentList() {
  let departmentList = [];
  const params: RequestParams = {
    method: Method.get,
    url: url + '/allDept',
  };
  try {
    const response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.code === 100000) {
      departmentList = response.data.data.items.map(item => {
        return {
          ...item,
          value: item.Id,
          text: item.Name,
          tooltip: item.Name,
        };
      });
    }
    return departmentList;
  } catch (error) {
    tips.error(error, 2000);
  }
  return departmentList;
}

/**
 *获取产品信息
 *param departmentId 部门信息
 */
export async function fetchProductList(departmentId: number) {
  let productList = [];
  const params: RequestParams = {
    method: Method.get,
    url: url + '/product?fatherId=' + departmentId,
  };
  try {
    const response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.code === 100000) {
      productList = response.data.data.items.map(item => {
        return {
          ...item,
          value: item.key,
          text: item.title,
          tooltip: item.title,
        };
      });
    }
    return productList;
  } catch (error) {
    tips.error(error, 2000);
  }
  return productList;
}

/**
 * 获取一级业务列表
 * @param productId 产品信息
 */
export async function fetchBsiPath1List(productId: number) {
  let bsiPath1List = [];
  const params: RequestParams = {
    method: Method.get,
    url: url + '/business1?fatherId=' + productId,
  };
  try {
    const response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.code === 100000) {
      bsiPath1List = response.data.data.items.map(item => {
        return {
          ...item,
          value: item.key,
          text: item.title,
          tooltip: item.title,
        };
      });
    }
  } catch (error) {
    tips.error(error, 2000);
  }
  return bsiPath1List;
}

/**
 * 获取二级业务列表
 * @param bs1_name_id 一级业务信息
 */
export async function fetchBsiPath2List(bs1_name_id: number) {
  let bsiPath2List = [];
  const params: RequestParams = {
    method: Method.get,
    url: url + '/business2?fatherId=' + bs1_name_id,
  };
  try {
    const response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.code === 100000) {
      bsiPath2List = response.data.data.items.map(item => {
        return {
          ...item,
          value: item.key,
          text: item.title,
          tooltip: item.title,
        };
      });
    }
  } catch (error) {
    tips.error(error, 2000);
  }
  return bsiPath2List;
}

/**
 * 获取三级业务列表
 * @param bs2_name_id 二级业务信息
 */
export async function fetchBsiPath3List(bs2_name_id: number) {
  let bsiPath3List = [];
  const params: RequestParams = {
    method: Method.get,
    url: url + '/business3?fatherId=' + bs2_name_id,
  };
  try {
    const response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.code === 100000) {
      bsiPath3List = response.data.data.items.map(item => {
        return {
          ...item,
          value: item.key,
          text: item.title,
          tooltip: item.title,
        };
      });
    }
  } catch (error) {
    tips.error(error, 2000);
  }
  return bsiPath3List;
}

/**
 * 获取用户列表
 */
export async function fetchUserList() {
  let userList = [];
  // let users: User[] = [];
  // const { search, filter } = query;
  // let { isPolicyUser = false } = filter;
  // const queryObj = !search
  //     ? {}
  //     : {
  //       fieldSelector: {
  //         keyword: search || ''
  //       }
  //     };

  try {
    // const resourceInfo: ResourceInfo = isPolicyUser ? resourceConfig()['user'] : resourceConfig()['localidentity'];
    const resourceInfo: ResourceInfo = resourceConfig()['localidentity'];

    const url = reduceK8sRestfulPath({ resourceInfo });
    const response = await reduceNetworkRequest({
      method: Method.get,
      url: url
    });

    if (response.data.items) {
      const responseObj = {};
      response.data.items.forEach(item => {
        if (!responseObj[item.spec.username]) {
          responseObj[item.spec.username] = item;
        }
      });
      const newResponse = Object.values(responseObj);
      userList = newResponse.map((item: any) => {
        return {
          ...item,
          value: item.spec.username,
          text: item.spec.displayName,
        };
      });
    }
  } catch (error) {
    tips.error(error.response.data.message, 2000);
  }
  // const result: RecordSet<any> = {
  //   recordCount: users.length,
  //   records: users
  // };
  // const result: RecordSet<User> = {
  //   recordCount: users.length,
  //   records: users
  // };
  return userList;
}

/**
 * 获取登录用户信息，包括用户业务信息
 */
export async function getLoginUserInfo() {
  let infoResourceInfo: ResourceInfo = resourceConfig()['info'];
  let url = reduceK8sRestfulPath({ resourceInfo: infoResourceInfo });
  let params: RequestParams = {
    method: Method.get,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params);
    let loginUserInfo = {
      id: '',
      name: '',
      displayName: '',
    };
    if (!response.code) {
      const { uid, name, extra } = response.data;
      loginUserInfo = {
        id: uid,
        name,
        displayName: extra.displayname ? extra.displayname[0] : '',
      };
    }
    return loginUserInfo;
  } catch (error) {}
}
