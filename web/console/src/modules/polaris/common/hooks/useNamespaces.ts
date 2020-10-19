import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchNamespacesByProject, fetchNamespacesByCluster } from '@src/modules/polaris/services/api';

/**
 * 业务侧或者平台侧获取命名空间数据
 */
export const useNamespaces = ({ projectId = '', clusterId = '' }: { projectId?: string; clusterId?: string}) => {
  const [namespaces, setNamespaces] = useState([]);
  useEffect(() => {

    // 平台侧
    async function getPlatformNamespaces({ clusterId }) {
      const namespaceFetchResult = await fetchNamespacesByCluster({ clusterId });
      setNamespaces(namespaceFetchResult);
    }

    // 业务侧
    async function getBusinessNamespaces({ projectId }) {
      const namespaceFetchResult = await fetchNamespacesByProject({ projectId });
      setNamespaces(namespaceFetchResult);
    }

    if (projectId) {
      getBusinessNamespaces({ projectId });
    } else if (clusterId) {
      getPlatformNamespaces({ clusterId });
    }
  }, [projectId, clusterId]);

  return namespaces;
};
