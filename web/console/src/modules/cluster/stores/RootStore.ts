import { createStore } from '@tencent/ff-redux';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { generateResetableReducer } from '../../../../helpers';
import { RootReducer } from '../reducers/RootReducer';

export function configStore() {
  // const store = createStore(generateResetableReducer(RootReducer));
  const store: any = configureStore({
    reducer: generateResetableReducer(RootReducer),
    middleware: getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredPaths: ['subRoot.lbcfEdit']
      }
    })
  });

  // hot reloading
  if (typeof module !== 'undefined' && (module as any).hot) {
    (module as any).hot.accept('../reducers/RootReducer', () => {
      store.replaceReducer(generateResetableReducer(require('../reducers/RootReducer').RootReducer));
    });
  }

  return store;
}
