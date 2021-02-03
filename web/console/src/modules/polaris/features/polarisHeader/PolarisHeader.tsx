/**
 * 北极星列表的header
 */
import React, { useState, useEffect, useMemo }  from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { insertCSS } from '@/lib/ff-redux';
import { Justify, Button, Select, Text } from '@tencent/tea-component';
import { isEmpty } from '@src/modules/common';
import { useNamespaces } from '@src/modules/polaris/common/hooks';
import { RootState } from '@src/modules/polaris/modules/rootReducer';
import { fetchClusters } from './clustersAndProjectsSlice';
// import { getClustersStart } from './clustersAndProjectsSlice';
import { polarisInstallCheckByCluster } from '@src/modules/polaris/api';
import { router } from '../../router';
/**
 * 组件样式
 */
insertCSS(
  'polaris-feature-header',
  `
    .polarisHeaderFilterItem { display: inline-block; }
    .polarisHeaderFilterItem + .polarisHeaderFilterItem { margin-left: 10px; }
  `
);

interface PolarisHeaderProps {
  isPlatform: boolean;
  setPolarisFilters: (value: {clusterId: string; projectId: string | null; namespaceId: string}) => void;
  setPolarisInstalledFlag: (value: boolean) => void;
  triggerRefresh: () => void;
}

const PolarisHeader = React.memo((props: PolarisHeaderProps) => {
  const {
    isPlatform,
    setPolarisFilters,
    setPolarisInstalledFlag,
    triggerRefresh
  } = props;
  const dispatch = useDispatch();
  const { clusterSelectOptions, projectSelectOptions } = useSelector((state: RootState) => state.clustersAndProjects);

  /**
   * 集群列表数据获取。
   * 需要dispatch自己slice的action，外部slice的action的dispatch在父中有方法封装，组件中直接调用方法
   */
  useEffect(() => {
    console.log('getClustersStart start.......');
    // dispatch(getClustersStart());
    dispatch(fetchClusters());
  }, []);

  /**
   * 初始化cluster，默认选中第一项
   */
  const [selectedClusterId, setSelectedClusterId] = useState('');
  useEffect(() => {
    if (isPlatform === true && !isEmpty(clusterSelectOptions)) {
      const defaultClusterId = clusterSelectOptions[0].value;
      setSelectedClusterId(defaultClusterId);
    }
  }, [isPlatform, clusterSelectOptions]);

  /**
   * 初始化project，默认选中第一项
   * projectList 这个数据挺坑的，之前的逻辑生成的数据，每次都是不同的引用，下边转JSONstring后边想想有没有更好的处理方式。
   */
  const [selectedProjectId, setSelectedProjectId] = useState('');
  useEffect(() => {
    if (isPlatform === false && !isEmpty(projectSelectOptions)) {
      const defaultProjectId = projectSelectOptions[0].value;
      setSelectedProjectId(defaultProjectId);
    }
  }, [isPlatform, JSON.stringify(projectSelectOptions)]);

  /**
   * 获取命名空间数据
   */
  const { namespacesById, namespaceSelectOptions, namespaceGroups } = useNamespaces({
    clusterId: selectedClusterId,
    projectId: selectedProjectId
  });

  /**
   * cluster & project变动时，namespace列表数据会变，此时选中namespace列表第一项
   */
  const [selectedNamespaceId, setSelectedNamespaceId] = useState('');
  useEffect(() => {
    if (!isEmpty(namespaceSelectOptions)) {
      const { value: defaultNamespaceId } = namespaceSelectOptions[0];
      setSelectedNamespaceId(defaultNamespaceId);
      if (isPlatform === false) {
        const namespaceObj = namespacesById[defaultNamespaceId];
        const { spec = {}} = namespaceObj;
        const { clusterName: clusterId, namespace: namespaceId } = spec;
        setSelectedClusterId(clusterId);
      }
    }
  }, [JSON.stringify(namespaceSelectOptions), isPlatform]);

  /**
   * 是否安装北极星
   * 业务侧 cluster选项变更 || 平台侧 namespace选项变更（会引起cluster变更）
   */
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    async function polarisInstallCheck() {
      const result = await polarisInstallCheckByCluster({ clusterId: selectedClusterId });
      const isInstalled = !!result && result.installed;
      setIsInstalled(isInstalled);
      setPolarisInstalledFlag(isInstalled);
    }
    if (selectedClusterId) {
      polarisInstallCheck();
    }
  }, [selectedClusterId]);

  /**
   * 选中的namespace列表发生变化时改变全局的相关filter变量供list模块重新请求list数据
   */
  useEffect(() => {
    if (selectedNamespaceId) {
      // if平台侧  else业务侧
      if (isPlatform) {
        setPolarisFilters({
          clusterId: selectedClusterId,
          projectId: null,
          namespaceId: selectedNamespaceId
        });
      } else if (!isEmpty(namespacesById)) {
        const namespaceId = selectedNamespaceId.replace(new RegExp(`^${selectedClusterId}-`), '');
        setPolarisFilters({
          clusterId: selectedClusterId,
          projectId: selectedProjectId,
          namespaceId: namespaceId
        });
      }
    }
  }, [selectedNamespaceId, namespacesById]);

  return (
    <Justify
      left={
        <Button
          type="primary"
          disabled={isInstalled === false}
          onClick={() => {
            router.navigate({ mode: 'create' });
          }}
        >
          <Trans>新建</Trans>
        </Button>
      }
      right={
        <>
          {
            isPlatform ? (
              <div className="polarisHeaderFilterItem">
                <Text theme="label" verticalAlign="middle" reset>
                  {t('集群')}
                </Text>
                <Select
                  searchable
                  boxSizeSync
                  type="simulate"
                  appearence="button"
                  size="m"
                  options={clusterSelectOptions}
                  value={selectedClusterId}
                  onChange={selectClusterId => {
                    setSelectedClusterId(selectClusterId);
                  }}
                  placeholder={clusterSelectOptions.length ? '' : t('无可用集群')}
                />
              </div>
            ) : (
              <div className="polarisHeaderFilterItem">
                <Text theme="label" verticalAlign="middle" reset>
                  {t('业务')}
                </Text>
                <Select
                  searchable
                  boxSizeSync
                  type="simulate"
                  appearence="button"
                  size="m"
                  options={projectSelectOptions}
                  value={selectedProjectId}
                  onChange={selectProjectId => {
                    setSelectedProjectId(selectProjectId);
                  }}
                  placeholder={projectSelectOptions.length ? '' : t('无可用业务')}
                />
              </div>
            )
          }
          <div className="polarisHeaderFilterItem">
            <Text theme="label" verticalAlign="middle" reset>
              {t('命名空间')}
            </Text>
            <Select
              searchable
              boxSizeSync
              type="simulate"
              appearence="button"
              size="m"
              options={namespaceSelectOptions}
              groups={isPlatform ? undefined : namespaceGroups}
              value={selectedNamespaceId}
              onChange={selectedNamespaceId => {
                setSelectedNamespaceId(selectedNamespaceId);
                if (isPlatform === false) {
                  const namespaceObj = namespacesById[selectedNamespaceId];
                  const { spec = {}} = namespaceObj;
                  const { clusterName: clusterId, namespace: namespaceId } = spec;
                  setSelectedClusterId(clusterId);
                }
              }}
              placeholder={namespaceSelectOptions.length ? '' : t('无可用命名空间')}
            />
          </div>
          <Button
            onClick={() => {
              triggerRefresh();
            }}
            icon="refresh"
          />
        </>
      }
    />
  );
});
export default PolarisHeader;
