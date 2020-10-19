/**
 * 北极星规则详情 yaml-tab
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { isEmpty, useModal, useRefresh } from '@src/modules/common/utils';
import { Justify, Button, Table, Modal }  from '@tencent/tea-component';
import { YamlEditorPanel } from '@src/modules/cluster/components/resource/YamlEditorPanel';
import { StateContext } from '../context';
import { fetchPolarisYaml, modifyPolarisYaml } from '../../../services/api';
import YamlEditor from '../editor/yaml';

const Yaml = React.memo((props: {
  selectedPolaris: any;
}) => {
  const scopeState = useContext(StateContext);
  // const scopeDispatch = useContext(DispatchContext);
  const { clusterId, namespaceId } = scopeState;

  const { selectedPolaris } = props;
  const ruleName = selectedPolaris.metadata.name;

  const { isShowing, toggle } = useModal();
  const [newYamlData, setNewYamlData] = useState('');

  /**
   * 获取yaml数据
   */
  const [yaml, setYaml] = useState('');
  const { refreshFlag, triggerRefresh } = useRefresh();
  useEffect(() => {
    async function getPolarisYaml() {
      const result = await fetchPolarisYaml({ clusterId, namespaceId, ruleName });
      setYaml(result);
    }
    if (clusterId && namespaceId && ruleName) {
      getPolarisYaml();
    }
  }, [clusterId, namespaceId, ruleName, refreshFlag]);

  return (
    <>
      <Table.ActionPanel>
        <Justify
          left={
            <Button type="primary" onClick={() => {
              triggerRefresh();
              toggle();
            }}>修改Yaml</Button>
          }
        />
      </Table.ActionPanel>
      <YamlEditorPanel config={yaml} readOnly={true} isNeedRefreshContent={true} />
      <Modal visible={isShowing} size="l" caption="修改Yaml" onClose={() => toggle()}>
        <Modal.Body>
          <YamlEditor yaml={yaml} onChange={value => { setNewYamlData(value) }} />
        </Modal.Body>
        <Modal.Footer>
          <Button type="primary" onClick={() => {
            const result = modifyPolarisYaml({ clusterId, namespaceId, ruleName, yamlData: newYamlData });
            if (result) {
              setYaml(newYamlData);
              toggle();
            }
          }}>
            确定
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});
export default Yaml;
