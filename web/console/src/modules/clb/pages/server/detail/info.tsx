/**
 * 服务器组详情页 - 基本信息
 * 可以修改权重
 */
import React from 'react';
import { Button, Form, InputNumber, List, Table } from '@tencent/tea-component';

import { BackendsGroupInfo } from './index';
import { changeWeightForBackendsGroup } from '../../../services/api';
const { isEqual, isEmpty, pick } = require('lodash');

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

  backendsGroup: BackendsGroupInfo;

  mode: string;

  weight: number;
}

const convert = backendsGroupInfo => {
  if (isEmpty(backendsGroupInfo)) {
    return {
      name: '',
      namespace: '',
      parameters: { },
      pods: {},
      loadBalancers: [],
      podChoice: '',
    };
  }
  let {
    metadata: { name, namespace },
    spec: { parameters, pods, loadBalancers },
  } = backendsGroupInfo;
  let data = {
    name,
    namespace,
    parameters,
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
    backendsGroup: convert(this.props.backendsGroupInfo),
    mode: 'view', // view: 查看，edit：编辑
    weight: 100,
  };

  componentDidMount() {
    // this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name, backendsGroup } = this.state;
    let nextBackendsGroup = convert(nextProps.backendsGroupInfo);

    if (
      !isEqual(nextProps.clusterName, clusterName) ||
      !isEqual(nextProps.namespace, namespace) ||
      !isEqual(nextProps.name, name) ||
      !isEqual(nextBackendsGroup, backendsGroup)
    ) {
      let {
        parameters: { weight },
      } = nextBackendsGroup;
      this.setState({
        clusterName: nextProps.clusterName,
        namespace: nextProps.namespace,
        name: nextProps.name,
        // backendsGroupInfo: nextProps.backendsGroupInfo,
        backendsGroup: nextBackendsGroup,
        weight: Number(weight),
      });
    }
  }

  handleEditWeight = async () => {
    this.setState({ mode: 'edit' });
  };

  handleWeightChanged = value => {
    this.setState({ weight: value });
  };

  handleSubmitWeight = async () => {
    let { clusterName, namespace, backendsGroup, weight } = this.state;
    let response = await changeWeightForBackendsGroup(clusterName, namespace, backendsGroup.name, { weight });
    if (response.code === 0 && response.message === 'OK') {
      let nextBackendsGroup = { ...backendsGroup };
      nextBackendsGroup.parameters.weight = String(weight);
      this.setState({ mode: 'view', backendsGroup: nextBackendsGroup });
    }
  };

  render = () => {
    let { clusterName, backendsGroup, mode, weight } = this.state;
    // let backendsGroup = convert(backendsGroupInfo);
    let { name, namespace, loadBalancers, podChoice, pods } = backendsGroup;
    let { byLabel = {}, byName = [], ports = [] } = pods;
    let { selector = {}, except = [] } = byLabel;

    return (
      <div>
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
                    <p key={item}>{item}={selector[item]}</p>
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
        <Form layout="inline" style={{ marginTop: 16 }}>
          <Form.Item label="权重">
            {mode === 'view' ? (
              <Form.Text>
                {backendsGroup.parameters.weight}
              </Form.Text>
            ) : (
              <InputNumber
                value={weight}
                onChange={this.handleWeightChanged}
              />
            )}
          </Form.Item>
          <Form.Action>
            {mode === 'view' ? (
              <Button type="primary" onClick={this.handleEditWeight}>
                修改权重
              </Button>
            ) : (
              <>
                <Button type="primary" onClick={this.handleSubmitWeight}>
                  保存
                </Button>
                <Button
                  onClick={() => {
                    this.setState({ mode: 'view' });
                  }}
                >
                  取消
                </Button>
              </>
            )}
          </Form.Action>
        </Form>
      </div>
    );
  };
}

export { InfoPanel };
