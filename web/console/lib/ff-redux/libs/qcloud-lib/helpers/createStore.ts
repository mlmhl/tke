import { applyMiddleware, createStore as createReduxStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

// export const createStore =
//   process.env.NODE_ENV === 'development'
//     ? applyMiddleware(thunk, createLogger({ collapsed: true }))(createReduxStore)
//     : applyMiddleware(thunk)(createReduxStore);


export const createStore = (reducers) => createReduxStore(
    reducers,
    process.env.NODE_ENV === 'development' ?
        composeWithDevTools(
            applyMiddleware(thunk, createLogger({ collapsed: true }))
        ) :
        composeWithDevTools(
            applyMiddleware(thunk)
        )
);
