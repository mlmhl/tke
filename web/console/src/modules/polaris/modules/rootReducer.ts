/**
 * rootReducer根组织文件
 */
import { combineReducers } from '@reduxjs/toolkit';
import polarisDisplayReducer from '@src/modules/polaris/features/polarisDisplay/polarisDisplaySlice';
import clustersAndProjectsReducer from '@src/modules/polaris/features/polarisHeader/clustersAndProjectsSlice';
import polarisReducer from '@src/modules/polaris/features/polarisList/polarisSlice';
import { router } from '../router';
const rootReducer = combineReducers({
  router: router.getReducer(),
  polarisDisplay: polarisDisplayReducer,
  clustersAndProjects: clustersAndProjectsReducer,
  polaris: polarisReducer
});

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer;
