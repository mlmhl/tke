import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CurrentDisplay {
  displayType: 'polaris_list' | 'details';
  polarisId: number | string | null;
}

interface CurrentDisplayPayload {
  displayType: 'polaris_list' | 'details';
  polarisId?: number | string | null;
}

interface CurrentFilters {
  clusterId: string;
  projectId: string;
  namespaceId: string;
}

type CurrentDisplayState = {
  // 对应集群是否安装了polaris
  isPolarisInstalled: boolean;
} & CurrentDisplay & CurrentFilters;

const initialState: CurrentDisplayState = {
  clusterId: '',
  projectId: '',
  namespaceId: '',
  isPolarisInstalled: null,
  displayType: 'polaris_list',
  polarisId: null
};

const polarisDisplaySlice = createSlice({
  name: 'polarisDisplay',
  initialState,
  reducers: {
    setPolarisFilters(state, action: PayloadAction<CurrentFilters>) {
      const { clusterId, projectId, namespaceId } = action.payload;
      state.clusterId = clusterId;
      state.projectId = projectId;
      state.namespaceId = namespaceId;
    },
    setIsPolarisInstalled(state, action: PayloadAction<boolean>) {
      state.isPolarisInstalled = action.payload;
    },
    setCurrentDisplayType(state, action: PayloadAction<CurrentDisplayPayload>) {
      const { displayType, polarisId = null } = action.payload;
      state.displayType = displayType;
      state.polarisId = polarisId;
    }
  }
});
export const {
  setPolarisFilters,
  setIsPolarisInstalled,
  setCurrentDisplayType
} = polarisDisplaySlice.actions;

export default polarisDisplaySlice.reducer;

