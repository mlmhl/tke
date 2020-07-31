import React from 'react';
import { Layout } from '@tea/component/layout';
import { Card } from '@tea/component/card';
import { Text } from '@tea/component/text';
import { ExternalLink } from '@tea/component/link';
import { Tabs, TabPanel } from '@tea/component/tabs';

import { InstanceList } from './instanceList';
import { RuleList } from './ruleList';

const { Body, Content } = Layout;

export function CLBInstance(props) {
  const tabs = [
    { id: 'instance', label: '已导入实例' },
    { id: 'rule', label: '实例使用情况' },
  ];

  return (
    <Layout>
      <Body>
        <Content>
          <Content.Header
            title="CLB管理"
            subtitle={
              <>
                <Text theme="label">CLB 实例管理/实例使用情况</Text>
              </>
            }
            // operation={<ExternalLink weak>内容帮助</ExternalLink>}
          />
          <Content.Body>
            <Tabs ceiling animated={false} tabs={tabs}>
              <TabPanel id="instance">
                <InstanceList {...props} />
              </TabPanel>
              <TabPanel id="rule">
                <RuleList {...props} />
              </TabPanel>
            </Tabs>
          </Content.Body>
        </Content>
      </Body>
    </Layout>
  );
}
