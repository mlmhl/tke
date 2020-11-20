import { useState, useEffect } from 'react';
import { fetchNamespacesByProject, fetchNamespacesByCluster } from '@src/modules/polaris/api';

interface UseNamespaceProps {
  projectId?: string;
  clusterId?: string;
}

/**
 * 业务侧或者平台侧获取命名空间数据
 */
export const useNamespaces = ({ projectId = '', clusterId = '' }: UseNamespaceProps) => {
  const [namespacesById, setNamespacesById] = useState({});
  const [currentPageNamespaces, setCurrentPageNamespaces] = useState([]);
  const [namespaceSelectOptions, setNamespaceSelectOptions] = useState([]);
  const [namespaceGroups, setNamespaceGroups] = useState({});
  useEffect(() => {

    // 对namespaces的数据进行统一处理
    function handleNamespacesFormat(namespaces) {
      const namespacesById = {};
      const currentPageNamespaces = [];
      const namespaceSelectOptions = [];
      const namespaceGroups = {};

      namespaces.forEach(namespace => {
        const { name } = namespace.metadata;
        const { clusterName, clusterDisplayName, namespace: namespaceName } = namespace.spec;
        namespacesById[name] = namespace;
        currentPageNamespaces.push(name);
        if (projectId) {
          const groupValue = `${clusterDisplayName}(${clusterName})`;
          namespaceSelectOptions.push({
            value: name,
            text: namespaceName,
            tooltip: namespaceName,
            groupKey: clusterName,
            groupValue
          });
          namespaceGroups[clusterName] = groupValue;
        } else {
          namespaceSelectOptions.push({
            value: name,
            text: name,
            tooltip: name
          });
        }
      });
      setNamespacesById(namespacesById);
      setCurrentPageNamespaces(currentPageNamespaces);
      setNamespaceSelectOptions(namespaceSelectOptions);
      setNamespaceGroups(namespaceGroups);
    }

    // 平台侧
    async function getPlatformNamespaces({ clusterId }) {
      const namespaceFetchResult = await fetchNamespacesByCluster({ clusterId });
      handleNamespacesFormat(namespaceFetchResult);
    }

    // 业务侧
    async function getBusinessNamespaces({ projectId }) {
      const namespaceFetchResult = await fetchNamespacesByProject({ projectId });
      handleNamespacesFormat(namespaceFetchResult);
    }

    if (projectId) {
      getBusinessNamespaces({ projectId });
    } else if (clusterId) {
      getPlatformNamespaces({ clusterId });
    }
  }, [projectId, clusterId]);

  return { namespacesById, currentPageNamespaces, namespaceSelectOptions, namespaceGroups };
};
