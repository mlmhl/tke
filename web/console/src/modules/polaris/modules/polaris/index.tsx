/**
 * 北极星模块入口
 */
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ScopeProvider, DispatchContext, StateContext } from './context';
import { isEmpty, useRefresh } from '@src/modules/common/utils';
import List from './list';
import { useNamespaces, useClusters } from '../../common/hooks';
import { fetchPolarisData, polarisInstallCheckByCluster } from '../../services/api';

export const PolarisModule = React.memo((props: {
  context: string;
  projects?: string;
  [propName: string]: any;
}) => {
  // context为同步数据，可以初始化到scopeContext中。projects为异步数据，没有特别深，这里手动通过props传下去的
  const { context, projects } = props;

  // 设置业务侧 & 平台侧boolean标识
  const isPlatform = context && context === 'platform';
  return (
    <ScopeProvider value={{ context, isPlatform }}>
      <Polaris projectList={projects} />
    </ScopeProvider>
  );
});

/**
 * Polaris组件
 */
export const Polaris = React.memo((props: any) => {
  const scopeState = useContext(StateContext);
  // const scopeDispatch = useContext(DispatchContext);
  const { namespaceId, clusterId, projectId, isPlatform } = scopeState;
  const { projectList = [] } = props;
  const newProjectList = projectList.map(item => ({ ...item, value: item.id, text: item.name }));

  // 集群列表数据获取
  const clusterList = useClusters();

  // 获取命名空间数据
  const namespaceList = useNamespaces({ projectId, clusterId });

  /**
   * 北极星规则列表获取
   */
  // const [polarisData, setPolarisData] = useState();
  // useEffect(() => {
  //   async function getPolarisData({ namespaceId, clusterId }: { namespaceId: string; clusterId: string}) {
  //     const result = await fetchPolarisData({ namespaceId, clusterId });
  //     setPolarisData(result);
  //   }
  //   if (namespaceId && clusterId) {
  //     getPolarisData({ namespaceId, clusterId });
  //   }
  // }, [namespaceId, clusterId, refreshFlag]);

  /**
   * 下边返回的不是路由适配的内容的话，上边的部分数据获取可以直接放在List组件中
   */
  return (
    <List
      clusterList={clusterList}
      namespaceList={namespaceList}
      projectList={newProjectList}
    />
  );
});
