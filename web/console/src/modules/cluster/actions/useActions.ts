import { createFFObjectActions, extend } from '@/lib/ff-redux';
import { UserInfo, RootState } from '../models';
import { FFReduxActionName } from './../constants/Config';
import * as WebAPI from '../WebAPI';

type GetState = () => RootState;
const FFModelUserInfoActions = createFFObjectActions<UserInfo, string>({
  actionName: FFReduxActionName.UserInfo,
  fetcher: async (query, getState: GetState, fetchOptions) => {
    if (fetchOptions && fetchOptions.data) {
      return fetchOptions.data;
    }
    let response = await WebAPI.fetchUserId(query);
    return response;
  },
  getRecord: (getState: GetState) => {
    return getState().userInfo;
  }
});
export const userActions = extend({}, FFModelUserInfoActions);
