/**
 * 模块的scope内的全局数据
 */
import React, { useReducer } from 'react';
import { useImmerReducer } from 'use-immer';

/**
 * 常量定义
 */
const CHANGE_NAMESPACE = 'CHANGE_NAMESPACE';
const CHANGE_CLUSTER = 'CHANGE_CLUSTER';
const CHANGE_PROJECT = 'CHANGE_PROJECT';

/**
 * 初始值
 */
let initialState = {
  namespaceId: '', // 选中的namespace value
  clusterId: '', // 选中的clusterId
  projectId: '', // 选中的projectId
};

/**
 * 全局数据定义
 */
const StateContext = React.createContext(null);
const DispatchContext = React.createContext(null);

/**
 * 结合immer实现的reducer
 * @param draft
 * @param action
 */
function immerReducer(draft, action) {
  switch (action.type) {
    case CHANGE_NAMESPACE:
      draft.namespaceId = action.payload.namespaceId;
      break;
    case CHANGE_CLUSTER:
      draft.clusterId = action.payload.clusterId;
      break;
    case CHANGE_PROJECT:
      draft.projectId = action.payload.projectId;
      break;
  }
  return draft;
}

/**
 * 包裹函数
 * @param props
 * @constructor
 */
function ScopeProvider(props) {
  if (props.value) {
    initialState = { ...initialState, ...props.value };
  }
  console.log('ScopeProvider get props is###:', props, initialState);
  const [scopeState, scopeDispatch] = useImmerReducer(immerReducer, initialState);
  return (
    <DispatchContext.Provider value={scopeDispatch}>
      <StateContext.Provider value={scopeState}>
        {props.children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
}

export {
  CHANGE_NAMESPACE,
  CHANGE_CLUSTER,
  CHANGE_PROJECT,
  StateContext,
  DispatchContext,
  ScopeProvider
};
