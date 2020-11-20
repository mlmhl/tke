import { Modal } from '@tea/component';
import { Method, reduceNetworkRequest } from '@helper/index';
import { RequestParams, Resource } from '../../common/models';
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
/****************Cluster 相关类型定义 begin************************/
interface ClusterMetadata {
  /** 集群id */
  name?: string;

  /** 创建时间 */
  creationTimestamp?: string;

  /** 其余属性 */
  [props: string]: any;
}

interface ClusterSpec {
  /** 集群名称 */
  displayName?: string;

  /** 集群的features */
  features?: {
    ipvs: boolean;
    public: boolean;
  };

  /** 集群类型 */
  type?: string;

  /** 集群的版本 */
  version?: string;

  /** 是否安装了prometheus */
  hasPrometheus?: boolean;

  properties?: any;

  [props: string]: any;
}

interface ClusterStatus {
  /** 集群的地址相关信息 */
  addresses?: ClusterAddress[];

  /** 集群当前的状态 */
  conditions?: ClusterCondition[];

  /** 集群的相关凭证 */
  credential?: {
    caCert: string;
    token: string;
  };

  /** 当前的状态 */
  phase?: string;

  /** 资源的相关配置 request limit */
  resource?: {
    /** 可分配 */
    allocatable: StatusResource;

    /** 已分配 */
    allocated: StatusResource;

    /** 集群的配置 */
    capacity: StatusResource;
  };

  /** 集群的版本 */
  version?: string;
}

interface StatusResource {
  /** cpu的相关配置 */
  cpu: string;

  /** memory的相关配置 */
  memory: string;
}

interface ClusterAddress {
  /** 集群的域名 */
  host: string;

  /** 端口名 */
  port: number;

  /** 集群的类型 */
  type: string;
}

export interface ClusterCondition {
  /** 上次健康检查时间 */
  lastProbeTime?: string;
  /**节点可能是心跳时间 */
  lastHeartbeatTime?: string;

  /** 上次变更时间 */
  lastTransitionTime?: string;

  /** 原因 */
  reason?: string;

  /** 错误信息 */
  message?: string;

  /** 状态是否正常 */
  status?: string;

  /** 条件类型 */
  type?: string;
}


interface Cluster {
  /** metadata */
  metadata: ClusterMetadata;

  /** spec */
  spec: ClusterSpec;

  /** status */
  status: ClusterStatus;
}

interface ClustersResult {
  records: Cluster[];
  recordCount: number;
}

/****************Cluster 相关类型定义 end************************/


/****************Project 相关类型定义 begin************************/
interface Project {
  /** metadata */
  metadata: ProjectMetadata;

  /** spec */
  spec: ProjectSpec;

  /** status */
  status: ProjectStatus;
}

interface ProjectMetadata {
  /** projectId */
  name?: string;

  /** 创建时间 */
  creationTimestamp?: string;

  /** 其余属性 */
  [props: string]: any;
}

interface ProjectSpec {
  /** project名称 */
  displayName: string;

  /** Project成员 */
  members: string[];

  /** project分配的quota */
  clusters: {
    [props: string]: {
      hard?: StatusResource;
    };
  };

  parentProjectName?: string;
}

interface ProjectStatus {
  /** 可分配 */
  used?: StatusResource;
  /** 未分配 */
  calculatedChildProjects?: string;

  calculatedNamespaces?: string[];

  /** 状态 */
  phase?: string;
}

interface StatusResource {
  [props: string]: string;
}
/****************Project 相关类型定义 end************************/

/**************** 接口定义 ************************/
/**
 * 获取全部集群列表
 */
async function fetchAllClusters() {
  let clusterList = [];
  let url = '/apis/platform.tkestack.io/v1/clusters';
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params);

    let result = {
      records: [],
      recordCount: 0
    };
    if (response.code === 0) {
      const clusterList = response.data.items;
      result = {
        records: clusterList,
        recordCount: clusterList.length
      };
    }
    return result;
  } catch (error) {
    alertError(error, url);
    throw error;
  }
}

/**
 * 获取业务下的命名空间列表
 * @param projectId
 */
async function fetchNamespacesByProject({ projectId }: { projectId: string }) {
  let url = `/apis/business.tkestack.io/v1/namespaces/${projectId}/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params);

    let namespaceList = [];
    if (response.code === 0) {
      let list = response.data;
      namespaceList = list.items;
    }
    return namespaceList;
  } catch (error) {
    alertError(error, url);
    throw error;
  }
}

/**
 * 获取集群下的命名空间列表
 * @param clusterId
 */
async function fetchNamespacesByCluster({ clusterId }: { clusterId: string }) {
  let url = `/api/v1/namespaces`;
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  try {
    let response = await reduceNetworkRequest(params, clusterId);

    let namespaceList = [];
    if (response.code === 0) {
      namespaceList = get(response, 'data.items', []);
    }
    return namespaceList;
  } catch (error) {
    alertError(error, url);
    throw error;
  }
}

/**
 * 获取workloads
 * 带是否可用于创建服务器组的标志
 * @param clusterName
 * @param namespace
 * @param workloadType
 */
async function fetchWorkloadsByNamespace(clusterName, namespace, workloadType) {
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
 * 按规则名获取实例信息
 * @param clusterId
 * @param namespaceId
 * @param ruleName
 */
async function fetchInstanceByRuleName({ clusterId, namespaceId, ruleName }) {
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
async function fetchInstanceEvent({ clusterId, namespaceId, instanceId }) {
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

export {
  Cluster,
  ClustersResult,
  Project,
  fetchAllClusters,
  fetchNamespacesByProject,
  fetchNamespacesByCluster,
  fetchWorkloadsByNamespace,
  fetchInstanceByRuleName,
  fetchInstanceEvent
};
