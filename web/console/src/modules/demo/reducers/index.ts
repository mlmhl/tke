import { combineReducers } from 'redux';
import todosReducer from '../features/todos/todosSlice';
import visibilityFilterReducer from '../features/filters/filtersSlice';

const rootReducer = combineReducers({
  todos: todosReducer,
  visibilityFilter: visibilityFilterReducer
});

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer;
