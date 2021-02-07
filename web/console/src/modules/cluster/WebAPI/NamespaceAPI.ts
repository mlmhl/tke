import { collectionPaging, Identifiable, OperationResult, QueryState, RecordSet, uuid } from '@tencent/ff-redux';

import { resourceConfig } from '../../../../config/resourceConfig';
import {
  reduceK8sRestfulPath, reduceNetworkRequest, reduceNetworkWorkflow
} from '../../../../helpers';
import { Method } from '../../../../helpers/reduceNetwork';
import { Region, RegionFilter, RequestParams, Resource, ResourceInfo, Validation } from '../../common/models';
import { resourceTypeToUnit, ProjectResourceLimit }  from '../../common/components';
import { NamespaceFilter } from '../models';
const _cloneDeep = require('lodash/cloneDeep');
const _isEmpty = require('lodash/isEmpty');

interface EditNamespaceParams {
  // projectId?: string; // 业务ID
  // namespaceName?: string; // 命名空间名称
  // clusterName?: string; // 集群名称
  // resourceLimits?: ProjectResourceLimit[]; // 资源限制
  // cmdb?: boolean; // CMDB模块开关状态
  // department?: string; // 部门
  // departmentId?: string; // 部门ID
  // bsiPath?: string; // 业务
  // bsiPathIds?: string; // 业务IDS
  // operator?: string; // 负责人
  // bakOperator?: string[]; // 备份负责人
  // all?: boolean; // 自动同步所有pod

  spec?: any;
  metadata?: any;
  // [props: string]: any;
}


// 返回标准操作结果
function operationResult<T>(target: T[] | T, error?: any): OperationResult<T>[] {
  if (target instanceof Array) {
    return target.map(x => ({ success: !error, target: x, error }));
  }
  return [{ success: !error, target: target as T, error }];
}

function _reduceProjectLimit(projectResourceLimit: ProjectResourceLimit[] = []) {
  let hardInfo = {};
  projectResourceLimit.forEach(item => {
    let value;
    if (resourceTypeToUnit[item.type] === '个' || resourceTypeToUnit[item.type] === '核' || resourceTypeToUnit[item.type] === '毫核') {
      value = +item.value;
    } else {
      value = item.value + 'Mi';
    }
    hardInfo[item.type] = value;
  });
  return hardInfo;
}

export async function editNamespace({ newNamespace, projectId }: { newNamespace: any; projectId: string}) {
  const isEditNamespace = true;
  const result = await changeNamespace({ newNamespace, projectId, isEditNamespace });
  return result;
}

export async function createNamespace({ namespaceInfo, projectId }: { namespaceInfo: EditNamespaceParams; projectId: string}) {
  const result = await changeNamespace({ namespaceInfo, projectId });
  return result;
}

/**
 * 创建&编辑Namespace
 * @param namespaces： 创建 || 编辑 页填写的namespace信息
 * @param selectedNamespace：选中要编辑的namespace
 */
async function changeNamespace({ namespaceInfo, newNamespace, projectId, isEditNamespace }: { namespaceInfo?: EditNamespaceParams; newNamespace?: any; isEditNamespace?: boolean; projectId: string }) {
  try {
    let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
    let url = reduceK8sRestfulPath({
      resourceInfo: NamespaceResourceInfo,
      specificName: projectId,
      extraResource: 'namespaces'
    });
    const { headTitle, group, version } = NamespaceResourceInfo;

    /** 构建参数 */
    let requestParams = {
          kind: headTitle,
          apiVersion: `${group}/${version}`,
        };
    let method = 'POST';

    if (isEditNamespace) {
      // 编辑命名空间
      method = 'PUT';
      url += '/' + newNamespace.metadata.name;
      newNamespace.kind = headTitle;
      newNamespace.apiVersion = `${group}/${version}`;
      requestParams = newNamespace;
    } else {
      // 创建命名空间
      const {
        spec = {},
        metadata = {},
      } = namespaceInfo || {};
      requestParams['spec'] = spec;
      if (JSON.stringify(metadata) !== '{}') {
        requestParams['metadata'] = metadata;
      }
    }

    let params: RequestParams = {
      method,
      url,
      data: requestParams
    };
    const result = await reduceNetworkRequest(params);
    if (result.code === 0) {
      return result.data;
    } else {
      return { error: true, msg: result.data.message };
    }
  } catch (error) {
    if (+error.response.status !== 404) {
      throw error;
    }
  }
}

/**
 * Namespace查询
 * @param query Namespace查询的一些过滤条件
 */
export async function fetchNamespaceByMetaName({ projectId, namespaceName }: { projectId?: string; namespaceName?: string}) {
  let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
  let url = reduceK8sRestfulPath({
    resourceInfo: NamespaceResourceInfo,
    specificName: projectId,
    extraResource: `namespaces/${namespaceName}`
  });
  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url
  };
  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      return response.data;
    } else {
      return { error: true, msg: response.data.message };
    }
  } catch (error) {
    if (+error.response.status !== 404) {
      throw error;
    }
  }
}

/** 访问凭证数据接口 */
export async function fetchNamespaceKubectlConfig(query: QueryState<NamespaceFilter>) {
  let {
    filter: { projectId, np }
  } = query;
  let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
  let url = reduceK8sRestfulPath({
    resourceInfo: NamespaceResourceInfo,
    specificName: projectId,
    extraResource: `namespaces/${np}/certificate`
  });

  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url
  };
  let result = {
    certPem: '',
    keyPem: '',
    caCertPem: '',
    apiServer: '',
    apiServerIP: '',
    apiServerHost: ''
  };
  try {
    let response = await reduceNetworkRequest(params);
    if (response.code === 0 && response.data.status.certificate) {
      result = {
        certPem: response.data.status.certificate.certPem,
        keyPem: response.data.status.certificate.keyPem,
        caCertPem: response.data.status.certificate.caCertPem,
        apiServer: response.data.status.certificate.apiServer,
        apiServerIP: response.data.status.certificate.apiServerIP,
        apiServerHost: response.data.status.certificate.apiServerHost
      };
    }
  } catch (error) {}

  return result;
}
