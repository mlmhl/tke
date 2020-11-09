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
    console.log('response@fetchClusterList = ', response);
    return response;
  },
  getRecord: (getState: GetState) => {
    return getState().cluster;
  },
  // onFinish: (record, dispatch, getState: GetState) => {
  //   const clusters = [...record.data.records];
  //   const zones = clusters.reduce(
  //     (accu, current, arr) => {
  //       return accu;
  //     },
  //     {
  //       'cls-c9pmn57w': ['test000', 'test111']
  //     }
  //   );
  //   const clusterZone = [
  //     {
  //       clusterId: 'cls-c9pmn57w',
  //       clusterDisplayName: '共享集群测试',
  //       zone: 'ap-nanjing-1'
  //     },
  //     {
  //       clusterId: 'cls-c9pmn57w',
  //       clusterDisplayName: '共享集群测试',
  //       zone: 'ap-nanjing-2'
  //     },
  //     {
  //       clusterId: 'global',
  //       clusterDisplayName: 'TKE',
  //       zone: 'ap-beijing-1'
  //     }
  //   ];
  //   dispatch(restActions.updateClusterZone(clusterZone));
  // }
});

const restActions = {
  selectCluster: (cluster: Cluster[]) => {
    return async (dispatch: Redux.Dispatch, getState: GetState) => {
      dispatch(FFModelClusterActions.select(cluster[0]));
    };
  },

  // updateClusterZone: (zones: Zone[]) => {
  updateClusterZone: zones => {
    return async (dispatch: Redux.Dispatch, getState: GetState) => {
      dispatch({ type: ActionType.UpdateClusterZone, payload: zones });
    };
  }
};

export const clusterActions = extend({}, FFModelClusterActions, restActions);
