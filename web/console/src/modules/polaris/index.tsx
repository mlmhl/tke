/**
 * 北极星模块（按页面最左侧的块划分，可能有多个子模块）
 */
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { ResetStoreAction } from '@/helpers';
import store from './modules/store';
import Modules from './modules';

interface PolarisModuleProps {
  context: string;
  projects: any[];
  [propName: string]: any;
}
const PolarisModule = (props: PolarisModuleProps) => {

  // context为同步数据，projects为异步数据
  const { context = '', projects = [] } = props;

  // 设置业务侧 & 平台侧的boolean标识
  const isPlatform = context && context === 'platform';
  console.log('PolarisModule is:', projects);
  useEffect(() => {
    return () => {
      store.dispatch({ type: ResetStoreAction });
    };
  }, []);

  return (
    <Provider store={store}>
      <Modules isPlatform={isPlatform} projects={projects} />
    </Provider>
   );
};

export default PolarisModule;
