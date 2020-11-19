import { Identifiable } from '@tencent/ff-redux';

import { Validation } from '../../common/models';
import { Manager } from './Manager';

export interface Project extends Identifiable {
  /** metadata */
  metadata: ProjectMetadata;

  /** spec */
  spec: ProjectSpec;

  /** status */
  status: ProjectStatus;
}

interface ProjectMetadata {
  /** projectId */
  name?: string;

  /** 创建时间 */
  creationTimestamp?: string;

  /** 其余属性 */
  [props: string]: any;
}

type SpecZoneType = {
  clusterName: string;

  zone: string;

  hard?: StatusResource;
};

interface ProjectSpec {
  /** project名称 */
  displayName: string;

  /** Project成员 */
  members: string[];

  /** project分配的quota */
  clusters?: {
    [props: string]: {
      hard?: StatusResource;
    };
  };

  /** project分配的quota，可用区级别[共享集群] */
  zones?: Array<SpecZoneType>;

  parentProjectName?: string;
}

interface ProjectStatus {
  /** 可分配 */
  used?: StatusResource;
  /** 未分配 */
  calculatedChildProjects?: string;

  calculatedNamespaces?: string[];

  /** 状态 */
  phase?: string;
}

interface StatusResource {
  [props: string]: string;
}

export type CMDBInfoType = {
  departmentName: string;
  departmentId: number;
  businessLevelOneName: string;
  businessLevelOneId: number;
  businessLevelTwoName: string;
  businessLevelTwoId: number;
};

export type CMDBDepartmentType = {
  Id: number;
  Name: string;
}

export type DepartmentType = {
  id: number;
  name: string;
}

export type CMDBBusinessLevelOneType = {
  bs1NameId: number;
  bs1Name: string;
}

export type CMDBBusinessLevelTwoType = {
  bs2NameId: number;
  bs2Name: string;
}

export type CMDBBusinessLevelThreeType = {
  bs3NameId: number;

  bs3Name: string;
}

export interface ProjectEdition extends Identifiable {
  id: string;

  resourceVersion: string;

  members: Manager[];

  displayName: string;
  v_displayName: Validation;

  cmdbInfo?: CMDBInfoType; // cmdb业务信息（部门，一级业务，二级业务）

  isSharingCluster: boolean;  // 是否为共享集群

  clusters?: {
    name: string;
    zone?: string; // 可用区
    v_name: Validation;
    resourceLimits: ProjectResourceLimit[];
  }[];

  parentProject: string;

  status: any;
}

export interface ProjectResourceLimit extends Identifiable {
  type: string;
  v_type: Validation;
  value: string;
  v_value: Validation;
}

export interface ProjectFilter {
  /** 业务id */
  ProjectId?: string;

  /**业务名称 */
  displayName?: string;

  parentProject?: string;
}

export interface ProjectUserMap {
  [props: string]: {
    id: string;
    username: string;
  }[];
}

export interface UserManagedProject extends Identifiable {
  name: string;
}
export interface UserManagedProjectFilter {
  userId: string;
}
