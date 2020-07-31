/**
 * CLB 规则列表页
 */
import React from 'react';
import {
  Alert,
  Button,
  Card,
  ContentView,
  Drawer,
  Form,
  Justify,
  List,
  Modal,
  Select,
  Table,
  Text,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { injectable } from '@tencent/tea-component/lib/table/addons/injectable';
import {
  getAllClusters,
  getRuleList,
  getNamespacesByProject,
  getNamespacesByCluster,
  createRule,
  removeRule,
} from '../../services/api';
import { RuleEditor } from './editor';
import { RuleDetail } from './detail';
import { EventList } from './events';

const { isEmpty, pick } = require('lodash');
const { Body, Header } = ContentView;

interface Project {
  id: string;
  name: string;
}

interface PropTypes {
  projects: Project[];

  context: string; // 业务侧/平台侧
}

export class RuleList extends React.Component<PropTypes> {
  index = 0;

  state = {
    clusters: [], // 平台侧下的集群列表
    isPlatform: this.props.context && this.props.context === 'platform',
    projectId: '', // 当前选中的业务
    clusterName: '', // 选中业务所属的集群
    namespace: '', // 当前选中的命名空间
    namespaces: [], // 命名空间选择器的数据源
    rules: [], // 所选业务和命名空间下的规则列表
    // dialogVisible: false,
    dialogVisible: false,
    alertVisible: false,
    currentItem: {
      name: '', // 规则名称
      isSharedRule: false,
      project: '',
      namespace: '', // 规则所在命名空间
      clusterName: '',
      scope: [], // 共享的命名空间
      lbID: '', // CLB 实例
      useListener: 'new', // 使用监听器
      listener: {
        protocol: '',
        port: '',
        host: '',
        path: '',
      },
    },
    valid: false,
    drawerVisible: false,
    selectedItem: {
      name: '',
    },
    eventsVisible: false,
  };

  componentDidMount() {
    this.state.isPlatform && this.loadData();
  }

  /**
   * 初始化集群列表
   * 仅在平台侧下
   */
  loadData = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters });
    // 缓存处理
    let selectedClusterName = window.localStorage.getItem('selectedClusterName');
    if (clusters.map(item => item.name).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  showModal = visible => {
    this.setState({ dialogVisible: visible });
  };

  showDrawer = visible => {
    this.setState({ drawerVisible: visible });
  };

  showEvents = visible => {
    this.setState({ eventsVisible: visible });
  };

  /**
   * 切换集群的时候更新命名空间列表
   * @param clusterName 集群名称
   */
  handleClusterChanged = async clusterName => {
    // 缓存选择的集群
    window.localStorage.setItem('selectedClusterName', clusterName);

    let namespaces = await getNamespacesByCluster(clusterName);
    let selectedNamespace = window.localStorage.getItem('selectedNamespace');
    this.setState({ clusterName, namespaces }, () => {
      if (namespaces.map(item => item.name).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  getList = async (clusterName, namespace) => {
    let rules = await getRuleList(clusterName, namespace);
    this.setState({ rules });
  };

  /**
   * 增加一个刷新图标按钮用来刷新列表数据
   */
  reloadList = () => {
    let { clusterName, namespace } = this.state;
    if (clusterName && namespace) {
      this.setState({ rules: [] }, () => {
        this.getList(clusterName, namespace);
      });
    }
  };

  /**
   * 切换业务的时候更新命名空间
   * NOTE: 业务选择器的数据源是从wrapper传过来的
   * @param projectId 业务id
   */
  handleProjectChanged = async projectId => {
    let namespaces = await getNamespacesByProject(projectId);
    this.setState({ projectId, namespaces });
    // 缓存选中的业务下拉列表
    window.localStorage.setItem('selectedProject', projectId);
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleNamespaceChanged = namespace => {
    let { namespaces } = this.state;
    let { clusterName } = namespaces.find(item => item.name === namespace);
    this.setState({ namespace, clusterName }, () => {
      this.getList(clusterName, namespace);
      // 缓存命名空间下拉列表选择
      window.localStorage.setItem('selectedNamespace', namespace);
    });
  };

  handleEditorChanged = ({ values, valid }) => {
    this.setState({ currentItem: { ...values }, valid });
    // setValid(valid);
  };

  handleCancelItem = () => {
    this.showModal(false);
  };

  handleCloseDrawer = () => {
    this.showDrawer(false);
  };

  handleCloseEvents = () => {
    this.showEvents(false);
  };

  stateToPayload = data => {
    let payload = Object.assign(
      {},
      pick(data, ['name', 'namespace', 'lbID']),
      {
        ...data.listener,
        port: Number(data.listener.port),
      },
      { scope: data.isSharedRule ? data.scope : [] }
    );

    return payload;
  };

  handleSubmitItem = async () => {
    let { currentItem } = this.state;
    let { clusterName } = currentItem;

    try {
      let payload = this.stateToPayload(currentItem);
      let response = await createRule(clusterName, payload);
      if (response && response.code === 0 && response.message === 'OK') {
        this.showModal(false);
        this.alertSuccess();
        this.loadData();
      }
    } catch (err) {
      // message.error(err)
    }
  };

  handleNewItem = () => {
    this.setState({
      dialogVisible: true,
      isEdit: false,
      currentItem: {
        name: '', // 规则名称
        isSharedRule: false,
        project: '',
        namespace: '', // 规则所在命名空间
        clusterName: '',
        scope: [], // 共享的命名空间
        lbID: '', // CLB 实例
        useListener: 'new', // 使用监听器
        listener: {
          protocol: '',
          port: '',
          host: '',
          path: '',
        },
      },
    });
  };

  /**
   * 查看规则详情
   * @param item
   */
  handleViewItem = item => {
    return e => {
      this.setState({ selectedItem: item, drawerVisible: true });
    };
  };

  /**
   * 查看该条规则的事件
   * @param item
   */
  handleViewEvents = item => {
    return e => {
      this.setState({ selectedItem: item, eventsVisible: true });
    };
  };

  alertSuccess = () => {
    this.setState({ alertVisible: true });
  };

  close = () => {
    let { clusterName, namespace } = this.state;
    this.setState({ alertVisible: false });
    this.getList(clusterName, namespace);
  };

  handleRemoveItem = async rule => {
    let { clusterName, namespace } = this.state;
    let { name: ruleName } = rule;
    let response = await removeRule(clusterName, namespace, ruleName);
    if (response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  render() {
    let {
      projectId,
      clusters,
      clusterName,
      namespace,
      namespaces,
      rules,
      dialogVisible,
      alertVisible,
      currentItem,
      isPlatform,
      drawerVisible,
      eventsVisible,
      selectedItem,
    } = this.state;
    let { projects, context } = this.props;
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    let namespaceList = namespaces.map(({ name }) => ({
      value: name,
      text: name,
    }));

    let renderOperationColumn = () => {
      return item => {
        return (
          <>
            <Button type="link" onClick={this.handleViewItem(item)}>
              <strong>详情</strong>
            </Button>
            <Button type="link" onClick={this.handleViewEvents(item)}>
              <strong>事件</strong>
            </Button>
            <Button
              disabled={item.share && namespace !== 'kube-system'}
              type="link"
              onClick={() => {
                this.handleRemoveItem(item);
              }}
            >
              <strong>删除</strong>
            </Button>
          </>
        );
      };
    };

    return (
      <ContentView>
        <Header title="CLB规则" />
        <Body>
          <Alert defaultVisible type="info">
            <h4 style={{ marginBottom: 8 }}>提示</h4>
            <p>删除规则会导致规则下所有容器被解绑</p>
            <p>规则创建后，还需在<Text theme="warning">CLB管理 --&gt; 服务器组</Text>页面中将规则与服务器组相关联</p>
          </Alert>
          <Table.ActionPanel>
            <Justify
              left={
                <Button type="primary" onClick={this.handleNewItem}>
                  新建
                </Button>
              }
              right={
                <Form layout="inline">
                  {isPlatform ? (
                    <Form.Item align="middle" label="集群">
                      <Select
                        searchable
                        boxSizeSync
                        size="l"
                        type="simulate"
                        appearence="button"
                        options={clusterList}
                        value={clusterName}
                        onChange={value => this.handleClusterChanged(value)}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item align="middle" label="业务">
                      <Select
                        searchable
                        boxSizeSync
                        size="m"
                        type="simulate"
                        appearence="button"
                        options={projectList}
                        value={projectId}
                        onChange={value => this.handleProjectChanged(value)}
                      />
                    </Form.Item>
                  )}
                  <Form.Item align="middle" label="命名空间">
                    <Select
                      searchable
                      boxSizeSync
                      size="m"
                      type="simulate"
                      appearence="button"
                      options={namespaceList}
                      value={namespace}
                      onChange={value => this.handleNamespaceChanged(value)}
                    />
                    <Button icon="refresh" onClick={this.reloadList} />
                  </Form.Item>
                </Form>
              }
            />
          </Table.ActionPanel>
          <Card>
            <Card.Body>
              <Table
                verticalTop
                disableTextOverflow={true}
                records={rules}
                recordKey="name"
                columns={[
                  {
                    key: 'name',
                    header: '规则名称',
                    render: rule => (
                      <Button type="link" onClick={this.handleViewItem(rule)}>
                        {rule.name}
                      </Button>
                    ),
                  },
                  {
                    key: 'type',
                    header: '网络类型',
                    render: rule => <p>{rule.type === 'OPEN' ? '公网' : '内网'}</p>,
                  },
                  {
                    key: 'vip',
                    header: 'VIP',
                  },
                  {
                    key: 'port',
                    header: '端口',
                    render: rule => (
                      <Text>
                        {rule.protocol}:{rule.port}
                      </Text>
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
                  {
                    key: 'backendGroups',
                    header: '服务器组',
                    render: rule => (
                      <List>
                        {rule.backendGroups.map(item => (
                          <List.Item key={item.name}>{`${item.namespace}/${item.name}`}</List.Item>
                        ))}
                      </List>
                    ),
                  },
                  {
                    key: 'settings',
                    header: '操作',
                    render: renderOperationColumn(),
                  },
                ]}
                addons={[
                  autotip({
                    emptyText: '暂无数据',
                  }),
                  // vip字段为空表示规则创建失败，需要进行强调以引起用户关注，并引导用户进行处理（比如查看事件）
                  injectable({
                    row: (props, context) => ({
                      style: {
                        ...(props.style || {}),
                        background: isEmpty(context.record.vip) ? '#ffcaca' : undefined,
                      },
                    }),
                  }),
                ]}
              />
              <Modal visible={dialogVisible} caption="新建CLB规则" onClose={this.handleCancelItem} size="l">
                <Modal.Body>
                  <RuleEditor
                    projects={projects}
                    value={currentItem}
                    onChange={this.handleEditorChanged}
                    context={this.props.context}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button type="primary" disabled={!this.state.valid} onClick={this.handleSubmitItem}>
                    确定
                  </Button>
                  <Button type="weak" onClick={this.handleCancelItem}>
                    取消
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
              <Drawer
                visible={drawerVisible}
                title="规则详情"
                onClose={this.handleCloseDrawer}
                size="l"
                footer={<Button onClick={this.handleCloseDrawer}>关闭</Button>}
              >
                <RuleDetail clusterName={clusterName} namespace={namespace} ruleName={selectedItem.name} />
              </Drawer>
              <Drawer
                visible={eventsVisible}
                title="规则事件"
                subtitle={`${clusterName}/${namespace}/${selectedItem.name}`}
                onClose={this.handleCloseEvents}
                size="l"
                footer={
                  <Button type="primary" onClick={this.handleCloseEvents}>
                    确定
                  </Button>
                }
              >
                <EventList clusterName={clusterName} namespace={namespace} ruleName={selectedItem.name} />
              </Drawer>
            </Card.Body>
          </Card>
        </Body>
      </ContentView>
    );
  }
}
