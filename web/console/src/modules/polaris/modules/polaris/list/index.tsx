/**
 * 北极星列表组件
 */
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  Table,
  Justify,
  Button,
  Card,
  Layout,
  Text,
  Modal,
  Drawer
} from '@tencent/tea-component';
import { StateContext, DispatchContext } from '../context';
import { isEmpty, useModal } from '@src/modules/common/utils';
import { LinkButton } from '@src/modules/common/components';
import ClusterSelector from '@src/modules/polaris/common/components/clusterSelector';
import ProjectSelector from '@src/modules/polaris/common/components/projectSelector';
import NamespaceSelector from '@src/modules/polaris/common/components/namespaceSelector';
import PolarisEditorWithMethodProvide from '../editor/polaris/index';
import Details from '../detail';
import { deletePolaris, polarisInstallCheckByCluster } from '../../../services/api';

const { Body, Content } = Layout;
const { autotip } = Table.addons;

interface ListProps {
  clusterList: any[];
  namespaceList: any[];
  projectList: any[];
  polarisData: any;
  triggerRefresh: () => void;
}

const List = React.memo((props: ListProps) => {
  const scopeState = useContext(StateContext);
  const { clusterId, namespaceId, isPlatform } = scopeState;
  const { clusterList, namespaceList, projectList, polarisData, triggerRefresh } = props;

  const { isShowing: createVisible, toggle: createToggle } = useModal();
  const { isShowing: detailsDrawerVisible, toggle: detailsDrawerToggle } = useModal();
  const { isShowing: removeVisible, toggle: removeToggle } = useModal();
  const { isShowing: uninstalledVisible, toggle: uninstalledToggle } = useModal();
  const [removePolarisName, setRemovePolarisName] = useState('');
  // const [removeHpaName, setRemoveHpaName] = useState();
  const polarisEditor = useRef();
  const [selectedPolaris, setSelectedPolaris] = useState();

  /**
   * 列表内容处理【这里应该在接口的状态数据的基础上做处理，所以接口状态数据应该还有待完善】
   */
  const [loading, setLoading] = useState(true);
  const [emptyText, setEmptyText] = useState('');
  const [polarisList, setPolarisList] = useState([]);
  console.log('polarisData is:', polarisData);

  const [checkResult, setCheckResult] = useState();
  useEffect(() => {
    async function polarisInstallCheck() {
      const result = await polarisInstallCheckByCluster({ clusterId });
      setCheckResult(result);
      if (result && result.installed === false) {
        uninstalledToggle(true);
      }
      console.log('polarisInstallCheckByCluster result:', result);
    }
    if (clusterId) {
      polarisInstallCheck();
    }
  }, [clusterId]);

  useEffect(() => {
    if (checkResult && !checkResult.installed) {
      setLoading(false);
      setEmptyText('选择集群尚未开通北极星服务');
    } else if (isEmpty(polarisData)) {
      setLoading(true);
      setEmptyText('');
    } else if (!polarisData.recordCount) {
      setLoading(false);
      setEmptyText('您选择的该资源的列表为空');
    } else if (polarisData.recordCount) {
      setLoading(false);
      setEmptyText('');
      setPolarisList(polarisData.records);
    }
  }, [polarisData]);

  return (
    <Layout>
      <Body>
        <Content>
          <Content.Header
            title="北极星"
          />
          <Content.Body>
            <Table.ActionPanel>
              <Justify
                left={
                  <Button
                    type="primary"
                    onClick={() => {
                      createToggle();
                    }}
                    disabled={checkResult && !checkResult.installed}
                  >
                    <Trans>新建</Trans>
                  </Button>
                }
                right={
                  <>
                    {
                      isPlatform ? (
                        <ClusterSelector clusterList={clusterList} />
                      ) : (
                        <ProjectSelector projectList={projectList} />
                      )
                    }
                    <NamespaceSelector namespaceList={namespaceList} />
                    <Button
                      onClick={() => {
                        triggerRefresh();
                      }}
                      icon="refresh"
                    />
                  </>
                }
              />
            </Table.ActionPanel>
            <Card>
              <Table
                records={polarisList}
                recordKey="key"
                columns={[
                  {
                    key: 'name',
                    header: t('规则名称'),
                    render: record => (
                      <>
                        <LinkButton onClick={() => {
                            detailsDrawerToggle(true);
                            setSelectedPolaris(record);
                          }}>
                          <Text>{record.metadata.name}</Text>
                        </LinkButton>
                      </>
                    ),
                  },
                  {
                    key: 'serviceName',
                    header: t('服务名'),
                    render: record => (
                      <Text>{record.spec.loadBalancers[0].spec.service}</Text>
                    ),
                  },
                  {
                    key: 'namespace',
                    header: t('（北极星）命名空间'),
                    render: record => (
                      <Text>{record.spec.loadBalancers[0].spec.namespace}</Text>
                    ),
                  },
                  {
                    key: 'deletion',
                    header: t('状态'),
                    render: record => (
                      <Text>{record.metadata.deletionTimestamp ? '删除中' : '运行中'}</Text>
                    ),
                  },
                  {
                    key: 'action',
                    header: t('操作'),
                    render: (record) => (
                      <>
                        <LinkButton
                          tipDirection="left"
                          onClick={() => {
                            detailsDrawerToggle(true);
                            setSelectedPolaris(record);
                          }}
                        >
                          <Trans>详情</Trans>
                        </LinkButton>
                        <LinkButton
                          tipDirection="left"
                          onClick={() => {
                            setSelectedPolaris(record);
                            // setRemovePolarisName(record.metadata.name);
                            // setRemoveHpaName(hpa.metadata.name);
                            removeToggle();
                          }}
                        >
                          <Trans>删除</Trans>
                        </LinkButton>
                      </>
                    )
                  }
                ]}
                addons={[
                  autotip({
                    isLoading: loading,
                    emptyText: emptyText
                  }),
                ]}
              />
            </Card>
            <Modal visible={createVisible} size="l" caption={<h2>新建北极星规则</h2>} onClose={() => createToggle()}>
              <Modal.Body>
                <PolarisEditorWithMethodProvide ref={polarisEditor} isFormBottomButtonShow={true} clusterList={clusterList} namespaceList={namespaceList} projectList={projectList} createToggle={createToggle} triggerRefresh={triggerRefresh} />
              </Modal.Body>
              {/*这个Footer的逻辑放在组件中更合适，放出来有一点逻辑的割裂。*/}
              {/*<Modal.Footer>*/}
              {/*  <Button type="primary" onClick={async () => {*/}
              {/*    // @ts-ignore*/}
              {/*    polarisEditor.current.create();*/}
              {/*    createToggle();*/}
              {/*    triggerRefresh();*/}
              {/*  }}>*/}
              {/*    确定*/}
              {/*  </Button>*/}
              {/*  <Button type="weak" onClick={() => createToggle()}>*/}
              {/*    取消*/}
              {/*  </Button>*/}
              {/*</Modal.Footer>*/}
            </Modal>
            <Modal visible={removeVisible} caption="删除资源" onClose={() => removeToggle()}>
              <Modal.Body><Trans>您确定要删除规则：{selectedPolaris && selectedPolaris.metadata.name} 吗？</Trans></Modal.Body>
              <Modal.Footer>
                <Button type="primary" onClick={async () => {
                  const ruleName = selectedPolaris && selectedPolaris.metadata.name;
                  const isRemove = await deletePolaris({ clusterId, namespaceId, ruleName });
                  // const isRemove = await removeHPA({ namespace: namespaceValue, clusterId, name: removeHpaName });
                  if (isRemove) {
                    removeToggle();
                    triggerRefresh();
                  }
                }}>
                  确定
                </Button>
                <Button type="weak" onClick={removeToggle}>
                  取消
                </Button>
              </Modal.Footer>
            </Modal>
            <Modal visible={uninstalledVisible} caption="服务未开通" onClose={() => uninstalledToggle()}>
              <Modal.Body>
                此集群尚未开通北极星服务，请联系 <strong>ianlang</strong> 进行安装。<br />
                <br />
                安装北极星时，我们会执行以下操作：<br />
                1. LBCF升级到1.4<br />
                2. 安装LBCF的北极星driver<br />
                <br />
                PS: LBCF升级过程中负载均衡会短时间不可用<br />
              </Modal.Body>
              <Modal.Footer>
                <Button type="primary" onClick={() => {
                  uninstalledToggle();
                }}>
                  确定
                </Button>
              </Modal.Footer>
            </Modal>
            <Drawer
              visible={detailsDrawerVisible}
              size="l"
              title="规则详情"
              footer={<Button type="primary" onClick={() => detailsDrawerToggle(false)}>关闭</Button>}
              onClose={() => detailsDrawerToggle(false)}
            >
              <Details selectedPolaris={selectedPolaris} />
            </Drawer>
          </Content.Body>
        </Content>
      </Body>
    </Layout>
  );
});

export default List;
