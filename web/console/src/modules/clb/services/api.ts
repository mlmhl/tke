import { Modal } from '@tea/component';
import { Method, reduceNetworkRequest } from '@helper/index';
import { RequestParams } from '../../common/models';
import { PagingQuery } from '../models';
import { Instance, ImportedInstance } from '../models/instance';

const _ = require('lodash');
const { get, isEmpty } = require('lodash');
const querystring = require('querystring');

function alertError(error, url) {
  let message = `错误码：${error.response.status}，错误描述：${error.response.statusText}`;
  let description = `请求路径: ${url} `;
  // if (error.response.status === 500) {
  if (error.response.data) {
    // 内部异常的response可能是文本也可能是错误对象
    description += `错误消息：${_(error.response.data).value()}`;
  }
  Modal.error({
    message,
    description
  });
}

/**
 * 获取全部集群列表
 */
export async function getAllClusters() {
  let clusters = [];
  let url = '/apis/platform.tkestack.io/v1/clusters';
  let params: RequestParams = {
    method: Method.get,
    url
  };

  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        clusters = list.items.map(item => {
          return {
            name: item.metadata.name,
            displayName: item.spec.displayName,
            phase: item.status.phase
          };
        });
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return clusters;
}

/**
 * 获取业务下的命名空间列表
 * @param projectId
 */
export async function getNamespacesByProject(projectId) {
  let namespaceList = [];
  let url = `/apis/business.tkestack.io/v1/namespaces/${projectId}/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url
  };

  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      let list = response.data;
      namespaceList = list.items.map(item => {
        return {
          name: item.spec.namespace,
          fullName: item.metadata.name,
          clusterName: item.spec.clusterName,
          clusterDisplayName: item.spec.clusterDisplayName,
          projectId
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
 * @param clusterName
 */
export async function getNamespacesByCluster(clusterName) {
  let namespaceList = [];
  let url = `/api/v1/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url
  };

  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let namespaces = get(response, 'data.items', []);
      namespaceList = namespaces.map(item => {
        return {
          name: item.metadata.name,
          fullName: `${clusterName}-${item.metadata.name}`,
          // uid: item.metadata.uid,
          // phase: item.status.phase,
          clusterName
        };
      });
    }
  } catch (error) {
    alertError(error, url);
  }

  return namespaceList;
}

/**
 * 获取指定集群下的已导入CLB实例列表
 * @param clusterName
 */
export async function getImportedInstancesByCluster(clusterName): Promise<ImportedInstance[]> {
  let instances = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listImportedCLB`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        instances = list.items.map(({ clbID, ...rest }) => ({ clbId: clbID, ...rest }));
        console.log('instances@getImportedInstancesByCluster = ', instances);
        // instances = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return instances;
}

/**
 * 获取指定集群下的CLB规则列表（实例使用情况）
 * @param clusterName
 */
export async function getRulesByCluster(clusterName) {
  let result = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listRules`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        result = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 禁用CLB实例
 * @param clusterName
 * @param clbId
 */
export async function disableInstance(clusterName, clbId) {
  let result;
  let url = `apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=disableCLB&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.post,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 启用CLB实例
 * @param clusterName
 * @param clbId
 */
export async function enableInstance(clusterName, clbId) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=enableCLB&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.post,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 删除CLB实例
 * @param clusterName
 * @param clbId
 */
export async function removeInstance(clusterName, clbId) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=deleteCLB&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.post,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取指定集群下可选的的CLB实例列表
 * @param clusterName
 */
export async function getAvailableInstancesByCluster(
  clusterName,
  pagination: PagingQuery,
  keyword = ''
): Promise<[number, Instance[]]> {
  let result = [];
  let totalCount = 0;
  console.log('pagination@getAvailableInstancesByCluster = ', pagination);
  const { pageIndex = 1, pageSize = 20 } = pagination; // 设置一下默认值
  const query = {
    namespace: 'kube-system',
    name: 'lbcf-tkestack-clb-driver',
    action: 'driverProxy',
    api: 'listCLB',
    apiPort: 80,
    offset: (pageIndex - 1) * pageSize,
    limit: pageSize
  };
  if (
    new RegExp(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/).test(
      keyword
    )
  ) {
    // vip
    Object.assign(query, { vip: keyword });
  } else if (new RegExp(/^lb-[a-z0-9]{8}$/).test(keyword)) {
    // clbID, lb-开头，总共11位长
    Object.assign(query, { clbID: keyword });
  } else {
    Object.assign(query, { clbName: keyword });
  }
  // TODO: 用querystring把参数按照对象进行处理
  const url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?${querystring.stringify(query)}`;
  // const url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=listCLB&apiPort=80&offset=${(pageIndex - 1) * pageSize}&limit=${pageSize}`;
  // NOTE: 比较含糊这种硬编码的apiPort=80在不同的环境下会不会变化
  const params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    const response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      const list = get(response.data, 'Response.LoadBalancerSet', []);
      totalCount = get(response.data, 'Response.TotalCount', 0);
      result = list.map(({ LoadBalancerId, LoadBalancerName, LoadBalancerVips, LoadBalancerType }) => ({
        clbId: LoadBalancerId,
        clbName: LoadBalancerName,
        vips: LoadBalancerVips,
        type: LoadBalancerType
      }));
    }
  } catch (error) {
    alertError(error, url);
  }

  return [totalCount, result];
}

/**
 * 导入CLB实例
 * @param clusterName 集群名称
 * @param clbId CLB实例ID
 * @param scope CLB实例允许使用的命名空间，"*"为任意空间
 */
export async function importInstance(clusterName, payload) {
  let result = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=importCLB`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取CLB实例详情
 * @param clusterName
 * @param clbId
 */
export async function getInstanceInfo(clusterName, clbId) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=getImportedCLB&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 修改命名空间
 * @param clusterName 集群名称
 * @param clbId CLB实例ID
 * @param scope CLB实例允许使用的命名空间，"*"为任意空间
 */
export async function modifyInstanceNamespace(clusterName, clbId, scope) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=updateCLBScope&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: {
      scope
    }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
    return { code: 500, message: 'exception' };
  }

  return result;
}

/**
 * 获取指定的集群和命名空间下的规则列表
 * @param clusterName
 * @param namespace
 */
export async function getRuleList(clusterName, namespace) {
  let backendsList = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listRules&ns=${namespace}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        backendsList = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return backendsList;
}

/**
 * 删除规则
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function removeRule(clusterName, namespace, ruleName, payload) {
  let result;
  // let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbs?namespace=${namespace}&name=${ruleName}`;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=deleteRule&ruleNS=${namespace}&ruleName=${ruleName}`;
  let params: RequestParams = {
    method: Method.delete,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取指定集群和命名空间下可选的的CLB实例列表
 * @param clusterName
 * @param namespace
 */
export async function getAvailableInstancesByClusterAndNamespace(clusterName, namespace) {
  let result = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listImportedCLB&ns=${namespace}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        result = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 分配随机端口（新建监听器时）
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function generateServerPort(clusterName, lbId, protocol) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=applyListenerPort`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: {
      lbId,
      protocol
    }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 新建规则
 * @param clusterName 集群名称
 * @param payload rule的实体
 */
export async function createRule(clusterName, payload) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=createRule`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取可选的监听器
 * @param clusterName
 * @param clbId
 */
export async function getAvailableListeners(clusterName, clbId) {
  let result = {
    listeners: [],
    occupied: []
  };
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=listListener&apiPort=80&lbID=${clbId}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let data = response.data;
      if (data && data.Response && data.Response.Listeners) {
        result.listeners = [...data.Response.Listeners];
      }
      if (data && data.occupied) {
        result.occupied = [...data.occupied];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取规则详情
 * @param clusterName
 * @param namespace
 * @param ruleName
 */
export async function getRuleInfo(clusterName, namespace, ruleName) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=getRule&ruleNS=${namespace}&ruleName=${ruleName}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    alertError(error, url);
    return {};
  }

  return result;
}

/**
 * 修改规则的命名空间
 * @param clusterName 集群名称
 * @param namespace
 * @param ruleName
 * @param scope CLB实例允许使用的命名空间，"*"为任意空间
 */
export async function modifyRuleNamespace(clusterName, namespace, ruleName, scope) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=updateRuleScope`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: {
      ruleNamespace: namespace,
      ruleName,
      scope
    }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取指定集群和命名空间下的服务器组列表
 * @param clusterName 集群名称
 * @param namespace 命名空间名称
 */
export async function getBackendsList(clusterName, namespace) {
  let backendsList = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listGroups&groupNS=${namespace}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        backendsList = [...list.items];
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    alertError(error, url);
  }

  return backendsList;
}

/**
 * 获取某个命名空间下的全部Deployment列表
 * @param namespace 命名空间名称
 */
export async function getDeploymentsByNamespace(clusterName, namespace) {
  let deploymentList = [];
  let url = `apis/apps/v1/namespaces/${namespace}/deployments`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        deploymentList = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return deploymentList;
}

/**
 * 获取某个命名空间下的全部Statefulset列表
 * @param namespace 命名空间名称
 */
export async function getStatefulsetsByNamespace(clusterName, namespace) {
  let statefulsetList = [];
  let url = `apis/apps/v1/namespaces/${namespace}/statefulsets`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        statefulsetList = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return statefulsetList;
}

/**
 * 获取某个命名空间下的全部Tapp列表
 * @param namespace 命名空间名称
 */
export async function getTappsByNamespace(clusterName, namespace) {
  let tappList = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/tapps?namespace=${namespace}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        tappList = [...list.items];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return tappList;
}

/**
 * 获取workloads
 * 带是否可用于创建服务器组的标志
 * @param clusterName
 * @param namespace
 * @param workloadType
 */
export async function getWorkloadsByNamespace(clusterName, namespace, workloadType) {
  let workloads = [];
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listWorkload&workloadNS=${namespace}&workloadType=${workloadType}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.workloads) {
        workloads = [...list.workloads];
      }
    }
  } catch (error) {
    alertError(error, url);
  }

  return workloads;
}

/**
 * 删除服务器组
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function removeBackendsGroup(clusterName, namespace, backendGroupName) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}&name=${backendGroupName}`;
  let params: RequestParams = {
    method: Method.delete,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 新建服务器组
 * @param clusterName 集群名称
 * @param namespace 命名空间
 * @param backendGroupName 服务器组名称
 */
export async function createBackendsGroup(clusterName, namespace, payload) {
  let result;
  // let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}`;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=createGroup&apiPort=80`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 修改服务器组关联的规则
 * @param clusterName
 * @param namespace
 * @param backendsGroupName
 * @param payload
 */
export async function changeRulesForBackendsGroup(clusterName, namespace, backendsGroupName, payload) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=updateGroupRule&apiPort=80&groupNS=${namespace}&groupName=${backendsGroupName}`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取服务器组详情
 * @param clusterName
 * @param namespace
 * @param backendGroupName
 */
export async function getBackendsGroupInfo(clusterName, namespace, backendGroupName) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}&name=${backendGroupName}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取规则和服务器信息
 * 是个列表
 * @param clusterName
 * @param namespace
 * @param backendGroupName
 */
export async function getBackendsInfo(clusterName, namespace, backendGroupName) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listGroupServers&groupNS=${namespace}&groupName=${backendGroupName}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let { items } = response.data;
      result = [...items];
    }
  } catch (error) {
    alertError(error, url);
    return [];
  }

  return result;
}

/**
 * 获取规则事件
 * 以lbcf-开头的规则使用kube-system命名空间
 * @param clusterName
 * @param namespace
 * @param ruleName
 */
export async function getEventListByRule(clusterName, namespace, ruleName) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbs?namespace=${
    /lbcf-*/.test(ruleName) ? 'kube-system' : namespace
  }&name=${ruleName}&action=events`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let { items } = response.data;
      result = items ? [...items] : [];
    }
  } catch (error) {
    alertError(error, url);
    return [];
  }

  return result;
}

/**
 * 获取服务器事件
 * @param clusterName
 * @param namespace
 * @param serverId
 */
export async function getEventListByBackends(clusterName, namespace, serverId) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=getBackendRecordEvent&serverNS=${namespace}&serverID=${serverId}`;
  let params: RequestParams = {
    method: Method.get,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let { items } = response.data;
      result = [...items];
    }
  } catch (error) {
    alertError(error, url);
    return [];
  }

  return result;
}

/**
 * 获取规则的yaml内容
 * @param clusterName
 * @param namespace
 * @param ruleName
 */
export async function getRuleYamlContent(clusterName, namespace, ruleName) {
  let result = '';
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbs?namespace=${
    /lbcf-*/.test(ruleName) ? 'kube-system' : namespace
  }&name=${ruleName}`;
  let userDefinedHeader = {
    Accept: 'application/yaml'
  };
  let params: RequestParams = {
    method: Method.get,
    userDefinedHeader,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      result = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 获取服务器组的yaml内容
 * @param clusterName
 * @param namespace
 * @param backendsGroupName
 */
export async function getBackendsGroupYamlContent(clusterName, namespace, backendsGroupName) {
  let result = '';
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}&name=${backendsGroupName}`;
  let userDefinedHeader = {
    Accept: 'application/yaml'
  };
  let params: RequestParams = {
    method: Method.get,
    userDefinedHeader,
    url
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      result = response.data;
    }
  } catch (error) {
    alertError(error, url);
  }

  return result;
}

/**
 * 修改服务器组权重
 * @param clusterName
 * @param namespace
 * @param backendsGroupName
 * @param payload, { weight: 20 }
 */
export async function changeWeightForBackendsGroup(clusterName, namespace, backendsGroupName, payload) {
  let result;
  let url = `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=updateGroupWeight&apiPort=80&groupNS=${namespace}&groupName=${backendsGroupName}`;
  let params: RequestParams = {
    method: Method.post,
    url,
    data: { ...payload }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    result = response;
  } catch (error) {
    alertError(error, url);
  }

  return result;
}
