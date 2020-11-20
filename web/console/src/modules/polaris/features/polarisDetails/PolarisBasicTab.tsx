import React, { useState, useEffect, useContext } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Form, Table, Button, Modal, InputNumber, Text, Bubble, Icon } from '@tencent/tea-component';
import { isEmpty, useModal } from '@src/modules/common/utils';
import { Polaris, fetchInstanceByRuleName, fetchInstanceEvent, modifyPolaris, fetchPolaris } from '@src/modules/polaris/api';
import Event from './Event';

const { autotip } = Table.addons;

interface PolarisBasicTab {
  clusterId: string;
  polaris: Polaris;
}

const PolarisBasicTab = React.memo((props: PolarisBasicTab) => {
  const { clusterId, polaris } = props;
  const {
    spec: { loadBalancers, parameters },
    metadata: { name: ruleName, namespace: namespaceId }
  } = polaris;
  const { namespace, service } = loadBalancers[0].spec;
  const {
    weight,
    protocol,
    version,
    metadata: metadataInSpec,
    isolate,
    healthy,
    enableHealthCheck,
    healthCheckType,
    healthCheckTTL
  } = parameters;
  const metadataByJson = metadataInSpec && JSON.parse(metadataInSpec);

  const [showWeight, setShowWeight] = useState(weight);
  const [modifiedWeight, setModifiedWeight] = useState(weight);
  const { isShowing: eventVisible, toggle: eventToggle } = useModal();
  const { isShowing: modifyVisible, toggle: modifyToggle } = useModal();

  /**
   * 获取实例信息
   */
  const [instanceList, setInstanceList] = useState([]);
  useEffect(() => {
    async function getInstanceInfo() {
      const result = await fetchInstanceByRuleName({ clusterId, namespaceId, ruleName });
      setInstanceList(result);
    }
    if (clusterId && namespaceId && ruleName) {
      getInstanceInfo();
    }
  }, [clusterId, namespaceId, ruleName]);

  /**
   * 获取实例事件列表
   */
  const [instanceId, setInstanceId] = useState();
  const [eventList, setEventList] = useState([]);
  useEffect(() => {
    async function getInstanceEvent() {
      const result = await fetchInstanceEvent({ clusterId, namespaceId, instanceId });
      setEventList(result);
    }
    if (clusterId && namespaceId && instanceId) {
      getInstanceEvent();
    }
  }, [instanceId]);


  const instanceColumns = [
    {
      key: 'id',
      header: 'LBCF ID',
      render: record => {
        return record.metadata.name;
      }
    },
    {
      key: 'address',
      header: '实例地址',
      render: record => {
        return record.status.backendAddr;
      },
    },
    {
      key: 'status',
      header: '状态',
      render: record => {
        const { type, status } = record.status.conditions[0];
        return `${type}: ${status}`;
      }
    },
    {
      key: 'settings',
      header: '操作',
      render: record => {
        return (
          <Button type="link" onClick={() => {
              setInstanceId(record.metadata.name);
              eventToggle();
            }}>
            <strong>事件</strong>
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Form>
        <Form.Item label="命名空间">
          <Form.Text>{namespace}</Form.Text>
        </Form.Item>
        <Form.Item label="服务名">
          <Form.Text>{service}</Form.Text>
        </Form.Item>
        <Form.Item label="权重">
          <Text style={{ fontSize: '12px', marginRight: '5px', verticalAlign: 'middle' }}>{showWeight}</Text>
          <Button type="link" style={{ display: 'inline-block' }} onClick={() => {
              modifyToggle();
            }}
          >
            修改
          </Button>
        </Form.Item>
        <Form.Item label="协议">
          <Form.Text>{protocol || '-'} </Form.Text>
        </Form.Item>
        <Form.Item label="版本">
          <Form.Text>{version || '-'}</Form.Text>
        </Form.Item>
        <Form.Item label="元数据">
          {
            metadataByJson ? (
              <Form.Text>
                {Object.keys(metadataByJson).map(item => (
                  <p key={item}>{`${item}: ${metadataByJson[item]}`}</p>
                  ))}
              </Form.Text>
            ) : '-'
          }
        </Form.Item>
        <Form.Item label="是否隔离">
          <Form.Text>{isolate === 'true' ? '是' : '否'}</Form.Text>
        </Form.Item>
        <Form.Item label="健康状态">
          <Form.Text>
            <Text style={{ marginRight: '5px' }}>{healthy === 'true' ? '健康' : '异常'}</Text>
            <Bubble
              content="健康状态表示的是注册实例时使用的初始状态，实例的实际状态会根据健康检查的结果发生变化，请登录 polaris.oa.com 查看"
              >
              <Icon type="info" />
            </Bubble>
          </Form.Text>
        </Form.Item>
        <Form.Item label="健康检查">
          <Form.Text>{enableHealthCheck === 'true' ? '打开' : '关闭'}</Form.Text>
        </Form.Item>
        <Form.Item label="健康检查方式">
          <Form.Text>{healthCheckType && healthCheckType === '1' ? '上报心跳' : '-'}</Form.Text>
        </Form.Item>
        <Form.Item label="上报心跳TTL">
          <Form.Text>{healthCheckTTL ? healthCheckTTL : '-'}</Form.Text>
        </Form.Item>
        <Form.Item label="实例注册状态">
          <Table
            compact
            verticalTop
            disableTextOverflow
            records={instanceList}
            recordKey="id"
            columns={instanceColumns}
            addons={[
              autotip({
                emptyText: '暂无数据',
              }),
            ]}
          />
        </Form.Item>
      </Form>
      <Modal visible={eventVisible} size="l" caption="实例事件" onClose={() => eventToggle()}>
        <Modal.Body>
          <Event eventList={eventList} />
        </Modal.Body>
        <Modal.Footer>
          <Button type="primary" onClick={() => eventToggle()}>
            确定
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal visible={modifyVisible} size="l" caption="修改" onClose={() => modifyToggle()}>
        <Modal.Body>
          <Form>
            <Form.Item
              required
              label={t('权重')}
              showStatusIcon={false}
            >
              <InputNumber
                defaultValue={showWeight}
                step={1}
                min={0}
                max={100}
                onChange={value => setModifiedWeight(value)}
              />
            </Form.Item>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="primary" onClick={
            async () => {
              const newestPolaris = await fetchPolaris({ clusterId, namespaceId, ruleName });
              if (newestPolaris) {
                newestPolaris.spec.parameters.weight = modifiedWeight.toString();
                const result = await modifyPolaris({ clusterId, namespaceId, ruleName, polarisData: newestPolaris });
                if (result) {
                  setShowWeight(modifiedWeight);
                  modifyToggle();
                }
              }
            }}
          >
            确定
          </Button>
          <Button onClick={() => modifyToggle()}>
            取消
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});

export default PolarisBasicTab;
