/**
 * 北极星详情页
 */
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Tabs, TabPanel } from '@tencent/tea-component';
import { RootState } from '@src/modules/polaris/modules/rootReducer';
import BasicTab from './BasicTab';
import PolarisBasicTab from './PolarisBasicTab';
import YamlTab from './YamlTab';

const tabs = [
  { id: 'info', label: '详情' },
  { id: 'polaris', label: '北极星详情' },
  { id: 'yaml', label: 'YAML' },
];

interface PolarisDetailsPage {
  polarisName: string;
  clusterId: string;
  triggerListRefresh: () => void;
}

const PolarisDetailsPage = React.memo((props: PolarisDetailsPage) => {
  const { polarisName: ruleName, clusterId, triggerListRefresh } = props;
  const polarisByRuleName = useSelector((state: RootState) => state.polaris.polarisByRuleName);
  const polaris = polarisByRuleName[ruleName];

  return (
    <Tabs ceiling animated={false} tabs={tabs}>
      <TabPanel id="info">
        <BasicTab
          clusterId={clusterId}
          polaris={polaris}
        />
      </TabPanel>
      <TabPanel id="polaris">
        <PolarisBasicTab
          clusterId={clusterId}
          polaris={polaris}
        />
      </TabPanel>
      <TabPanel id="yaml">
        <YamlTab
          clusterId={clusterId}
          polaris={polaris}
          triggerListRefresh={triggerListRefresh}
        />
      </TabPanel>
    </Tabs>
  );
});
export default PolarisDetailsPage;
