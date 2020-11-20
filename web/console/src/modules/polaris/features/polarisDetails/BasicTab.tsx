import React from 'react';
import { Form, Table } from '@tencent/tea-component';
import { Polaris } from '@src/modules/polaris/api';

interface BasicTab {
  polaris: Polaris;
  clusterId: string;
}

const BasicTab = React.memo((props: BasicTab) => {
  const { polaris, clusterId } = props;
  const { metadata, spec } = polaris;
  const { namespace, name } = metadata;
  const { byLabel, byName, ports } = spec.pods;
  const { selector = {}} = byLabel || {};

  return (
    <Form>
      <Form.Item label="集群">
        <Form.Text>{clusterId}</Form.Text>
      </Form.Item>
      <Form.Item label="命名空间">
        <Form.Text>{namespace}</Form.Text>
      </Form.Item>
      <Form.Item label="规则名称">
        <Form.Text>{name}</Form.Text>
      </Form.Item>
      {byLabel ? (
        <>
          <Form.Item label="Selector">
            <Form.Text>
              {Object.keys(selector).map(item => (
                <p key={item}>{`${item}: ${selector[item]}`}</p>
              ))}
            </Form.Text>
          </Form.Item>
          <Form.Item label="排除Pod">
            <Form.Text>
              {byLabel.except.map(item => (
                <p key={item}>{item}</p>
              ))}
            </Form.Text>
          </Form.Item>
        </>
        ) : (
          <Form.Item label="按Pod名">
            <Form.Text>
              {byName.map(item => (
                <p key={item}>{item}</p>
              ))}
            </Form.Text>
          </Form.Item>
        )}
      <Form.Item label="Pod端口 ">
        <Table
          compact
          verticalTop
          columns={[
            {
              key: 'protocol',
              header: '协议',
            },
            {
              key: 'port',
              header: '端口',
            }
          ]}
          records={ports}
        />
      </Form.Item>
    </Form>
  );
});
export default BasicTab;
