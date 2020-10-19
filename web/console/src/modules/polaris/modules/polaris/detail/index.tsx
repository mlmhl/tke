import React, { useState, useContext } from 'react';
import { Tabs, TabPanel } from '@tencent/tea-component';
import { StateContext } from '../context';
import Basic from './basic';
import PolarisBasic from './polarisBasic';
import Yaml from './yaml';

const tabs = [
  { id: 'info', label: '详情' },
  { id: 'polaris', label: '北极星详情' },
  { id: 'yaml', label: 'YAML' },
];
const Details = React.memo((props: {
  selectedPolaris: any;
}) => {
  const scopeState = useContext(StateContext);
  const { clusterId } = scopeState;
  const { selectedPolaris } = props;

  return (
    <Tabs ceiling animated={false} tabs={tabs}>
      <TabPanel id="info">
        <Basic selectedPolaris={selectedPolaris} clusterId={clusterId} />
      </TabPanel>
      <TabPanel id="polaris">
        <PolarisBasic selectedPolaris={selectedPolaris} />
      </TabPanel>
      <TabPanel id="yaml">
        <Yaml selectedPolaris={selectedPolaris} />
      </TabPanel>
    </Tabs>
  );
});
export default Details;
