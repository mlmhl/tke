import { useState, useEffect, useRef, useCallback } from 'react';

export const useModal = (isShowingParam = false) => {
  const [isShowing, setIsShowing] = useState(isShowingParam);

  function toggle(value = undefined) {
    // tea组件Drawer在开启outerClickClosable后，处理开、关时需要设置具体值，既走下边else部分逻辑，走if开关不受控，不知道这个组件搞了什么鬼。或者关闭outerClickClosable也能走if的逻辑
    if (value === undefined || value === null) {
      setIsShowing(!isShowing);
    } else {
      setIsShowing(value);
    }
  }

  return {
    isShowing,
    toggle
  };
};

export const usePrevious = value => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useRefresh = () => {
  const [refreshFlag, setRefreshFlag] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshFlag(new Date().getTime());
  }, []);
  return {
    refreshFlag,
    triggerRefresh
  };
};
