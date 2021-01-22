import { setProjectName } from '@helper';

/**
 * 缓存选择的集群
 * @param clusterName
 */
export const setClusterCache = clusterName => {
  window.localStorage.setItem('selectedClusterName', clusterName);
};

/**
 * 获取缓存的选中集群
 */
export const getClusterCache = () => {
  let clusterName = window.localStorage.getItem('selectedClusterName');
  return clusterName;
};

/**
 * 获取缓存的业务选择
 */
export const getProjectCache = () => {
  let projectId = window.localStorage.getItem('selectedProject');
  return projectId;
};

/**
 * 缓存选中的业务
 * @param projectId
 */
export const setProjectCache = projectId => {
  window.localStorage.setItem('selectedProject', projectId);
  // 在CLB模块兼容 reduceNetworkRequest 对 X-TKE-ProjectName 的支持
  setProjectName(projectId);
};

/**
 * 设置选中的命名空间缓存
 * @param namespace
 */
export const setNamespaceCache = (namespace, isPlatform) => {
  window.localStorage.setItem(isPlatform ? 'selectedNamespaceForPlatform' : 'selectedNamespaceForBusiness', namespace);
};

/**
 * 获取缓存的选中命名空间
 */
export const getNamespaceCache = isPlatform => {
  let namespace = window.localStorage.getItem(
    isPlatform ? 'selectedNamespaceForPlatform' : 'selectedNamespaceForBusiness'
  );
  return namespace;
};
