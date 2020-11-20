import { Modal } from '@tea/component';
import { Method, reduceNetworkRequest } from '@helper/index';
import { RequestParams, Resource } from '../../common/models';
import { QueryState, RecordSet } from '@tencent/ff-redux/src';
import { uuid } from '@tencent/ff-redux/libs/qcloud-lib';

const _ = require('lodash');
const { get, isEmpty } = require('lodash');

interface Polaris {
  metadata: any;
  spec: any;
  [props: string]: any;
}

function alertError(error, url) {
  let message = `错误码：${error.response.status}，错误描述：${error.response.statusText}`;
  let description = `请求路径: ${url} `;
  // if (error.response.status === 500) {
  if (error.response.data) {
    // 内部异常的response可能是文本也可能是错误对象
    if (typeof error.response.data.message === 'string') {
      description += `错误消息：${error.response.data.message}`;
    } else {
      description += `错误消息：${_(error.response.data).value()}`;
    }
  }
  Modal.error({
    message,
    description,
  });
}

async function fetchPolarisData({ namespaceId, clusterId }: { namespaceId: string; clusterId: string }) {
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${namespaceId}&labelSelector=type.bind=polaris`;
  const params: RequestParams = {
    method: Method.get,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterId);

    let polarisList = [],
        total = 0;
    if (response.code === 0) {
      let list = response.data;

      // 在返回数据中后台应该返回对应的长度，这里的返回数据中没有，所以使用了length
      total = list.items.length;
      polarisList = list.items;
      // polarisList = list.items.map(item => {
      //   return {
      //     ...item,
      //     key: uuid(),
      //   };
      // });
    }
    const result: RecordSet<Resource> = {
      recordCount: total,
      records: polarisList
    };
    return result;
  } catch (error) {
    // alertError(error, url);
    throw error;
  }
}

/**
 * 创建北极星规则
 */
async function createPolaris({ namespaceId, clusterId, polarisData }: { namespaceId: string; clusterId: string; polarisData: any }) {
  const newNamespaceId = namespaceId.replace(new RegExp(`^${clusterId}-`), '');
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${newNamespaceId}`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: polarisData
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      return true;
    }
  } catch (error) {
    alertError(error, url);
  }
}

/**
 * 获取单个北极星规则
 */
async function fetchPolaris({ namespaceId, clusterId, ruleName }: { namespaceId: string; clusterId: string; ruleName: string }) {
  const newNamespaceId = namespaceId.replace(new RegExp(`^${clusterId}-`), '');
  let polaris;
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${newNamespaceId}&name=${ruleName}`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      polaris = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }
  return polaris;
}

/**
 * 删除北极星规则
 */
async function deletePolaris({ namespaceId, clusterId, ruleName }: { namespaceId: string; clusterId: string; ruleName: string }) {
  const newNamespaceId = namespaceId.replace(new RegExp(`^${clusterId}-`), '');
  let polaris;
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${newNamespaceId}&name=${ruleName}`;
  let params: RequestParams = {
    method: Method.delete,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      return true;
    } else {
      alertError({ response }, url);
      return false;
    }
  } catch (error) {
    alertError(error, url);
  }
}

/**
 * 修改北极星规则
 * @param namespaceId
 * @param clusterId
 * @param ruleName
 * @param polarisData
 */
async function modifyPolaris({ namespaceId, clusterId, ruleName, polarisData }: { namespaceId: string; clusterId: string; ruleName: string; polarisData: any }) {
  const newNamespaceId = namespaceId.replace(new RegExp(`^${clusterId}-`), '');
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${newNamespaceId}&name=${ruleName}`;
  let params: RequestParams = {
    method: Method.put,
    url,
    data: polarisData
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      return true;
    }
  } catch (error) {
    alertError(error, url);
  }
}

async function fetchPolarisYaml({ clusterId, namespaceId, ruleName }) {
  let result = '';
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${namespaceId}&name=${ruleName}`;
  let userDefinedHeader = {
    Accept: 'application/yaml',
  };
  let params: RequestParams = {
    method: Method.get,
    userDefinedHeader,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      result = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 更新YAML
 */
async function modifyPolarisYaml({ namespaceId, clusterId, ruleName, yamlData }: { namespaceId: string; clusterId: string; ruleName: string; yamlData: any }) {
  let result = '';
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${namespaceId}&name=${ruleName}`;
  const userDefinedHeader = {
    Accept: 'application/json',
    'Content-Type': 'application/yaml'
  };
  let params: RequestParams = {
    method: Method.put,
    url,
    userDefinedHeader,
    data: yamlData
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      result = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 北极星是否安装的check接口
 */
async function polarisInstallCheckByCluster({ clusterId }: { clusterId: string; }) {
  let result;
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/polaris?action=isInstalled`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      result = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

export {
  Polaris,
  fetchPolarisData,
  createPolaris,
  fetchPolaris,
  deletePolaris,
  modifyPolaris,
  fetchPolarisYaml,
  modifyPolarisYaml,
  polarisInstallCheckByCluster
};
