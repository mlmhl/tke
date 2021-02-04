import { collectionPaging, OperationResult, QueryState, RecordSet, uuid } from '@tencent/ff-redux';

import { resourceConfig } from '../../../config/resourceConfig';
import { reduceK8sRestfulPath, reduceNetworkRequest, reduceNetworkWorkflow } from '../../../helpers';
import { Method } from '../../../helpers/reduceNetwork';
import { reduceK8sQueryString } from '../../../helpers/urlUtil';
import { Region, RegionFilter, RequestParams, ResourceInfo } from '../common/models';
import { resourceTypeToUnit } from './constants/Config';
import {
  Cluster,
  ClusterFilter,
  Manager,
  ManagerFilter,
  Namespace,
  NamespaceEdition,
  NamespaceFilter,
  NamespaceOperator,
  Project,
  ProjectEdition,
  ProjectFilter,
} from './models';
import {
  ProjectResourceLimit,
  UserManagedProject,
  UserManagedProjectFilter,
  CMDBDepartmentType,
  DepartmentType,
  CMDBBusinessType,
} from './models/Project';
declare const WEBPACK_CONFIG_SHARED_CLUSTER: boolean;

// const cmdbURL = 'http://c.oa.com/api/?api_key=tencent_suanli_gaia';
const cmdbURL = '/web-api/cmdb';

// 返回标准操作结果
function operationResult<T>(target: T[] | T, error?: any): OperationResult<T>[] {
  if (target instanceof Array) {
    return target.map(x => ({ success: !error, target: x, error }));
  }
  return [{ success: !error, target: target as T, error }];
}

/**
 * 业务查询
 * @param query 地域查询的一些过滤条件
 */
export async function fetchProjectList(query: QueryState<ProjectFilter>) {
  let {
    search,
    filter: { parentProject },
    searchFilter: { projectId },
  } = query;
  let projectList = [],
    total = 0;
  let projectResourceInfo: ResourceInfo = resourceConfig().projects;

  let userResourceInfo: ResourceInfo = resourceConfig().portal;
  let portalUrl = reduceK8sRestfulPath({ resourceInfo: userResourceInfo });
  let portalparams: RequestParams = {
    method: Method.get,
    url: portalUrl,
  };
  let response = await reduceNetworkRequest(portalparams);
  let isAdmin = true,
    userProjects = [];
  if (response.code === 0) {
    userProjects = Object.keys(response.data.projects).map(key => key);
    isAdmin = response.data.administrator;
  }

  if (isAdmin || parentProject) {
    let k8sQueryObj = {
      fieldSelector: {
        'spec.parentProjectName': parentProject ? parentProject : undefined,
      },
    };
    k8sQueryObj = JSON.parse(JSON.stringify(k8sQueryObj));

    let k8sUrl = reduceK8sRestfulPath({
      resourceInfo: projectResourceInfo,
      specificName: projectId ? projectId : null,
    });

    let queryString = reduceK8sQueryString({ k8sQueryObj, restfulPath: k8sUrl });

    let url = k8sUrl + queryString;

    let params: RequestParams = {
      method: Method.get,
      url,
    };

    try {
      let response = await reduceNetworkRequest(params);

      if (response.code === 0) {
        let listItems = response.data;
        if (listItems.items) {
          projectList = listItems.items.map(item => {
            return Object.assign({}, item, { id: item.metadata.name });
          });
        } else {
          // 这里是拉取某个具体的resource的时候，没有items属性
          projectList.push({
            id: listItems.metadata.name,
            metadata: listItems.metadata,
            spec: listItems.spec,
            status: listItems.status,
          });
        }
      }
    } catch (error) {
      // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
      if (+error.response.status !== 404) {
        throw error;
      }
    }
  } else {
    let requests = userProjects.map(projectId => {
      let url = reduceK8sRestfulPath({
        resourceInfo: projectResourceInfo,
        specificName: projectId,
      });

      let params: RequestParams = {
        method: Method.get,
        url,
        userDefinedHeader: {
          'X-TKE-ProjectName': projectId,
        },
      };
      return reduceNetworkRequest(params).catch(e => null);
    });
    let response = await Promise.all(requests);
    response.forEach(r => {
      if (r && r.code === 0) {
        let listItems = r.data;
        if (listItems.items) {
          projectList = listItems.items.map(item => {
            return Object.assign({}, item, { id: item.metadata.name });
          });
        } else {
          // 这里是拉取某个具体的resource的时候，没有items属性
          projectList.push({
            id: listItems.metadata.name,
            metadata: listItems.metadata,
            spec: listItems.spec,
            status: listItems.status,
          });
        }
      }
    });
    total = projectList.length;
  }

  if (search) {
    projectList = projectList.filter(x => x.spec.displayName.includes(query.search));
  }
  total = projectList.length;
  const result: RecordSet<Project> = {
    recordCount: total,
    records: projectList,
  };
  return result;
}

/**
 * 业务查询
 * @param query 地域查询的一些过滤条件
 */
export async function fetchProjectDetail(projectId?: string) {
  let projectResourceInfo: ResourceInfo = resourceConfig()['projects'];
  let url = reduceK8sRestfulPath({ resourceInfo: projectResourceInfo, specificName: projectId });
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  let response = await reduceNetworkRequest(params);
  if (response.code === 0) {
    return Object.assign({}, response.data, { id: response.data.metadata.name });
  }
}

function _reduceProjectLimit(projectResourceLimit: ProjectResourceLimit[]) {
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
 * 业务编辑
 */
export async function editProject(projects: ProjectEdition[]) {
  try {
    let projectResourceInfo: ResourceInfo = resourceConfig()['projects'];
    let url = reduceK8sRestfulPath({ resourceInfo: projectResourceInfo });
    const currentProject = projects[0];

    /** 构建参数 */

    let clusterObject = {};
    currentProject.clusters.forEach(cluster => {
      let resourceLimitObject = {};
      cluster.resourceLimits.forEach(resourceLimit => {
        resourceLimitObject[resourceLimit.type] = resourceLimit.value;
        if (resourceTypeToUnit[resourceLimit.type] === 'MiB') {
          resourceLimitObject[resourceLimit.type] += 'Mi';
        }
      });
      clusterObject[cluster.name] = { hard: resourceLimitObject };
    });

    let clusterZones = [];
    currentProject.clusters.forEach(cluster => {
      let resourceLimitObject = {};
      cluster.resourceLimits.forEach(resourceLimit => {
        resourceLimitObject[resourceLimit.type] = resourceLimit.value;
        if (resourceTypeToUnit[resourceLimit.type] === 'MiB') {
          resourceLimitObject[resourceLimit.type] += 'Mi';
        }
      });
      clusterZones.push({ clusterName: cluster.name, zone: cluster.zone, hard: resourceLimitObject });
    });

    let requestParams = {
        kind: projectResourceInfo.headTitle,
        apiVersion: `${projectResourceInfo.group}/${projectResourceInfo.version}`,
        spec: {
          displayName: currentProject.displayName,
          members: currentProject.members.map(m => m.name),
          parentProjectName: currentProject.parentProject ? currentProject.parentProject : undefined,
        },
      },
      method = 'POST';

    if (currentProject.id) {
      //修改
      method = 'PUT';
      url += '/' + currentProject.id;
      requestParams = JSON.parse(
        JSON.stringify({
          kind: projectResourceInfo.headTitle,
          apiVersion: `${projectResourceInfo.group}/${projectResourceInfo.version}`,
          metadata: {
            name: currentProject.id,
            resourceVersion: currentProject.resourceVersion,
          },
          spec: {
            displayName: currentProject.displayName ? currentProject.displayName : null,
            members: currentProject.members.length ? currentProject.members.map(m => m.name) : null,
            parentProjectName: currentProject.parentProject ? currentProject.parentProject : null,
          },
          status: currentProject.status,
        })
      );
    }

    // 附加annotations, labels, spec.zones 或者 spec.clusters
    if (currentProject.isSharingCluster) {
      const { cmdbInfo } = currentProject;
      // labels 不支持中文，各种名称放到注解中
      const userName = sessionStorage.getItem('userName');
      requestParams = Object.assign(
        requestParams,
        { spec: { ...requestParams.spec, zones: clusterZones }},
        {
          metadata: {
            ...requestParams['metadata'] || {},
            annotations: {
              'teg.tkex.oa.com/department': cmdbInfo.departmentName,
              'teg.tkex.oa.com/business1': cmdbInfo.businessLevelOneName,
              'teg.tkex.oa.com/business2': cmdbInfo.businessLevelTwoName,
            },
            labels: {
              'teg.tkex.oa.com/creator': userName,
              'teg.tkex.oa.com/department-id': String(cmdbInfo.departmentId),
              'teg.tkex.oa.com/business1-id': String(cmdbInfo.businessLevelOneId),
              'teg.tkex.oa.com/business2-id': String(cmdbInfo.businessLevelTwoId),
            },
          },
        }
      );
    } else {
      requestParams = Object.assign(requestParams, { spec: { ...requestParams.spec, clusters: clusterObject }});
    }

    let params: RequestParams = {
      method,
      url,
      data: requestParams,
    };
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      return operationResult(projects);
    } else {
      return operationResult(projects, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(projects, reduceNetworkWorkflow(error));
  }
}

/**
 * 业务删除
 */
export async function deleteProject(projects: Project[]) {
  try {
    let projectResourceInfo: ResourceInfo = resourceConfig()['projects'];
    let url = reduceK8sRestfulPath({ resourceInfo: projectResourceInfo, specificName: projects[0].id + '' });
    let params: RequestParams = {
      method: Method.delete,
      url,
      userDefinedHeader: {
        'X-TKE-ProjectName': projects[0].id + '',
      },
    };

    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      return operationResult(projects);
    } else {
      return operationResult(projects, response);
    }
  } catch (error) {
    return operationResult(projects, reduceNetworkWorkflow(error));
  }
}
/**
 * Namespace查询
 * @param query Namespace查询的一些过滤条件
 */
export async function fetchNamespaceList(query: QueryState<NamespaceFilter>) {
  let { filter, search } = query;
  let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
  let url = reduceK8sRestfulPath({
    resourceInfo: NamespaceResourceInfo,
    specificName: filter.projectId,
    extraResource: 'namespaces',
  });
  let namespaceList = [];
  if (search) {
    url = url + '/' + search;
  }

  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };
  try {
    let response = await reduceNetworkRequest(params);

    if (response.code === 0) {
      let listItems = response.data;
      if (listItems.items) {
        namespaceList = listItems.items.map(item => {
          return Object.assign({}, item, { id: item.metadata.name });
        });
      } else {
        // 这里是拉取某个具体的resource的时候，没有items属性
        namespaceList.push({
          id: listItems.metadata.name,
          metadata: listItems.metadata,
          spec: listItems.spec,
          status: listItems.status,
        });
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (+error.response.status !== 404) {
      throw error;
    }
  }

  const result: RecordSet<Namespace> = {
    recordCount: namespaceList.length,
    records: namespaceList,
  };

  return result;
}

/**
 * 地域的查询
 * @param query 地域查询的一些过滤条件
 */
export async function fetchRegionList(query?: QueryState<RegionFilter>) {
  let regionList = [];

  regionList = [
    {
      Alias: 'gz',
      CreatedAt: '2018-01-24T19:58:09+08:00',
      Id: 1,
      RegionId: 1,
      RegionName: 'ap-guangzhou',
      Status: 'alluser',
      UpdatedAt: '2018-01-24T19:58:09+08:00',
    },
  ];

  const result: RecordSet<Region> = {
    recordCount: regionList.length,
    records: regionList,
  };

  return result;
}

/**
 * 集群列表的查询
 * Note: 针对共享集群的变更，从metdata.labels这个对象中取出key形为zone.teg.tkex.oa.com/xxx的记录，其中xxx即为一个可用区的名称
 * 新建namespace还需要region信息，同样需要从集群里面获取，这里增加对region的记录
 * @param query 集群列表查询的一些过滤条件
 */
export async function fetchClusterList(query: QueryState<ClusterFilter>) {
  let clsuterResource: ResourceInfo = resourceConfig().cluster;
  let url = reduceK8sRestfulPath({ resourceInfo: clsuterResource });

  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let clusterList = [];
  if (response.code === 0) {
    let list = response.data;
    clusterList = list.items.map(item => {
      const cluster = { id: uuid(), clusterId: item.metadata.name, clusterName: item.spec.displayName };
      if (item.metadata.labels) {
        const zones = Object.keys(item.metadata.labels).reduce((accu, item, arr) => {
          if (new RegExp(/^zone.teg.tkex.oa.com\/*/).test(item)) {
            const zone = item.replace(/^zone.teg.tkex.oa.com\//, '');
            accu.push(zone);
          }
          return accu;
        }, []);
        Object.assign(cluster, { zones });
        // 获取region信息，teg.tkex.oa.com/region
        if (item.metadata.labels['teg.tkex.oa.com/region']) {
          Object.assign(cluster, { region: item.metadata.labels['teg.tkex.oa.com/region'] });
        }
      }
      return cluster;
    });
  }

  const result: RecordSet<Cluster> = {
    recordCount: clusterList.length,
    records: clusterList,
  };

  return result;
}

/**
 * 获取cmdb部门列表
 * 注意是get方法
 */
export async function fetchCMDBDepartmentList(): Promise<DepartmentType[]> {
  let url = cmdbURL + '/allDept';
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let departmentList = [];
  if (response.code === 0 && response.data.code === 100000) {
    departmentList = response.data.data.items.map((item: CMDBDepartmentType) => ({
      id: item.Id,
      name: item.Name,
    }));
  }

  return departmentList;
}

/**
 * 获取cmdb产品列表
 * 查询条件是部门的编号
 * @param departmentId
 */
export async function fetchCMDBProductList(departmentId: number) {
  let url = cmdbURL + '/product?fatherId=' + departmentId;
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let projectList = [];
  if (response.code === 0 && response.data.code === 100000) {
    projectList = response.data.data.items.map((item: CMDBBusinessType) => ({
      id: item.key,
      name: item.title,
    }));
  }
  return projectList;
}

/**
 * 获取一级业务列表
 * 查询条件是产品的编号
 * @param productId
 */
export async function fetchCMDBBusinessLevelOneList(productId: number) {
  let url = cmdbURL + '/business1?fatherId=' + productId;
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let businessLevelOneList = [];
  if (response.code === 0 && response.data.code === 100000) {
    businessLevelOneList = response.data.data.items.map((item: CMDBBusinessType) => ({
      id: item.key,
      name: item.title,
    }));
  }

  return businessLevelOneList;
}

/**
 * 获取二级业务列表
 * 查询条件是一级业务的编号
 * @param businessLevelOneId
 */
export async function fetchCMDBBusinessLevelTwoList(businessLevelOneId: number) {
  let url = cmdbURL + '/business2?fatherId=' + businessLevelOneId;
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let businessLevelTwoList = [];
  if (response.code === 0 && response.data.code === 100000) {
    businessLevelTwoList = response.data.data.items.map((item: CMDBBusinessType) => ({
      id: item.key,
      name: item.title,
    }));
  }

  return businessLevelTwoList;
}

/**
 * 获取业务模块列表（三级业务）
 * 查询条件是二级业务的编号
 * @param businessLevelTwoId
 */
export async function fetchCMDBBusinessLevelThreeList(businessLevelTwoId: number) {
  let url = cmdbURL + '/business3?fatherId=' + businessLevelTwoId;
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let businessLevelThreeList = [];
  if (response.code === 0 && response.data.code === 100000) {
    businessLevelThreeList = response.data.data.items.map((item: CMDBBusinessType) => ({
      id: item.key,
      name: item.title,
    }));
  }

  return businessLevelThreeList;
}

/**
 * Namespace编辑
 */
export async function editNamespace(namespaces: NamespaceEdition[], op: NamespaceOperator) {
  try {
    let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
    let url = reduceK8sRestfulPath({
      resourceInfo: NamespaceResourceInfo,
      specificName: op.projectId,
      extraResource: 'namespaces',
    });
    const currentNamespace = namespaces[0];
    const { clusterName, namespaceName, resourceLimits, cmdbInfo, region } = currentNamespace;
    /** 构建参数 */
    let requestParams = {
        kind: NamespaceResourceInfo.headTitle,
        apiVersion: `${NamespaceResourceInfo.group}/${NamespaceResourceInfo.version}`,
        spec: {
          clusterName: clusterName,
          namespace: namespaceName,
          projectName: op.projectId,
          hard: _reduceProjectLimit(resourceLimits),
        },
      },
      method = 'POST';

    if (currentNamespace.id) {
      //修改
      method = 'PUT';
      url += '/' + currentNamespace.id;
      requestParams['metadata'] = {
        name: currentNamespace.id,
        resourceVersion: currentNamespace.resourceVersion,
        projectName: op.projectId,
      };
      requestParams['status'] = currentNamespace.status;
    }
    // labels 不支持中文，各种名称放到注解中
    if (WEBPACK_CONFIG_SHARED_CLUSTER) {
      const userName = sessionStorage.getItem('userName');
      requestParams = Object.assign(
        requestParams,
        {
          metadata: {
            annotations: {
              'teg.tkex.oa.com/department': cmdbInfo.departmentName,
              'teg.tkex.oa.com/business1': cmdbInfo.businessLevelOneName,
              'teg.tkex.oa.com/business2': cmdbInfo.businessLevelTwoName,
              'teg.tkex.oa.com/default-module': cmdbInfo.businessLevelThreeName,
            },
            labels: {
              'teg.tkex.oa.com/region': region,
              'teg.tkex.oa.com/creator': userName,
              'teg.tkex.oa.com/department-id': String(cmdbInfo.departmentId),
              'teg.tkex.oa.com/business1-id': String(cmdbInfo.businessLevelOneId),
              'teg.tkex.oa.com/business2-id': String(cmdbInfo.businessLevelTwoId),
              'teg.tkex.oa.com/default-module-id': String(cmdbInfo.businessLevelThreeId),
              [`zone.teg.tkex.oa.com/${currentNamespace.zone}`]: '',
            },
          },
        }
      );
    }

    let params: RequestParams = {
      method,
      url,
      data: requestParams,
    };
    let response = await reduceNetworkRequest(params);

    if (response.code === 0) {
      return operationResult(namespaces);
    } else {
      return operationResult(namespaces, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(namespaces, reduceNetworkWorkflow(error));
  }
}

/**
 * Namespace删除
 */
export async function deleteNamespace(namespaces: Namespace[], op: NamespaceOperator) {
  try {
    let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
    let url = reduceK8sRestfulPath({
      resourceInfo: NamespaceResourceInfo,
      specificName: op.projectId,
      extraResource: `namespaces/${namespaces[0].metadata.name}`,
    });
    // 是用于后台去异步的删除resource当中的pod
    let extraParamsForDelete = {
      propagationPolicy: 'Background',
    };
    extraParamsForDelete['gracePeriodSeconds'] = 0;
    /** 构建参数 */
    let method = 'DELETE';
    let params: RequestParams = {
      method,
      url,
      data: extraParamsForDelete,
    };

    let response = await reduceNetworkRequest(params);

    if (response.code === 0) {
      return operationResult(namespaces);
    } else {
      return operationResult(namespaces, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(namespaces, reduceNetworkWorkflow(error));
  }
}

/**
 * user列表的查询
 * @param query 集群列表查询的一些过滤条件
 */
export async function fetchUser(query: QueryState<ManagerFilter>) {
  let userInfo: ResourceInfo = resourceConfig()['user'];
  let url = reduceK8sRestfulPath({ resourceInfo: userInfo });
  let { filter, search } = query;
  /** 构建参数 */
  if (search) {
    url += `?fieldSelector=keyword=${search}`;
  }
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let userList = [];
  if (response.code === 0) {
    let list = response.data;
    userList = list.items
      ? list.items.map(item => {
          return {
            id: item.metadata.name,
            displayName: item.spec && item.spec.displayName,
            name: item.spec && item.spec.name,
          };
        })
      : [];
  }

  const result: RecordSet<Manager> = {
    recordCount: userList.length,
    records: userList,
  };

  return result;
}

/**
 *
 * @param query 集群列表查询的一些过滤条件
 */
export async function fetchAdminstratorInfo() {
  let userResourceInfo: ResourceInfo = resourceConfig().platforms;
  let url = reduceK8sRestfulPath({ resourceInfo: userResourceInfo });
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let info = {};
  if (response.code === 0) {
    let list = response.data;
    if (list.items) {
      info = list.items.length ? list.items[0] : {};
    }
  }

  return info;
}

/**
 * 业务编辑
 */
export async function modifyAdminstrator(projects: ProjectEdition[]) {
  try {
    let platformsResourceInfo: ResourceInfo = resourceConfig().platforms;
    let url = reduceK8sRestfulPath({ resourceInfo: platformsResourceInfo });

    /** 构建参数 */
    let requestParams = {
        kind: platformsResourceInfo.headTitle,
        apiVersion: `${platformsResourceInfo.group}/${platformsResourceInfo.version}`,
        spec: {
          administrators: projects[0].members.map(m => m.name),
        },
      },
      method = 'POST';

    if (projects[0].id) {
      //修改
      method = 'PUT';
      url += '/' + projects[0].id;
      requestParams = JSON.parse(
        JSON.stringify({
          kind: platformsResourceInfo.headTitle,
          apiVersion: `${platformsResourceInfo.group}/${platformsResourceInfo.version}`,
          metadata: {
            name: projects[0].id,
            resourceVersion: projects[0].resourceVersion,
          },
          spec: {
            administrators: projects[0].members.length ? projects[0].members.map(m => m.name) : null,
          },
        })
      );
    }
    let params: RequestParams = {
      method,
      url,
      data: requestParams,
    };
    let response = await reduceNetworkRequest(params);
    if (response.code === 0) {
      return operationResult(projects);
    } else {
      return operationResult(projects, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(projects, reduceNetworkWorkflow(error));
  }
}

/**
 * 业务查询
 * @param query 地域查询的一些过滤条件
 */
export async function fetchProjectUserInfo(query: QueryState<ProjectFilter>) {
  let projectResourceInfo: ResourceInfo = resourceConfig().auth_project;
  let url = reduceK8sRestfulPath({ resourceInfo: projectResourceInfo });
  let params: RequestParams = {
    method: Method.get,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let projectUserMap = {};
  try {
    if (response.code === 0) {
      let listItems = response.data;
      if (listItems.items) {
        listItems.items.forEach(item => {
          let userInfo = item.members
            ? Object.keys(item.members).map(key => ({
                id: key,
                username: item.members[key],
              }))
            : [];
          projectUserMap[item.metadata.name] = userInfo;
        });
      }
    }
  } catch (error) {
    // 这里是搜索的时候，如果搜索不到的话，会报404的错误，只有在 resourceNotFound的时候，不把错误抛出去
    if (+error.response.status !== 404) {
      throw error;
    }
  }

  return projectUserMap;
}
/**
 * 添加已有业务为子业务
 * @param query
 */
export async function addExistMultiProject(projects: Project[], parentProjectName: string) {
  let resourceInfo = resourceConfig().projects;
  try {
    let requests = projects.map(async item => {
      let url = reduceK8sRestfulPath({ resourceInfo, specificName: item.metadata.name });
      let method = Method.patch;
      let param = {
        method,
        url,
        userDefinedHeader: {
          'Content-Type': 'application/strategic-merge-patch+json',
        },
        data: {
          spec: {
            parentProjectName,
          },
        },
      };
      let response = reduceNetworkRequest(param);
      return response;
    });
    // 构建参数
    let response = await Promise.all(requests);
    if (response.every(r => r.code === 0)) {
      return operationResult(projects);
    } else {
      return operationResult(projects, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(projects, reduceNetworkWorkflow(error));
  }
}

export async function deleteParentProject(projects: Project[]) {
  let resourceInfo = resourceConfig().projects;
  try {
    let url = reduceK8sRestfulPath({ resourceInfo, specificName: projects[0].metadata.name });
    let method = Method.patch;
    let param = {
      method,
      url,
      userDefinedHeader: {
        'Content-Type': 'application/strategic-merge-patch+json',
      },
      data: {
        spec: {
          parentProjectName: null,
        },
      },
    };
    // 构建参数s
    let response = await reduceNetworkRequest(param);
    if (response.code === 0) {
      return operationResult(projects);
    } else {
      return operationResult(projects, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(projects, reduceNetworkWorkflow(error));
  }
}

export async function fetchNamespaceKubectlConfig(query: QueryState<NamespaceFilter>) {
  let {
    filter: { projectId, np },
  } = query;
  let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
  let url = reduceK8sRestfulPath({
    resourceInfo: NamespaceResourceInfo,
    specificName: projectId,
    extraResource: `namespaces/${np}/certificate`,
  });

  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
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
        apiServerHost: response.data.status.certificate.apiServerHost,
      };
    }
  } catch (error) {}

  return result;
}

export async function migrateNamesapce(namespaces: Namespace[], options: NamespaceOperator) {
  try {
    let { projectId, desProjectId } = options;
    let NamespaceResourceInfo: ResourceInfo = resourceConfig().namespaces;
    let url = reduceK8sRestfulPath({
      resourceInfo: NamespaceResourceInfo,
      specificName: projectId,
      extraResource: `nsemigrations`,
    });

    let method = Method.post;
    let param = {
      method,
      url,
      data: {
        kind: 'NsEmigration',
        apiVersion: 'business.tkestack.io/v1',
        metadata: {
          namespace: projectId,
        },
        spec: {
          namespace: namespaces[0].metadata.name,
          nsShowName: namespaces[0].metadata.namespace,
          destination: desProjectId,
        },
      },
    };
    // 构建参数
    let response = await reduceNetworkRequest(param);
    if (response.code === 0) {
      return operationResult(namespaces);
    } else {
      return operationResult(namespaces, reduceNetworkWorkflow(response));
    }
  } catch (error) {
    return operationResult(namespaces, reduceNetworkWorkflow(error));
  }
}
/**
 * 集群列表的查询
 * @param query 集群列表查询的一些过滤条件
 */
export async function fetchUserManagedProjects(query: QueryState<UserManagedProjectFilter>) {
  let { userId } = query.filter;
  let userResourceInfo: ResourceInfo = resourceConfig().user;
  let url = reduceK8sRestfulPath({
    resourceInfo: userResourceInfo,
    specificName: userId,
    extraResource: 'projects',
  });

  /** 构建参数 */
  let method = 'GET';
  let params: RequestParams = {
    method,
    url,
  };

  let response = await reduceNetworkRequest(params);
  let managedProjects = [];
  if (response.code === 0) {
    let list = response.data;
    managedProjects = Object.keys(list.managedProjects).map(item => ({ id: item, name: item }));
  }

  const result: RecordSet<UserManagedProject> = {
    recordCount: managedProjects.length,
    records: managedProjects,
  };

  return result;
}
export async function fetchUserId(query: QueryState<string>) {
  let infoResourceInfo: ResourceInfo = resourceConfig()['info'];
  let url = reduceK8sRestfulPath({ resourceInfo: infoResourceInfo });
  let params: RequestParams = {
    method: Method.get,
    url,
  };
  let result;
  try {
    let response = await reduceNetworkRequest(params);
    result = response.data;
  } catch (error) {}

  return result;
}
