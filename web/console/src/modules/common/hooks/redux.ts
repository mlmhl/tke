import { bindActionCreators } from '@tencent/ff-redux';
import { useDispatch } from 'react-redux';
import * as React from 'react';
/**
 * 自定义hooks-调用actions
 * 使用场景在非useEffect中使用
 * @param actions
 */
export function useReduxDispatch<T>(actions: T) {
  const dispatch = useDispatch();
  const bindActionWithDispatch = dispatch =>
    Object.assign({}, bindActionCreators({ actions: actions }, dispatch), { dispatch });
  const useDisPatch = bindActionWithDispatch(dispatch);
  return useDisPatch.actions;
}

/**
 * 使用场景，函数组件需要把actions绑定到属性的场景
 * @param actions
 */
export function mapActionsToProps<T>(actions: T) {
  const mapDispatchToProps = dispatch =>
    Object.assign({}, bindActionCreators({ actions: actions }, dispatch), { dispatch });
  return mapDispatchToProps;
}

export function useReduxActions<T>(actions: T) {
  const dispatch = useDispatch();
  return React.useMemo(() => {
    return bindActionCreators(actions, dispatch);
  }, [actions, dispatch]);
}
