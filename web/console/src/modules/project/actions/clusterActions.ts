import { createFFListActions, extend } from '@tencent/ff-redux';

import { Cluster, ClusterFilter, RootState } from '../models';
import * as WebAPI from '../WebAPI';
import * as ActionType from '../constants/ActionType';

type GetState = () => RootState;

/** 集群列表的Actions */
const FFModelClusterActions = createFFListActions<Cluster, ClusterFilter>({
  actionName: 'cluster',
  fetcher: async (query, getState: GetState) => {
    let response = await WebAPI.fetchClusterList(query);
    return response;
  },
  getRecord: (getState: GetState) => {
    return getState().cluster;
  },
});

const restActions = {
  selectCluster: (cluster: Cluster[]) => {
    return async (dispatch: Redux.Dispatch, getState: GetState) => {
      dispatch(FFModelClusterActions.select(cluster[0]));
    };
  },

  updateClusterZone: zones => {
    return async (dispatch: Redux.Dispatch, getState: GetState) => {
      dispatch({ type: ActionType.UpdateClusterZone, payload: zones });
    };
  }
};

export const clusterActions = extend({}, FFModelClusterActions, restActions);
