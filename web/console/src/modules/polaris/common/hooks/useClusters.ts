import { useState, useEffect } from 'react';
import { fetchAllClusters } from '@src/modules/polaris/services/api';

/**
 * 获取clusters
 */
export const useClusters = () => {
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    async function getAllClusters() {
      const clusters = await fetchAllClusters();
      setClusters(clusters);
    }
    getAllClusters();
  }, []);

  return clusters;
};

