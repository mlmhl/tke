import React, { useEffect } from 'react';
import { render } from 'react-dom';
import { configureStore, Action } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import App from './components/App';
import rootReducer, { RootState } from './reducers';
import { ThunkAction } from 'redux-thunk';
import { ResetStoreAction } from '@/helpers';
export type AppThunk = ThunkAction<void, RootState, null, Action<string>>
const store = configureStore({
  reducer: rootReducer
});
if (process.env.NODE_ENV === 'development' && (module as any).hot) {
  (module as any).hot.accept('./reducers', () => {
    const newRootReducer = require('./reducers').default;
    store.replaceReducer(newRootReducer);
  });
}

export const Demo  = props => {
  useEffect(() => {
    return () => {
      store.dispatch({ type: ResetStoreAction });
    };
  }, []);

  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};
