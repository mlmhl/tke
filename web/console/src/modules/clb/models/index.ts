export interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

export interface Project {
  id: string;

  name: string;
}

export interface Namespace {
  name: string; // 命名空间名称

  fullName: string; // 命名空间全名，即前面拼接clusterName

  clusterName: string; // 所在集群的名称，例如cls-8xlswcbl

  clusterDisplayName?: string; // 所在集群的显示名称，例如public-demo

  projectId?: string; // 所在的业务名称
}
