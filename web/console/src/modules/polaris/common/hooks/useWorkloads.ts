import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWorkloadsByNamespace } from '@src/modules/polaris/api';

/**
 * 获取workloads
 */
export const useWorkloads = ({ type = 'deployments', clusterName = '', namespace = '' }: { type: string; clusterName: string; namespace: string}) => {
  const [workloads, setWorkloads] = useState([]);
  useEffect(() => {

    async function getResourceList() {
      const data = await fetchWorkloadsByNamespace(clusterName, namespace, type);
      const workloads = data.map(({ metadata, spec }) => {
        const name = metadata.name;
        const labels = spec.selector && spec.selector.matchLabels;
        return { name, labels };
      });
      setWorkloads(workloads);
    }
    if (clusterName && namespace) {
      getResourceList();
    }
  }, [type, clusterName, namespace]);

  return workloads;
};

