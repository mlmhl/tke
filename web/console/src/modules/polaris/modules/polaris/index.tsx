/**
 * 北极星模块
 */
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layout, Table, Card } from '@tencent/tea-component';
import { useModal, useRefresh } from '@src/modules/common';
import { RootState } from '@src/modules/polaris/modules/rootReducer';
import UninstalledPolarisModal from '@src/modules/polaris/common/components/UninstalledPolarisModal';
import PolarisHeader from '@src/modules/polaris/features/polarisHeader/PolarisHeader';
import PolarisListPage from '@src/modules/polaris/features/polarisList/PolarisListPage';
import PolarisEditor from '@src/modules/polaris/features/polarisEditor/PolarisEditorPage';
import {
  setPolarisFilters,
  setIsPolarisInstalled,
  setCurrentDisplayType
} from '@src/modules/polaris/features/polarisDisplay/polarisDisplaySlice';
import { router } from '../../router';

const { Body, Content } = Layout;

interface PolarisProps {
  isPlatform: boolean;
}

const Polaris = React.memo((props: PolarisProps) => {
  const { isPlatform } = props;
  const dispatch = useDispatch();
  const {
    clusterSelectOptions,
    projectSelectOptions
  } = useSelector((state: RootState) => state.clustersAndProjects);
  const {
    clusterId,
    projectId,
    namespaceId,
    isPolarisInstalled
  } = useSelector((state: RootState) => state.polarisDisplay);
  const route = useSelector((state: RootState) => state.router);
  const { mode } = router.resolve(route);

  /**
   * 在父中封装其他slice的action的dispatch的好处是：组件内部可以直接调用方法，不需要关心这还是个action，还需要dispatch
   */
  const setSlicePolarisFilters = ({
    clusterId,
    projectId,
    namespaceId
  }: {
    clusterId: string;
    projectId: string | null;
    namespaceId: string;
  }) => {
    dispatch(setPolarisFilters({ clusterId, projectId, namespaceId }));
  };

  const setPolarisInstalledFlag = (isPolarisInstalled: boolean) => {
    dispatch(setIsPolarisInstalled(isPolarisInstalled));
  };

  const { refreshFlag, triggerRefresh } = useRefresh();
  if (mode === 'create') {
    return (
      <Layout>
        <Body>
          <Content>
            <Content.Header
              showBackButton
              title="新建北极星规则"
              onBackButtonClick={() => { router.navigate({ mode: '' }) }}
            />
            <Content.Body>
              <Card>
                <Card.Body>
                  <PolarisEditor
                    isPlatform={isPlatform}
                    clusterId={clusterId}
                    projectId={projectId}
                    namespaceId={namespaceId}
                    clusterSelectOptions={clusterSelectOptions}
                    projectSelectOptions={projectSelectOptions}
                    triggerRefresh={triggerRefresh}
                  />
                </Card.Body>
              </Card>
            </Content.Body>
          </Content>
        </Body>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <Body>
          <Content>
            <Content.Header
              title="北极星"
            />
            <Content.Body>
              <Table.ActionPanel>
                <PolarisHeader
                  isPlatform={isPlatform}
                  setPolarisFilters={setSlicePolarisFilters}
                  setPolarisInstalledFlag={setPolarisInstalledFlag}
                  triggerRefresh={triggerRefresh}
                />
              </Table.ActionPanel>
              <Card>
                <PolarisListPage
                  isPolarisInstalled={isPolarisInstalled}
                  clusterId={clusterId}
                  namespaceId={namespaceId}
                  refresh={refreshFlag}
                  triggerRefresh={triggerRefresh}
                />
              </Card>
              <UninstalledPolarisModal
                isPolarisInstalled={isPolarisInstalled}
              />
            </Content.Body>
          </Content>
        </Body>
      </Layout>
    );
  }
});
export default Polaris;
