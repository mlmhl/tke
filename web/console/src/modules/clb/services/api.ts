import { QueryState, RecordSet, uuid } from '@tencent/ff-redux';
import { tip } from '@tencent/tea-app/lib/bridge';
import { t } from '@tencent/tea-app/lib/i18n';

import { resourceConfig } from '@config/index';
import {
  Method,
  operationResult,
  reduceK8sQueryString,
  reduceK8sRestfulPath,
  reduceNetworkRequest,
  reduceNetworkWorkflow,
  requestMethodForAction,
} from '@helper/index';
import { Namespace, NamespaceFilter, RequestParams, ResourceInfo } from '../../common/models';

const { get, isEmpty } = require('lodash');

/**
 * 获取全部集群列表
 */
export async function getAllClusters() {
  let clusters = [];
  let params: RequestParams = {
    method: Method.get,
    url: '/apis/platform.tkestack.io/v1/clusters',
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
            phase: item.status.phase,
          };
        });
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return clusters;
}

/**
 * 获取业务下的命名空间列表
 * @param projectId
 */
export async function getNamespacesByProject(projectId) {
  let namespaceList = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/business.tkestack.io/v1/namespaces/${projectId}/namespaces`,
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
          projectId: item.metadata.namespace,
        };
      });
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return namespaceList;
}

/**
 * 获取集群下的命名空间列表
 * @param clusterName
 */
export async function getNamespacesByCluster(clusterName) {
  let namespaceList = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/api/v1/namespaces`,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let namespaces = get(response, 'data.items', []);
      namespaceList = namespaces.map(item => {
        return {
          name: item.metadata.name,
          uid: item.metadata.uid,
          phase: item.status.phase,
          clusterName,
        };
      });
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return namespaceList;
}

/**
 * 获取指定集群下的已导入CLB实例列表
 * @param clusterName
 */
export async function getImportedInstancesByCluster(clusterName) {
  let instances = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listImportedCLB`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      // NOTE: 这里转一次结果是整个应用程序可能会用到的有用信息，在呈现列表页的时候再转换一次是供UI组件展示用的
      if (list && list.items) {
        instances = [...list.items];
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return instances;
}

/**
 * 获取指定集群下的CLB规则列表（实例使用情况）
 * @param clusterName
 */
export async function getRulesByCluster(clusterName) {
  let result = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listRules`,
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
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return result;
}

/**
 * 禁用CLB实例
 * @param clusterName
 * @param clbId
 */
export async function disableInstance(clusterName, clbId) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=disableCLB&lbID=${clbId}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@disableInstance = ', response);
    result = response;
  } catch (error) {
    // TODO: 缺一个全局tips的处理
    console.log('error@disableInstance = ', error);
  }

  return result;
}

/**
 * 启用CLB实例
 * @param clusterName
 * @param clbId
 */
export async function enableInstance(clusterName, clbId) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=enableCLB&lbID=${clbId}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@enableInstance = ', response);
    result = response;
  } catch (error) {
    console.log('error@enableInstance = ', error);
  }

  return result;
}

/**
 * 删除CLB实例
 * @param clusterName
 * @param clbId
 */
export async function removeInstance(clusterName, clbId) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=deleteCLB&lbID=${clbId}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@removeInstance = ', response);
    result = response;
  } catch (error) {
    console.log('error@removeInstance = ', error);
  }

  return result;
}

/**
 * 获取指定集群下可选的的CLB实例列表
 * @param clusterName
 */
export async function getAvailableInstancesByCluster(clusterName) {
  let result = [];
  // NOTE: 比较含糊这种硬编码的apiPort=80在不同的环境下会不会变化
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=listCLB&apiPort=80`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = get(response.data, 'Response.LoadBalancerSet', []);
      result = [...list];
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return result;
}

/**
 * 导入CLB实例
 * @param clusterName 集群名称
 * @param clbId CLB实例ID
 * @param scope CLB实例允许使用的命名空间，"*"为任意空间
 */
export async function importInstance(clusterName, payload) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=importCLB`,
    data: { ...payload },
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@importInstance = ', response);
    result = response;
  } catch (error) {
    console.log('error@importInstance = ', error);
  }

  return result;
}

/**
 * 获取CLB实例详情
 * @param clusterName
 * @param clbId
 */
export async function getInstanceInfo(clusterName, clbId) {
  let result = {};
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=getImportedCLB&lbID=${clbId}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
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
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=updateCLBScope&lbID=${clbId}`,
    data: {
      scope,
    },
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@modifyInstanceNamespace = ', response);
    result = response;
  } catch (error) {
    console.log('error@modifyInstanceNamespace = ', error);
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
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listRules&ns=${namespace}`,
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
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return backendsList;
}

/**
 * 删除规则
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function removeRule(clusterName, namespace, ruleName) {
  let result = [];
  let params: RequestParams = {
    method: Method.delete,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbs?namespace=${namespace}&name=${ruleName}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@removeRule = ', response);
    result = response;
  } catch (error) {
    console.log('error@removeRule = ', error);
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
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=listImportedCLB&ns=${namespace}`,
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
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return result;
}

/**
 * 分配随机端口（新建监听器时）
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function generateNewPort(clusterName, lbId, protocol) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=applyListenerPort`,
    data: {
      lbId,
      protocol,
    }
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@generateNewPort = ', response);
    result = response;
  } catch (error) {
    console.log('error@generateNewPort = ', error);
  }

  return result;
}

/**
 * 新建规则
 * @param clusterName 集群名称
 * @param payload rule的实体
 */
export async function createRule(clusterName, payload) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=createRule`,
    data: { ...payload },
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@createRule = ', response);
    result = response;
  } catch (error) {
    console.log('error@createRule = ', error);
  }

  return result;
}

/**
 * 获取可选的监听器
 * @param clusterName
 * @param clbId
 */
export async function getAvailableListeners(clusterName, clbId) {
  let result = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&api=listListener&apiPort=80&lbID=${clbId}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.Listeners) {
        result = [...list.Listeners];
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
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
  let result = {};
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=getRule&ruleNS=${namespace}&ruleName=${ruleName}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
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
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=updateRuleScope`,
    data: {
      ruleNamespace: namespace,
      ruleName,
      scope,
    },
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@modifyRuleNamespace = ', response);
    result = response;
  } catch (error) {
    console.log('error@modifyRuleNamespace = ', error);
  }

  return result;
}

/**
 * 获取指定集群和命名空间下的服务器组列表
 * @param clusterId 集群Id
 * @param namespace 命名空间名称
 */
export async function getBackendsList(clusterId, namespace) {
  let backendsList = [];
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterId}/lbcfbackendgroups?namespace=${namespace}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterId);
    if (response.code === 0) {
      let list = response.data;
      if (list && list.items) {
        backendsList = list.items.map(item => {
          return {
            id: uuid(),
            namespace: item.metadata.name,
          };
        });
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return backendsList;
}

/**
 * 删除服务器组
 * @param clusterName 集群名称
 * @param namespace 规则所在命名空间
 * @param ruleName 规则名称
 */
export async function removeBackendGroup(clusterName, namespace, backendGroupName) {
  let result = [];
  let params: RequestParams = {
    method: Method.delete,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}&name=${backendGroupName}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@removeBackendGroup = ', response);
    result = response;
  } catch (error) {
    console.log('error@removeBackendGroup = ', error);
  }

  return result;
}

/**
 * 新建服务器组
 * @param clusterName 集群名称
 * @param namespace 命名空间
 * @param backendGroupName 服务器组名称
 */
export async function createBackendGroup(clusterName, namespace, backendGroupName, payload) {
  let result = [];
  let params: RequestParams = {
    method: Method.post,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcflbdrivers?namespace=kube-system&name=lbcf-tkestack-clb-driver&action=driverProxy&apiPort=80&api=createRule`,
    data: { ...payload },
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    console.log('response@createBackendGroup = ', response);
    result = response;
  } catch (error) {
    console.log('error@createBackendGroup = ', error);
  }

  return result;
}

/**
 * 获取服务器组详情
 * @param clusterName
 * @param namespace
 * @param backendGroupName
 */
export async function getBackendGroupInfo(clusterName, namespace, backendGroupName) {
  let result = {};
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendgroups?namespace=${namespace}&name=${backendGroupName}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return result;
}

/**
 * 获取服务器信息
 * @param clusterName
 * @param namespace
 * @param backendGroupName
 */
export async function getBackendInfo(clusterName, namespace, backendGroupName, ruleName) {
  let result = {};
  let params: RequestParams = {
    method: Method.get,
    url: `/apis/platform.tkestack.io/v1/clusters/${clusterName}/lbcfbackendrecords?namespace=${namespace}&bg=${backendGroupName}&lb=${ruleName}`,
  };
  try {
    let response = await reduceNetworkRequest(params, clusterName);
    if (response.code === 0) {
      let info = response.data;
      result = info;
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (error.code !== 'ResourceNotFound') {
      throw error;
    }
  }

  return result;
}

// /**
//  * 创建、更新日志采集规则
//  */
// export async function modifyLogStash(resources, regionId: number) {
//   try {
//     let { clusterId, namespace, mode, jsonData, resourceInfo, isStrategic = true, resourceIns } = resources[0];
//     let url = reduceK8sRestfulPath({ resourceInfo, namespace, specificName: resourceIns, clusterId });
//     // 构建参数
//     let method = requestMethodForAction(mode);
//     let params: RequestParams = {
//       method: method,
//       url,
//       data: jsonData,
//       apiParams: {
//         module: 'tke',
//         interfaceName: 'ForwardRequest',
//         regionId: regionId || 1,
//         restParams: {
//           Method: method,
//           Path: url,
//           Version: '2018-05-25',
//           RequestBody: jsonData,
//         },
//       },
//     };
//     if (mode === 'update') {
//       params.userDefinedHeader = {
//         'Content-Type': isStrategic ? 'application/strategic-merge-patch+json' : 'application/merge-patch+json',
//       };
//     }
//
//     let response = await reduceNetworkRequest(params, clusterId);
//     let operateTip = mode === 'create' ? '创建成功' : '更新成功';
//     if (response.code === 0) {
//       tip.success(t(operateTip), 2000);
//       return operationResult(resources);
//     } else {
//       return operationResult(resources, reduceNetworkWorkflow(response));
//     }
//   } catch (error) {
//     return operationResult(resources, reduceNetworkWorkflow(error));
//   }
// }
