/**
 * namespace下拉选择组件
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { DispatchContext, CHANGE_PROJECT } from '../../../modules/polaris/context';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { isEmpty } from '@src/modules/common/utils';
import {
  Select,
  Text
} from '@tencent/tea-component';

const ProjectSelector = React.memo((props: {
  projectList: any[];
}) => {
  const scopeDispatch = useContext(DispatchContext);
  const { projectList = [] } = props;

  /**
   * 初始化集群，默认选中第一项
   * projectList 这个数据挺坑的，之前的逻辑生成的数据，每次都是不同的引用，下边转JSONstring后边想象有没有更好的处理方式。
   */
  const [selectedProjectId, setSelectedProjectId] = useState();
  useEffect(() => {
    if (!isEmpty(projectList)) {
      const defaultProjectId = projectList[0].value;
      setSelectedProjectId(defaultProjectId);

      // 在scopeState中存储选中的clusterId，供其他地方使用
      scopeDispatch({
        type: CHANGE_PROJECT,
        payload: { projectId: defaultProjectId }
      });
    }
  }, [JSON.stringify(projectList)]);
  const selectStyle = useMemo(() => ({ display: 'inline-block', fontSize: '12px', verticalAlign: 'middle' }), []);
  return (
    <div style={selectStyle}>
      <Text theme="label" verticalAlign="middle">
        {t('业务')}
      </Text>
      <Select
        searchable
        boxSizeSync
        type="simulate"
        appearence="button"
        size="m"
        options={projectList}
        // style={{ width: '130px', marginRight: '5px' }}
        value={selectedProjectId}
        onChange={selectProjectId => {
          setSelectedProjectId(selectProjectId);

          // 在scopeState中存储选中的clusterId，供其他地方使用
          scopeDispatch({
            type: CHANGE_PROJECT,
            payload: { projectId: selectProjectId }
          });
        }}
        placeholder={projectList.length ? '' : t('无可用集群')}
      />
    </div>
  );
});

export default ProjectSelector;
