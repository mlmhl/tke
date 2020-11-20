/**
 * 北极星列表
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Table, Drawer, Button, Text } from '@tencent/tea-component';
import { isEmpty, LinkButton, useModal } from '@src/modules/common';
import { deletePolaris, Polaris } from '@src/modules/polaris/api';
import { RootState } from '@src/modules/polaris/modules/rootReducer';
import PolarisRemoveModal from '@src/modules/polaris/features/polarisList/PolarisRemoveModal';
import PolarisDetailsPage from '@src/modules/polaris/features/polarisDetails/PolarisDetailsPage';
import { fetchPolarisList } from './polarisSlice';

const { autotip } = Table.addons;

interface PLProps {
  isPolarisInstalled: boolean;
  refresh: number;
  clusterId: string;
  namespaceId: string;
  triggerRefresh: () => void;
}

const PolarisListPage = (props: PLProps) => {
  const {
    isPolarisInstalled,
    refresh,
    clusterId,
    namespaceId,
    triggerRefresh
  } = props;
  const dispatch = useDispatch();
  const {
    polarisByRuleName,
    currentPagePolaris,
    recordCount,
    isLoading,
    error
  } = useSelector((state: RootState) => state.polaris);

  const [selectedPolarisName, setSelectedPolarisName] = useState();
  const polarisList: Polaris[] = useMemo(() => {
    return currentPagePolaris.map(ruleName => polarisByRuleName[ruleName]);
  }, [polarisByRuleName, currentPagePolaris]);
  const { isShowing: detailsDrawerVisible, toggle: detailsDrawerToggle } = useModal();

  /**
   * 列表内容处理
   */
  // 北极星规则列表获取
  useEffect(() => {
    console.log('polaris list get:', isPolarisInstalled === true, clusterId, namespaceId);
    if (isPolarisInstalled === true && clusterId && namespaceId) {
      // dispatch(getPolarisList({ clusterId, namespaceId }));
      dispatch(fetchPolarisList({ clusterId, namespaceId }));
    }
  }, [clusterId, namespaceId, isPolarisInstalled, refresh]);

  const [emptyText, setEmptyText] = useState('');
  useEffect(() => {
    if (isPolarisInstalled === false) {
      setEmptyText('选择集群尚未开通北极星服务');
    } else if (recordCount === 0) {
      setEmptyText('您选择的该资源的列表为空');
    } else if (recordCount) {
      setEmptyText('');
    }
  }, [isPolarisInstalled, recordCount]);

  /**
   * 删除部分相关代码
   */
  const { isShowing: removeVisible, toggle: removeToggle } = useModal();
  const removePolaris = async () => {
    if (clusterId && namespaceId && selectedPolarisName) {
      const isRemoved = await deletePolaris({ clusterId, namespaceId, ruleName: selectedPolarisName });
      if (isRemoved) {
        removeToggle();
        triggerRefresh();
      }
    }
  };

  const columns = [
    {
      key: 'name',
      header: t('规则名称'),
      render: record => (
        <>
          <LinkButton onClick={() => {
            detailsDrawerToggle(true);
            setSelectedPolarisName(record.metadata.name);
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
              setSelectedPolarisName(record.metadata.name);
            }}
          >
            <Trans>详情</Trans>
          </LinkButton>
          <LinkButton
            tipDirection="left"
            onClick={() => {
              setSelectedPolarisName(record.metadata.name);
              removeToggle();
            }}
          >
            <Trans>删除</Trans>
          </LinkButton>
        </>
      )
    }
  ];

  return (
    <>
      <Table
        records={polarisList}
        recordKey={polaris => {
          return polaris.metadata.name;
        }}
        columns={columns}
        addons={[
          autotip({
            isLoading: isLoading,
            isError: error,
            emptyText: emptyText
          }),
        ]}
      />
      <PolarisRemoveModal
        visible={removeVisible}
        toggle={removeToggle}
        polarisName={selectedPolarisName}
        removePolaris={removePolaris}
      />
      <Drawer
        visible={detailsDrawerVisible}
        size="l"
        title="规则详情"
        footer={<Button type="primary" onClick={() => detailsDrawerToggle(false)}>关闭</Button>}
        onClose={() => detailsDrawerToggle(false)}
      >
        <PolarisDetailsPage
          polarisName={selectedPolarisName}
          clusterId={clusterId}
          triggerListRefresh={triggerRefresh}
        />
      </Drawer>
    </>
  );
};
export default PolarisListPage;
