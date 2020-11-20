import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { take, put, call, takeLatest, takeEvery } from 'redux-saga/effects';
import { Cluster, ClustersResult, Project, fetchAllClusters } from '../../api';
import { KeyValueMap } from '../../common/models';
import { createSagaSlice } from 'redux-toolkit-with-saga';
interface ClustersAndProjectsState {
  clustersById: Record<string, Cluster>;
  currentPageClusters: string[];
  clusterSelectOptions: KeyValueMap[];
  recordCount: number;
  isLoading: boolean;
  error: string | null;

  projectsById: any; // 待补
  currentPageProjects: string[];
  projectSelectOptions: KeyValueMap[];
}

const initialState: ClustersAndProjectsState = {
  clustersById: {},
  currentPageClusters: [],
  clusterSelectOptions: [],
  recordCount: 0,
  isLoading: false,
  error: null,
  projectsById: {},
  currentPageProjects: [],
  projectSelectOptions: []
};

function startLoading(state: ClustersAndProjectsState) {
  state.isLoading = true;
  state.error = null;
}

function loadingFailed(state: ClustersAndProjectsState, action: PayloadAction<string>) {
  state.isLoading = false;
  state.error = action.payload;
}

const clustersAndProjects = createSlice({
  name: 'clustersAndProjects',
  initialState,
  reducers: {
    getClustersStart: startLoading,
    getClusters: startLoading,
    getClustersSuccess(state, { payload }: PayloadAction<ClustersResult>) {
      const { recordCount, records } = payload;
      state.recordCount = recordCount;
      state.isLoading = false;
      state.error = null;
      const clustersById = {};
      const currentPageClusters = [];
      const clusterSelectOptions = [];
      if (recordCount) {
        records.forEach(cluster => {
          const { metadata = {}, spec = {}} = cluster;
          const { name = '' } = metadata;
          const { displayName = '' } = spec;
          const text = `${displayName}(${name})`;
          clustersById[name] = cluster;
          currentPageClusters.push(name);
          clusterSelectOptions.push({
            value: name.toString(),
            text,
            tooltip: text
          });
        });
      }
      state.clustersById = clustersById;
      state.currentPageClusters = currentPageClusters;
      state.clusterSelectOptions = clusterSelectOptions;
      // 问题：下边每次push会不会都触发一次渲染？ 开启页面的动态渲染绿框看着只会触发一次
      // if (recordCount) {
      //   records.forEach(cluster => {
      //     const { metadata = {}, spec = {}} = cluster;
      //     const { name = '' } = metadata;
      //     const { displayName = '' } = spec;
      //     const text = `${displayName}(${name})`;
      //     state.clustersById[name] = cluster;
      //     state.currentPageClusters.push(name);
      //     state.clusterSelectOptions.push({
      //       value: name.toString(),
      //       text,
      //       tooltip: text
      //     });
      //   });
      // } else {
      //   state.clustersById = {};
      //   state.currentPageClusters = [];
      //   state.clusterSelectOptions = [];
      // }
    },
    getClustersFailure: loadingFailed,
    setProjects(state, action: PayloadAction<any>) {
      const projects = action.payload;
      const projectsById = {};
      const currentPageProjects = [];
      const projectSelectOptions = [];
      projects.forEach(project => {
        const { id = '', name = '' } = project;
        projectsById[id] = project;
        currentPageProjects.push(id);
        projectSelectOptions.push({
          value: id,
          text: name,
          tooltip: name
        });
      });
      state.projectsById = projectsById;
      state.currentPageProjects = currentPageProjects;
      state.projectSelectOptions = projectSelectOptions;
    }
  }
});

export const {
  getClustersStart,
  getClustersSuccess,
  getClustersFailure,
  setProjects
} = clustersAndProjects.actions;
export default clustersAndProjects.reducer;


const sagaSlice = createSagaSlice({
  name: clustersAndProjects.name,
  effects: {
    * fetchClusters() {
      yield put(getClustersStart());
      try {
        const result = yield call(fetchAllClusters);
        yield put(getClustersSuccess(result));
      } catch (err) {
        yield put(getClustersFailure(err.toString()));
      }
    }
  }
});

export const {
  fetchClusters
} = sagaSlice.effectActions;
export const clustersAndProjectsCallEffects = sagaSlice.callEffects;
