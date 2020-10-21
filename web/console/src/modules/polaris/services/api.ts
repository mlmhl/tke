import { Modal } from '@tea/component';
import { Method, reduceNetworkRequest } from '@helper/index';
import { RequestParams, Resource } from '../../common/models';
import { QueryState, RecordSet } from '@tencent/ff-redux/src';
import { uuid } from '@tencent/ff-redux/libs/qcloud-lib';

const _ = require('lodash');
const { get, isEmpty } = require('lodash');

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

/**
 * 获取全部集群列表
 */
export async function fetchAllClusters() {
  let clusterList = [];
  let url = '/apis/platform.tkestack.io/v1/clusters';
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        clusterList = list.items.map(item => {
          return {
            ...item,
            value: item.metadata.name,
            text: `${item.spec.displayName}(${item.metadata.name})`,
            // name: item.metadata.name,
            // displayName: item.spec.displayName,
            // phase: item.status.phase,
          };
        });
      }
    }
  } catch (error) {
    alertError(error, url);
  }
  console.log('clusterList iis:', clusterList);
  return clusterList;
}

/**
 * 获取业务下的命名空间列表
 * @param projectId
 */
export async function fetchNamespacesByProject({ projectId }: { projectId: string }) {
  let namespaceList = [];
  let url = `/apis/business.tkestack.io/v1/namespaces/${projectId}/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      let list = response.data;

      namespaceList = list.items.map(item => {
        const { name: fullName } = item.metadata;
        const { clusterName, clusterDisplayName, namespace: namespaceName } = item.spec;
        return {
          ...item,
          id: uuid(),
          value: fullName,
          text: namespaceName,
          groupKey: clusterName,
          groupValue: `${clusterDisplayName}(${clusterName})`,
          namespaceId: namespaceName
          // name: item.spec.namespace,
          // fullName: item.metadata.name,
          // clusterName: item.spec.clusterName,
          // clusterDisplayName: item.spec.clusterDisplayName,
          // projectId,
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  return namespaceList;
}

/**
 * 获取集群下的命名空间列表
 * @param clusterId
 */
export async function fetchNamespacesByCluster({ clusterId }: { clusterId: string }) {
  let namespaceList = [];
  let url = `/api/v1/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      let namespaces = get(response, 'data.items', []);
      namespaceList = namespaces.map(item => {
        return {
          ...item,
          id: uuid(),
          value: item.metadata.name,
          text: item.metadata.name,
          // name: item.metadata.name,
          // fullName: `${clusterName}-${item.metadata.name}`,
          // clusterName,
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  return namespaceList;
}

export async function fetchPolarisData({ namespaceId, clusterId }: { namespaceId: string; clusterId: string }) {
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbinds?namespace=${namespaceId}&labelSelector=type.bind=polaris`;
  const params: RequestParams = {
    method: Method.get,
    url,
  };
  let polarisList = [],
      total = 0;

  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      let list = response.data;

      // 在返回数据中后台应该返回对应的长度，这里的返回数据中没有，所以使用了length
      total = list.items.length;
      polarisList = list.items.map(item => {
        return {
          ...item,
          key: uuid(),
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  const result: RecordSet<Resource> = {
    recordCount: total,
    records: polarisList
  };
  return result;
}

/**
 * 获取workloads
 * 带是否可用于创建服务器组的标志
 * @param clusterName
 * @param namespace
 * @param workloadType
 */
export async function fetchWorkloadsByNamespace(clusterName, namespace, workloadType) {
  let workloads = [];
  let url = `/apis/apps/v1/namespaces/${namespace}/${workloadType}`;
  if (workloadType === 'tapps') {
    url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/tapps?namespace=${namespace}`;
  }
  let params: RequestParams = {
    method: Method.get,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      workloads = response.data.items;
    }
  } catch (error) {
    alertError(error, url);
  }

  return workloads;
}

/**
 * 创建北极星规则
 */
export async function createPolaris({ namespaceId, clusterId, polarisData }: { namespaceId: string; clusterId: string; polarisData: any }) {
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
export async function fetchPolaris({ namespaceId, clusterId, ruleName }: { namespaceId: string; clusterId: string; ruleName: string }) {
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
export async function deletePolaris({ namespaceId, clusterId, ruleName }: { namespaceId: string; clusterId: string; ruleName: string }) {
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
export async function modifyPolaris({ namespaceId, clusterId, ruleName, polarisData }: { namespaceId: string; clusterId: string; ruleName: string; polarisData: any }) {
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

/**
 * 按规则名获取实例信息
 * @param clusterId
 * @param namespaceId
 * @param ruleName
 */
export async function fetchInstanceByRuleName({ clusterId, namespaceId, ruleName }) {
  let instanceList = [];
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbackendrecords?namespace=${namespaceId}&labelSelector=lbcf.tkestack.io/bind=${ruleName}`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      const list = response.data;
      instanceList = list.items.map(item => {
        return {
          ...item,
          id: uuid(),
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  return instanceList;
}

/**
 * 获取实例事件
 * @param clusterId
 * @param namespaceId
 * @param ruleName
 */
export async function fetchInstanceEvent({ clusterId, namespaceId, instanceId }) {
  let eventList = [];
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbackendrecords?namespace=${namespaceId}&name=${instanceId}&action=events`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      const list = response.data;
      eventList = list.items.map(item => {
        return {
          ...item,
          id: uuid(),
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  return eventList;
}

export async function fetchPolarisYaml({ clusterId, namespaceId, ruleName }) {
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
export async function modifyPolarisYaml({ namespaceId, clusterId, ruleName, yamlData }: { namespaceId: string; clusterId: string; ruleName: string; yamlData: any }) {
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
export async function polarisInstallCheckByCluster({ clusterId }: { clusterId: string; }) {
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

