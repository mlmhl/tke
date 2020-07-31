/**
 * 服务器组详情页 - 基本信息
 */
import React from 'react';
import { Button, Card, Form, Input, List, Radio, Select, Table } from '@tencent/tea-component';

import { Field, Form as FinalForm } from 'react-final-form';
import { createBackendsGroup, getBackendsGroupInfo } from '../../../services/api';
import { Selector } from '@src/modules/clb/pages/server/components/Selector';
import { Ports } from '@src/modules/clb/pages/server/components/Ports';
import { Names } from '@src/modules/clb/pages/server/components/Names';
import { BackendsGroupInfo } from './index';
const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'http' },
  { text: 'TCP', value: 'tcp' },
  { text: 'UDP', value: 'udp' },
];

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧

  backendsGroupInfo: BackendsGroupInfo;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  // podChoice: string; // 选择Pod
}

const convert = backendsGroupInfo => {
  if (isEmpty(backendsGroupInfo)) {
    return {
      name: '',
      namespace: '',
      pods: {},
      loadBalancers: [],
      podChoice: '',
    };
  }
  let {
    metadata: { name, namespace },
    spec: { pods, loadBalancers },
  } = backendsGroupInfo;
  let data = {
    name,
    namespace,
    pods,
    loadBalancers,
    podChoice: isEmpty(pods.byLabel) ? 'byName' : 'byLabel',
  };
  return data;
};

class InfoPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,
  };

  componentDidMount() {
    // this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name, backendsGroupInfo } = this.state;

    if (
      !isEqual(nextProps.clusterName, clusterName) ||
      !isEqual(nextProps.namespace, namespace) ||
      !isEqual(nextProps.name, name) ||
      !isEqual(nextProps.backendsGroupInfo, backendsGroupInfo)
    ) {
      this.setState({
        clusterName: nextProps.clusterName,
        namespace: nextProps.namespace,
        name: nextProps.name,
        backendsGroupInfo: nextProps.backendsGroupInfo,
      });
    }
  }

  render = () => {
    let { clusterName, backendsGroupInfo } = this.state;
    let backendsGroup = convert(backendsGroupInfo);
    let { name, namespace, loadBalancers, podChoice, pods } = backendsGroup;
    let { byLabel = {}, byName = [], ports = [] } = pods;
    let { selector = {}, except = [] } = byLabel;

    return (
      <Form>
        <Form.Item label="名称">
          <Form.Text>{name}</Form.Text>
        </Form.Item>
        <Form.Item label="命名空间">
          <Form.Text>{namespace}</Form.Text>
        </Form.Item>
        <Form.Item label="关联规则">
          <List>
            {loadBalancers.map(item => (
              <List.Item key={item}>
                <Form.Text>{item}</Form.Text>
              </List.Item>
            ))}
          </List>
          ),
        </Form.Item>
        {podChoice === 'byLabel' ? (
          <>
            <Form.Item label="Selector">
              <Form.Text>
                {Object.keys(selector).map(item => (
                  <p key={item}>{item}</p>
                ))}
              </Form.Text>
            </Form.Item>
            <Form.Item label="排除Pod">
              <Form.Text>
                {except.map(item => (
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
              },
              {
                key: 'host',
                header: '主机',
              },
              {
                key: 'path',
                header: '路径',
              },
            ]}
            records={ports}
          />
        </Form.Item>
      </Form>
    );
  };
}

export { InfoPanel };
