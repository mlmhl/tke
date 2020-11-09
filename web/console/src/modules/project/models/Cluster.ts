import { Identifiable } from '@tencent/ff-redux';

export interface Cluster extends Identifiable {
  /** 集群Id */
  clusterId?: string | number;

  /** 名称 */
  clusterName?: string;

  /** 可用区[共享集群] */
  zones?: Array<string>;
}

export interface ClusterFilter {
  regionId?: string | number;
}
