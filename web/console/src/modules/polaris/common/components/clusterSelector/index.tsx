/**
 * namespace下拉选择组件
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { DispatchContext, CHANGE_CLUSTER } from '../../../modules/polaris/context';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { isEmpty } from '@src/modules/common/utils';
import {
  Select,
  Text
} from '@tencent/tea-component';

const ClusterSelector = React.memo((props: {
  clusterList: any[];
}) => {
  const { clusterList = [] } = props;
  const scopeDispatch = useContext(DispatchContext);

  /**
   * 初始化集群，默认选中第一项
   */
  const [selectedClusterId, setSelectedClusterId] = useState();
  useEffect(() => {
    if (!isEmpty(clusterList)) {
      const defaultClusterId = clusterList[0].value;
      setSelectedClusterId(defaultClusterId);

      // 在scopeState中存储选中的clusterId，供其他地方使用
      scopeDispatch({
        type: CHANGE_CLUSTER,
        payload: { clusterId: defaultClusterId }
      });
    }
  }, [clusterList]);

  const selectStyle = useMemo(() => ({ display: 'inline-block', fontSize: '12px', verticalAlign: 'middle' }), []);
  return (
    <div style={selectStyle}>
      <Text theme="label" verticalAlign="middle">
        {t('集群')}
      </Text>
      <Select
        searchable
        boxSizeSync
        type="simulate"
        appearence="button"
        size="m"
        options={clusterList}
        value={selectedClusterId}
        onChange={selectClusterId => {
          setSelectedClusterId(selectClusterId);

          // 在scopeState中存储选中的clusterId，供其他地方使用
          scopeDispatch({
            type: CHANGE_CLUSTER,
            payload: { clusterId: selectClusterId }
          });
        }}
        placeholder={clusterList.length ? '' : t('无可用集群')}
      />
    </div>
  );
});

export default ClusterSelector;
