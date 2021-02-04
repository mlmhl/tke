import { Identifiable } from '@tencent/ff-redux';

import { Validation } from '../../common/models';
import { CMDBInfoType, ProjectResourceLimit } from './Project';

export interface Namespace extends Identifiable {
  /** 类型 */
  kind?: string;

  /** api的版本 */
  apiVersion?: string;

  /** metadata */
  metadata?: NamespaceMetadata;

  /** spec */
  spec?: NamespaceSpec;

  /** status */
  status?: NamespaceStatus;
}

interface NamespaceMetadata {
  /** 命名空间id */
  name?: string;

  /** 命名空间 */
  namespace?: string;

  /** 请求的url */
  selfLink?: string;

  /** uid */
  uid?: string;

  /** 资源的版本 */
  resourceVersion?: string;

  /** 创建时间 */
  creationTimestamp?: string;
}

interface NamespaceSpec {
  /**命名空间名称 */
  namespace?: string;

  /**集群名称 */
  clusterName?: string;

  clusterVersion?: string;

  clusterType: string;

  hard?: {
    [props: string]: string;
  };
}

interface NamespaceStatus {
  phase?: string;

  reason?: string;

  used: any;
}

export type CMDBInfoWithDefaultModuleType = CMDBInfoType & {
  businessLevelThreeName: string;

  businessLevelThreeId: number;
};

export interface NamespaceEdition extends Identifiable {
  /**命名空间名称 */

  resourceVersion: string;

  namespaceName?: string;

  v_namespaceName?: Validation;

  /**集群名称 */
  clusterName?: string;

  region?: string; // 地域【共享集群】

  zone?: string; // 可用区【共享集群】

  v_clusterName?: Validation;

  cmdbInfo?: CMDBInfoWithDefaultModuleType; // 包含默认模块（三级业务）的cmdb信息【共享集群】

  resourceLimits: ProjectResourceLimit[];

  status: any;
}

export interface NamespaceOperator {
  /**业务 */
  projectId?: string;
  /**迁移使用 */
  desProjectId?: string;
}

export interface NamespaceFilter {
  /**业务Id */
  projectId?: string;

  np?: string;
}

export interface NamespaceCert {
  certPem: string;
  keyPem: string;
  caCertPem: string;
  apiServer: string;
  apiServerIP: string;
  apiServerHost: string;
}
