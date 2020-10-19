/**
 * namespace下拉选择组件
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { CHANGE_NAMESPACE, CHANGE_CLUSTER, StateContext, DispatchContext } from '../../../modules/polaris/context';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { isEmpty } from '@src/modules/common/utils';
import {
  Select,
  Text
} from '@tencent/tea-component';
import { RecordSet } from '@tencent/ff-redux/src';
import { Resource } from '@src/modules/common/models';

// 下边props没有用这个interface因为使用后Select会你报一些类型的问题，感觉还不太好整合，有时间整合下
interface NamespaceSelectProps {
  namespaces: RecordSet<Resource>;
}

const NamespaceSelector = React.memo((props: {
  namespaceList: any[];
}) => {
  const scopeDispatch = useContext(DispatchContext);
  const scopeState = useContext(StateContext);
  const { isPlatform } = scopeState;
  const { namespaceList = [] } = props;

  /**
   * 初始化namespace，默认选中第一项
   */
  const [selectedNamespaceId, setSelectedNamespaceId] = useState();
  const [groups, setGroups] = useState({});
  useEffect(() => {
    if (!isEmpty(namespaceList)) {
      const { value: defaultNamespaceId, groupKey: clusterId, namespaceId } = namespaceList[0];
      setSelectedNamespaceId(defaultNamespaceId);
      // if平台侧  else业务侧
      if (isPlatform) {
        scopeDispatch({
          type: CHANGE_NAMESPACE,
          payload: { namespaceId: defaultNamespaceId }
        });
      } else {
        const groupObj = {};
        namespaceList.forEach(item => {
          groupObj[item.groupKey] = item.groupValue;
        });
        setGroups(groupObj);

        scopeDispatch({
          type: CHANGE_CLUSTER,
          payload: { clusterId }
        });
        scopeDispatch({
          type: CHANGE_NAMESPACE,
          payload: { namespaceId }
        });
      }
    }
  }, [namespaceList]);

  const selectStyle = useMemo(() => ({ display: 'inline-block', fontSize: '12px', verticalAlign: 'middle' }), []);
  return (
    <div style={selectStyle}>
      <Text theme="label" verticalAlign="middle">
        {t('命名空间')}
      </Text>
      <Select
        type="native"
        appearence="button"
        size="l"
        options={namespaceList}
        groups={isPlatform ? undefined : groups}
        style={{ width: '130px', marginRight: '5px' }}
        value={selectedNamespaceId}
        onChange={selectedNamespaceId => {
          setSelectedNamespaceId(selectedNamespaceId);
          if (isPlatform) {

            // 在scopeState中存储选中的namespaceId，供其他地方使用
            scopeDispatch({
              type: CHANGE_NAMESPACE,
              payload: { namespaceId: selectedNamespaceId }
            });
          } else {

            // namespace选项改变时对应改scopeState中的namespaceId
            namespaceList.forEach(item => {
              const { value, namespaceId, groupKey } = item;
              if (value === selectedNamespaceId) {
                scopeDispatch({
                  type: CHANGE_CLUSTER,
                  payload: { clusterId: groupKey }
                });
                scopeDispatch({
                  type: CHANGE_NAMESPACE,
                  payload: { namespaceId }
                });
              }
            });
          }
        }}
        placeholder={namespaceList.length ? '' : t('无可用命名空间')}
      />
    </div>
  );
});

export default NamespaceSelector;
