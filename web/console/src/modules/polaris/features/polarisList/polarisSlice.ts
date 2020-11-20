import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { createSagaSlice } from 'redux-toolkit-with-saga';
import { take, put, call, takeEvery, takeLatest, select } from 'redux-saga/effects';
import { fetchPolarisData } from '../../api';

interface PolarisState {
  polarisByRuleName: Record<string, any>; // any待补充
  currentPagePolaris: string[];
  recordCount: number;
  isLoading: boolean;
  error: string | null;
}

const polarisInitialState: PolarisState = {
  polarisByRuleName: {},
  currentPagePolaris: [],
  recordCount: -1,
  isLoading: false,
  error: null
};

function startLoading(state: PolarisState) {
  state.isLoading = true;
  state.error = null;
}

function loadingFailed(state: PolarisState, action: PayloadAction<string>) {
  state.isLoading = false;
  state.error = action.payload;
}

const polaris = createSlice({
  name: 'polaris',
  initialState: polarisInitialState,
  reducers: {
    getPolarisListStart: startLoading,
    getPolarisListSuccess(state, { payload }: PayloadAction<any>) { // any待补全
      const { records, recordCount } = payload;
      state.recordCount = recordCount;
      state.isLoading = false;
      state.error = null;
      const polarisByRuleName = {};
      const currentPagePolaris = [];
      if (recordCount) {
        records.forEach(polaris => {
          const { metadata = {}} = polaris;
          const { name = '' } = metadata;
          polarisByRuleName[name] = polaris;
          currentPagePolaris.push(name);
        });
      }
      state.polarisByRuleName = polarisByRuleName;
      state.currentPagePolaris = currentPagePolaris;
    },
    getPolarisListFailure: loadingFailed
  }
});

export const {
  getPolarisListStart,
  getPolarisListSuccess,
  getPolarisListFailure
} = polaris.actions;

export default polaris.reducer;
export const polarisActions = polaris.actions;

const slice = createSagaSlice({
  name: polaris.name,
  effects: {
    * fetchPolarisList({ payload }) {
      yield put(getPolarisListStart());
      try {
        const result = yield call(fetchPolarisData, payload);
        yield put(getPolarisListSuccess(result));
      } catch (err) {
        yield put(getPolarisListFailure(err.toString()));
      }
    }
  }
});

export const polarisCallEffects = slice.callEffects;
export const { fetchPolarisList } = slice.effectActions;
