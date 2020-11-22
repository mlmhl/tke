import { Identifiable } from '@tencent/ff-redux';

import { Validation } from '../../common/models';

export interface ClusterCreationState extends Identifiable {
  /**链接集群名字 */
  name?: string;
  v_name?: Validation;

  /**apiServer地址 */
  apiServer?: string;
  v_apiServer?: Validation;

  clusterType?: string; // 集群类型[共享集群]

  rootPassword?: string; // 机器Root密码[共享集群]

  /**证书 */
  certFile?: string;
  v_certFile?: Validation;

  caKey?: string; // CA Key[共享集群]
  authzWebhook?: boolean; // 是否开启webhook鉴权[共享集群]

  token?: string;
  v_token?: Validation;

  jsonData?: any;

  currentStep?: number;
}
