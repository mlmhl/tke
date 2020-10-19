import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWorkloadsByNamespace } from '@src/modules/polaris/services/api';

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
      // const data = await fetchWorkloadsByNamespace(clusterName, namespace, 'deployments');
      // const workloads = data.map(({ metadata }) => ({ name: metadata.name, labels: metadata.labels }));
      setWorkloads(workloads);
    }
    //
    // async function getDeploymentList(clusterName, namespace) {
    //   const data = await fetchWorkloadsByNamespace(clusterName, namespace, 'deployments');
    //   const workloads = data.map(({ metadata }) => ({ name: metadata.name, labels: metadata.labels }));
    //   setWorkloads(workloads);
    // }
    //
    // async function getStatefulsetList(clusterName, namespace) {
    //   const data = await fetchWorkloadsByNamespace(clusterName, namespace, 'statefulsets');
    //   // const workloads = data.map(({ name, available, labels }) => ({ name, labels, available }));
    //   const workloads = data.map(({ metadata }) => ({ name: metadata.name, labels: metadata.labels }));
    //   setWorkloads(workloads);
    // }
    //
    // async function getTappList(clusterName, namespace) {
    //   const data = await fetchWorkloadsByNamespace(clusterName, namespace, 'tapps');
    //   const workloads = data.map(({ metadata }) => ({ name: metadata.name, labels: metadata.labels }));
    //   setWorkloads(workloads);
    // }

    if (clusterName && namespace) {
      getResourceList();
      // if (type === 'deployments') {
      //   getDeploymentList(clusterName, namespace);
      // } else if (type === 'statefulsets') {
      //   getStatefulsetList(clusterName, namespace);
      // } else {
      //   getTappList(clusterName, namespace);
      // }
    }
  }, [type, clusterName, namespace]);

  return workloads;
};

