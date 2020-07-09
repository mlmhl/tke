import { collectionPaging, Identifiable, OperationResult, QueryState, RecordSet, uuid } from '@tencent/ff-redux';

import { resourceConfig } from '../../../../config/resourceConfig';
import {
  reduceK8sRestfulPath, reduceNetworkRequest, reduceNetworkWorkflow
} from '../../../../helpers';
import { Method } from '../../../../helpers/reduceNetwork';
import { Region, RegionFilter, RequestParams, Resource, ResourceInfo, Validation } from '../../common/models';
import { resourceTypeToUnit, ProjectResourceLimit }  from '../../common/components';
const _cloneDeep = require('lodash/cloneDeep');
const _isEmpty = require('lodash/isEmpty');

interface EditNamespaceParams {
  projectId: string; // 业务ID
  namespaceName: string; // 命名空间名称
  clusterName: string; // 集群名称
  resourceLimits?: ProjectResourceLimit[]; // 资源限制
  cmdb: boolean; // CMDB模块开关状态
  department?: string; // 部门
  departmentId?: string; // 部门ID
  bsiPath?: string; // 业务
  bsiPathIds?: string; // 业务IDS
  operator?: string; // 负责人
  bakOperator?: string[]; // 备份负责人
  all?: boolean; // 自动同步所有pod
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
    if (resourceTypeToUnit[item.type] === '个' || resourceTypeToUnit[item.type] === '核') {
      value = +item.value;
    } else {
      value = item.value + 'Mi';
    }
    hardInfo[item.type] = value;
  });
  return hardInfo;
}

/**
 * 创建&编辑Namespace
 * @param namespaces： 创建 || 编辑 页填写的namespace信息
 * @param selectedNamespace：选中要编辑的namespace
 */
export async function editNamespace({ namespaces, selectedNamespace }: { namespaces: EditNamespaceParams; selectedNamespace?: any }) {
  try {
    let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
    let url = reduceK8sRestfulPath({
      resourceInfo: NamespaceResourceInfo,
      specificName: namespaces.projectId,
      extraResource: 'namespaces'
    });

    const {
      clusterName,
      namespaceName,
      projectId,
      resourceLimits,
      cmdb,
      department,
      departmentId,
      bsiPath,
      bsiPathIds,
      operator,
      bakOperator,
      all
    } = namespaces;

    /** 构建参数 */
    let requestParams = {
          kind: NamespaceResourceInfo.headTitle,
          apiVersion: `${NamespaceResourceInfo.group}/${NamespaceResourceInfo.version}`,
          spec: {
            clusterName,
            namespace: namespaceName,
            projectName: projectId,
            hard: _reduceProjectLimit(resourceLimits),
          }
        };
    let method = 'POST';
    const metadata = {};
    const annotations = {};
    if (cmdb) {
      metadata['labels'] = { cmdb: 'true' };
      if (all) {
        metadata['labels']['cmdb.all'] = 'true';
      }
      if (department) {
        annotations['cmdb.io/depName'] = department;
      }
      if (departmentId) {
        annotations['cmdb.io/depId'] = departmentId ? String(departmentId) : undefined;
      }
      if (bsiPath) {
        annotations['cmdb.io/bsiPath'] = bsiPath;
      }
      if (bsiPathIds) {
        annotations['cmdb.io/bsiPathIds'] = bsiPathIds;
      }
      if (operator) {
        annotations['cmdb.io/operator'] = operator;
      }
      if (bakOperator) {
        annotations['cmdb.io/bakOperator'] = bakOperator.join(',');
      }
      if (JSON.stringify(annotations) !== '{}') {
        metadata['annotations'] = annotations;
      }
    }
    if (JSON.stringify(metadata) !== '{}') {
      requestParams['metadata'] = metadata;
    }
    if (!_isEmpty(selectedNamespace)) {
      //修改
      method = 'PUT';
      url += '/' + selectedNamespace.metadata.name;
      const newSelectedNamespace = _cloneDeep(selectedNamespace);
      newSelectedNamespace.kind = NamespaceResourceInfo.headTitle;
      newSelectedNamespace.apiVersion = `${NamespaceResourceInfo.group}/${NamespaceResourceInfo.version}`;
      newSelectedNamespace.spec.hard = _reduceProjectLimit(resourceLimits);
      newSelectedNamespace.spec.projectName = projectId;
      if (!cmdb) {
        if (newSelectedNamespace.metadata.labels) {
          delete newSelectedNamespace.metadata.labels.cmdb;
          delete newSelectedNamespace.metadata.labels['cmdb.all'];
        }
        delete newSelectedNamespace.metadata.annotations;
      } else {
        if (newSelectedNamespace.metadata.labels) {
          newSelectedNamespace.metadata.labels.cmdb = 'true';
          if (all) {
            newSelectedNamespace.metadata.labels['cmdb.all'] = 'true';
          } else {
            delete newSelectedNamespace.metadata.labels['cmdb.all'];
          }
        } else {
          newSelectedNamespace.metadata.labels = {
            cmdb: 'true'
          };
          if (all) {
            newSelectedNamespace.metadata.labels['cmdb.all'] = 'true';
          }
        }
        newSelectedNamespace.metadata.annotations = annotations;
      }
      requestParams = newSelectedNamespace;
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
