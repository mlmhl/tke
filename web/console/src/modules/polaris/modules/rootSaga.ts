import { createRootSaga } from 'redux-toolkit-with-saga';
import { clustersAndProjectsCallEffects } from '../features/polarisHeader/clustersAndProjectsSlice';
import { polarisCallEffects } from '../features/polarisList/polarisSlice';
const rootSaga = createRootSaga([
  clustersAndProjectsCallEffects,
  polarisCallEffects
]);
export default rootSaga;
