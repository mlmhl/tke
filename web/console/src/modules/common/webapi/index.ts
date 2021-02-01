import * as RegionAPI from './RegionAPI';
import * as K8sResourceAPI from './K8sResourceAPI';
import * as GrafanaAPI from './GrafanaAPI';

export const CommonAPI = Object.assign({}, RegionAPI, K8sResourceAPI, GrafanaAPI);
