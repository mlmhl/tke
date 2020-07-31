/**
 * 服务器组详情页 - 服务器
 * 主要使用两个接口，一个通过规则名称获取规则详情，一个通过服务器组名称和clb规则名称获取服务器信息
 */
import React from 'react';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Button, Card, Form, SelectMultiple, Table } from '@tencent/tea-component';
import { getRuleInfo, getBackendsInfo } from '../../../services/api';
import { BackendsGroupInfo } from './index';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

interface Project {
  id: string;
  name: string;
}

interface BackendGroup {
  name: string;

  namespace: string;
}

// 服务器
interface ServerType {
  id: string;

  addr: string; // json string: { ip: '', port: 80 }

  status: string;
}

// 规则
interface RuleInfo {
  name: string; // 规则名称

  namespace: string; // 规则所在命名空间

  share: boolean; // 是否是可共享规则

  type: string; // 类型

  scope: string[]; // 共享的命名空间

  clbID: string; // CLB 实例

  clbName: string;

  vip: string;

  port: string;

  protocol: string;

  host: string;

  path: string;

  backendGroups?: BackendGroup[];
}

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧

  backendsGroupInfo: BackendsGroupInfo;
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface BackendType {
  rule: RuleInfo;

  servers: ServerType[];
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  backends: BackendType[];
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

class ServerPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,
    backends: [],
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name } = this.state;

    if (
      !isEqual(nextProps.clusterName, clusterName) ||
      !isEqual(nextProps.namespace, namespace) ||
      !isEqual(nextProps.name, name)
    ) {
      this.setState(
        { clusterName: nextProps.clusterName, namespace: nextProps.namespace, name: nextProps.name },
        () => {
          if (nextProps.clusterName && nextProps.namespace && nextProps.name) {
            this.loadData();
          }
        }
      );
    }
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    await this.getBackendsInfo();
  };

  getBackendsInfo = async () => {
    let { clusterName, namespace, name } = this.state;
    let backends = await getBackendsInfo(clusterName, namespace, name);
    // let backends = backendsInfo.map(({ rule, servers }) => ({
    //   serverId: item.metadata.name,
    //   serverAddress: item.status.backendAddr,
    //   status: `${item.status.conditions[0]['type']}:${item.status.conditions[0]['status']}`,
    // }));
    this.setState({ backends });
  };

  render = () => {
    let { clusterName, backends } = this.state;
    // let backendsGroup = convert(backendsGroupInfo);
    // let { name, namespace, loadBalancers = [] } = backendsGroup;

    return (
      <div>
        {backends.map(({ rule: { name, namespace, clbName, clbID, type, vip, protocol, port, host, path }, servers }) => (
          <Card key={name}>
            <Card.Body title={`规则名称 - ${name}`}>
              <Form>
                <Form.Item label="命名空间">
                  <Form.Text>{namespace}</Form.Text>
                </Form.Item>
                <Form.Item label="规则名称">
                  <Form.Text>{name}</Form.Text>
                </Form.Item>
                <Form.Item label="CLB名称">
                  <Form.Text>{clbName}</Form.Text>
                </Form.Item>
                <Form.Item label="CLB ID">
                  <Form.Text>{clbID}</Form.Text>
                </Form.Item>
                <Form.Item label="网络类型">
                  <Form.Text>{type}</Form.Text>
                </Form.Item>
                <Form.Item label="VIP">
                  <Form.Text>{vip}</Form.Text>
                </Form.Item>
                <Form.Item label="端口号">
                  <Form.Text>
                    {protocol}:{port}
                  </Form.Text>
                </Form.Item>
                <Form.Item label="Host">
                  <Form.Text>{host}</Form.Text>
                </Form.Item>
                <Form.Item label="Path">
                  <Form.Text>{path}</Form.Text>
                </Form.Item>
                <Form.Item label="服务器">
                  <Table
                    compact
                    verticalTop
                    disableTextOverflow
                    records={servers}
                    recordKey="id"
                    columns={[
                      {
                        key: 'id',
                        header: '服务器ID',
                      },
                      {
                        key: 'addr',
                        header: '服务器地址',
                      },
                      {
                        key: 'status',
                        header: '状态',
                      },
                    ]}
                    addons={[
                      autotip({
                        emptyText: '暂无数据',
                      }),
                    ]}
                  />
                </Form.Item>
              </Form>
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };
}

export { ServerPanel };
