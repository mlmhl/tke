/**
 * store根处理文件
 */
import { configureStore, getDefaultMiddleware, Action } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { ThunkAction } from 'redux-thunk';
import rootReducer, { RootState } from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();
const middleware = [...getDefaultMiddleware(), sagaMiddleware];

const store = configureStore({
  reducer: rootReducer,
  middleware
});
sagaMiddleware.run(rootSaga);

if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  (module as any).hot.accept('./rootReducer', () => {
    const newRootReducer = require('./rootReducer').default;
    store.replaceReducer(newRootReducer);
  });
}

export type AppDispatch = typeof store.dispatch

export type AppThunk = ThunkAction<void, RootState, null, Action<string>>

export default store;
