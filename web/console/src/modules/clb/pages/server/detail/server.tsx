/**
 * 服务器组详情页 - 服务器
 * 主要使用两个接口，一个通过规则名称获取规则详情，一个通过服务器组名称和clb规则名称获取服务器信息
 */
import React from 'react';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Button, Card, Form, List, Modal, SelectMultiple, Table } from '@tencent/tea-component';
import {
  getBackendsInfo,
  changeRulesForBackendsGroup,
  getNamespacesByCluster,
  getRuleList,
  modifyRuleNamespace,
} from '../../../services/api';
import { BackendsGroupInfo } from './index';
import { EventList } from './events';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable, selectable } = Table.addons;

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

interface ItemType {
  namespace: string;

  serverId: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  backends: BackendType[];

  selectedItem: ItemType;

  eventsVisible: boolean;

  alertVisible: boolean;

  mode: string;

  rules: RuleInfo[];

  loadBalancers: string[]; // 选中的规则
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
    selectedItem: {
      namespace: '',
      serverId: '',
    },
    eventsVisible: false,
    alertVisible: false,
    mode: 'view', // view: 查看，edit：编辑
    rules: [],
    loadBalancers: [],
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
    this.setState({ backends });
  };

  changeRules = async payload => {
    let { clusterName, namespace, name } = this.state;
    // let payload = {
    //   op: 'ADD',
    //   rules: ['ns-a', 'ns-b'],
    // };
    let response = await changeRulesForBackendsGroup(clusterName, namespace, name, payload);
    if (response && response.code === 0 && response.message === 'OK') {
      // this.showDrawer(false);
      this.alertSuccess();
      this.loadData();
    }
  };

  removeRule = ruleName => {
    return async () => {
      let payload = {
        op: 'DELETE',
        rules: [ruleName],
      };
      await this.changeRules(payload);
    };
  };

  getRuleList = async (clusterName, namespace) => {
    let rules = await getRuleList(clusterName, namespace);
    this.setState({ rules });
  };

  handleEditRules = () => {
    let { clusterName, namespace } = this.state;
    this.getRuleList(clusterName, namespace);
    this.setState({ mode: 'edit' });
  };

  handleSubmitRules = async () => {
    let { loadBalancers } = this.state;
    let payload = {
      op: 'ADD',
      rules: loadBalancers,
    };
    await this.changeRules(payload);
    // if (response && response.code === 0 && response.message === 'OK') {
    //   this.setState({ mode: 'view' }, () => {
    //     this.loadData();
    //   });
    // }
  };

  handleLoadbanlancersChanged = value => {
    this.setState({ loadBalancers: value });
  };

  showEvents = visible => {
    this.setState({ eventsVisible: visible });
  };

  handleViewEvents = (namespace, serverId) => {
    return e => {
      this.setState({ selectedItem: { namespace, serverId }, eventsVisible: true });
    };
  };

  handleCloseEvents = () => {
    this.showEvents(false);
  };

  alertSuccess = () => {
    this.setState({ alertVisible: true });
  };

  close = () => {
    let { clusterName, namespace } = this.state;
    this.setState({ alertVisible: false }, () => {
      // 重新加载数据，也需要加一个刷新按钮哦
      this.loadData();
    });
  };

  render = () => {
    let { clusterName, backends, eventsVisible, selectedItem, alertVisible, rules, mode, loadBalancers } = this.state;

    return (
      <div>
        <Card>
          <Card.Body
            title="规则列表"
            operation={
              <Button
                icon="refresh"
                onClick={() => {
                  this.setState({ backends: [] }, () => {
                    this.loadData();
                  });
                }}
              />
            }
          >
            {/*<List>*/}
            {/*  {backends.map(item => (*/}
            {/*    <List.Item key={item.rule.name}>{item.rule.name}</List.Item>*/}
            {/*  ))}*/}
            {/*</List>*/}
            <Form style={{ marginBottom: 16 }}>
              <Form.Item label="服务器组跟以下规则相关联">
                {mode === 'view' ? (
                  <Table
                    compact
                    bordered
                    hideHeader
                    verticalTop
                    records={backends.map(({ rule }) => ({ name: rule.name }))}
                    recordKey="name"
                    columns={[
                      {
                        key: 'name',
                        header: 'name',
                      },
                    ]}
                    addons={[
                      autotip({
                        emptyText: '暂无数据',
                      }),
                    ]}
                  />
                ) : (
                  <Table
                    verticalTop
                    compact
                    rowDisabled={record => backends.map(item => item.rule.name).includes(record.name)}
                    records={rules}
                    recordKey="name"
                    columns={[
                      {
                        key: 'name',
                        header: '规则名称',
                      },
                      {
                        key: 'type',
                        header: '网络类型',
                        render: rule => <p>{rule.type === 'OPEN' ? '公网' : '内网'}</p>
                      },
                      {
                        key: 'vip',
                        header: 'VIP',
                      },
                      {
                        key: 'port',
                        header: '端口',
                        render: rule => (
                          <p>
                            {rule.protocol}:{rule.port}
                          </p>
                        ),
                      },
                      {
                        key: 'host',
                        header: 'Host',
                      },
                      {
                        key: 'path',
                        header: 'Path',
                      },
                    ]}
                    addons={[
                      autotip({
                        emptyText: '暂无数据',
                      }),
                      selectable({
                        // 选框放在「消息类型」列上
                        targetColumnKey: 'name',
                        // 禁用全选
                        all: false,
                        // 已选中的键值
                        value: loadBalancers,
                        // // 选中键值发生变更
                        onChange: this.handleLoadbanlancersChanged,
                      }),
                    ]}
                  />
                )}
              </Form.Item>
            </Form>
            <Form.Action>
              {mode === 'view' ? (
                <Button type="primary" onClick={this.handleEditRules}>
                  增加关联
                </Button>
              ) : (
                <>
                  <Button type="primary" onClick={this.handleSubmitRules}>
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
          </Card.Body>
        </Card>
        {backends.map(item => {
          let {
            rule: { name, namespace, clbName, clbID, type, vip, protocol, port, host, path },
            servers,
          } = item;
          // let serverList = servers;
          // try {
          //   serverList = servers.map(({ id, status, addr }) => ({ id, status, address: JSON.parse(addr) }));
          // } catch (error) {
          //   console.log('json error = ', error);
          // }
          return (
            <Card key={name}>
              <Card.Body
                title={`${name}`}
                operation={
                  <Button type="link" disabled={backends.length <= 1} onClick={this.removeRule(item.rule.name)}>
                    解除关联
                  </Button>
                }
              >
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
                    <Form.Text>{type === 'OPEN' ? '公网' : '内网'}</Form.Text>
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
                          // render: (item) => `${item['address']['eIP']}:${item['address']['port']}`,
                        },
                        {
                          key: 'status',
                          header: '状态',
                        },
                        {
                          key: 'settings',
                          header: '操作',
                          render: record => {
                            return (
                              <Button type="link" onClick={this.handleViewEvents(namespace, record.id)}>
                                <strong>事件</strong>
                              </Button>
                            );
                          },
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
          );
        })}
        <Modal visible={eventsVisible} caption="服务器事件" onClose={this.handleCloseEvents} size="l">
          <Modal.Body>
            <EventList clusterName={clusterName} namespace={selectedItem.namespace} serverId={selectedItem.serverId} />
          </Modal.Body>
          <Modal.Footer>
            <Button type="primary" onClick={this.handleCloseEvents}>
              确定
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal visible={alertVisible} disableCloseIcon onClose={this.close}>
          <Modal.Body>
            <Modal.Message icon="success" message="操作成功" description="列表将自动刷新" />
          </Modal.Body>
          <Modal.Footer>
            <Button type="primary" onClick={this.close}>
              确定
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  };
}

export { ServerPanel };
