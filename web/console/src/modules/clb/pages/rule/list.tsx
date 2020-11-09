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
  PopConfirm,
  Select,
  Switch,
  Table,
  Text,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { injectable } from '@tencent/tea-component/lib/table/addons/injectable';

import { Cluster, Project } from '../../models';
import { RuleEditor } from './editor';
import { RuleDetail } from './detail';
import { EventList } from './events';
import {
  getAllClusters,
  getRuleList,
  getNamespacesByProject,
  getNamespacesByCluster,
  createRule,
  removeRule,
} from '../../services/api';
import {
  getClusterCache,
  setClusterCache,
  getProjectCache,
  setProjectCache,
  getNamespaceCache,
  setNamespaceCache,
} from '../../helpers/util';

const { isEqual, isEmpty, pick } = require('lodash');
const { Body, Header } = ContentView;

interface PropTypes {
  projects: Project[];

  context: string; // 业务侧/平台侧
}

export class RuleList extends React.Component<PropTypes> {
  index = 0;

  state = {
    clusters: [], // 平台侧下的集群列表
    isPlatform: this.props.context && this.props.context === 'platform',
    projects: this.props.projects,
    projectId: '', // 当前选中的业务
    clusterName: '', // 选中业务所属的集群
    namespace: '', // 当前选中的命名空间（给接口使用）
    namespaceValue: '', // 当前选中的命名空间的全名（给组件使用）
    namespaces: [], // 命名空间选择器的数据源
    rules: [], // 所选业务和命名空间下的规则列表
    // dialogVisible: false,
    dialogVisible: false,
    alertVisible: false,
    currentItem: {
      name: '', // 规则名称
      shareable: false,
      project: '',
      namespace: '', // 规则所在命名空间
      clusterName: '',
      scope: [], // 共享的命名空间
      lbID: '', // CLB 实例
      useListener: 'new', // 使用监听器
      listener: {
        protocol: '',
        port: '',
      },
      transferRule: {
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
    confirmVisible: false,
    deleteBackendGroup: true,
  };

  componentDidMount() {
    if (this.state.isPlatform) {
      this.loadData();
    } else {
      this.getCache();
    }
  }

  // 在业务侧下，如果projects发生了变化，要重新加载缓存
  componentWillReceiveProps(nextProps, nextContext) {
    const { projects } = this.state;
    if (!isEqual(nextProps.projects, projects)) {
      this.setState({ projects: nextProps.projects }, () => {
        if (nextProps.context && nextProps.context === 'business') {
          this.getCache();
        }
      });
    }
  }

  /**
   * 初始化集群列表
   * 仅在平台侧下
   */
  loadData = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters }, () => {
      this.getCache();
    });
  };

  getCache = () => {
    let { isPlatform, clusters } = this.state;
    if (isPlatform) {
      // 处理缓存的集群选择
      let selectedClusterName = getClusterCache();
      if (clusters.map(item => item.name).includes(selectedClusterName)) {
        this.handleClusterChanged(selectedClusterName);
      }
    } else {
      // 处理缓存的业务选择，注意这里缓存的是业务id
      let { projects } = this.state;
      let selectedProject = getProjectCache();
      if (projects.map(item => item.id).includes(selectedProject)) {
        this.handleProjectChanged(selectedProject);
      }
    }
  };

  /**
   * 切换集群的时候更新命名空间列表
   * @param clusterName 集群名称
   */
  handleClusterChanged = async clusterName => {
    setClusterCache(clusterName);
    let namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, namespaces }, () => {
      let selectedNamespace = getNamespaceCache(this.state.isPlatform);
      if (namespaces.map(item => item.name).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  getList = async (clusterName, namespace) => {
    let rules = await getRuleList(clusterName, namespace);
    // 增加一个属性confirmVisible记录是否显示popconfirm的状态
    this.setState({ rules: rules.map(item => ({ ...item, confirmVisible: false })) });
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
    setProjectCache(projectId);
    let namespaces = await getNamespacesByProject(projectId);
    this.setState({ projectId, namespaces }, () => {
      let selectedNamespace = getNamespaceCache(this.state.isPlatform);
      if (namespaces.map(item => (this.state.isPlatform ? item.name : item.fullName)).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  /**
   * 切换命名空间的时候获取规则列表
   * 注意为了兼容业务侧，命名空间全部改成了使用fullName作为value
   * @param namespace
   */
  handleNamespaceChanged = namespaceValue => {
    setNamespaceCache(namespaceValue, this.state.isPlatform);
    let { namespaces } = this.state;
    let namespaceItem = namespaces.find(item => (this.state.isPlatform ? item.name : item.fullName) === namespaceValue);
    if (namespaceItem) {
      // TODO: 注意这个地方的 namespaceValue 和 namespaceName 是不一样的，在平台侧和业务侧下面
      let { clusterName, name: namespace } = namespaceItem;
      this.setState({ namespace, namespaceValue, clusterName }, () => {
        this.getList(clusterName, namespace);
      });
    }
  };

  handleEditorChanged = ({ values, valid }) => {
    this.setState({ currentItem: { ...values }, valid });
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
    let { clusterName, namespace, lbID } = data;
    if (!this.state.isPlatform) {
      namespace = namespace.replace(new RegExp(`^${clusterName}-`), '');
    }
    let { protocol, port } = data.listener;
    let { host, path } = data.transferRule;
    let payload = Object.assign(
      {},
      { name: data.shareable ? `lbcf-clb-${data.name}` : `clb-${data.name}` },
      { namespace, lbID },
      protocol === 'HTTP' || protocol === 'HTTPS' ? { protocol, port, host, path } : { protocol, port },
      { scope: data.shareable ? data.scope : [] }
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
        // this.loadData();
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
        shareable: false,
        project: '',
        namespace: '', // 规则所在命名空间
        clusterName: '',
        scope: [], // 共享的命名空间
        lbID: '', // CLB 实例
        useListener: 'new', // 使用监听器
        listener: {
          protocol: '',
          port: '',
        },
        transferRule: {
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

  /**
   * 弹出操作结果提示框
   */
  alertSuccess = () => {
    this.setState({ alertVisible: true });
  };

  /**
   * 点击操作结果提示框的关闭按钮，关闭操作结果提示框
   * 这里的操作结果提示是类似于新建/删除等的结果提示，关闭后会刷新规则列表以反映操作的修改
   */
  close = () => {
    let { clusterName, namespace } = this.state;
    this.setState({ alertVisible: false });
    if (clusterName && namespace) {
      this.getList(clusterName, namespace);
    }
  };

  /**
   * 删除规则
   * @param rule 一条规则记录
   */
  handleRemoveItem = async rule => {
    let { clusterName, namespace, deleteBackendGroup } = this.state;
    let { name: ruleName } = rule;
    let response = await removeRule(clusterName, namespace, ruleName, { deleteBackendGroup });
    if (response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  render() {
    let {
      projects,
      projectId,
      clusters,
      clusterName,
      namespace,
      namespaceValue,
      namespaces,
      rules,
      dialogVisible,
      alertVisible,
      currentItem,
      isPlatform,
      drawerVisible,
      eventsVisible,
      selectedItem,
      confirmVisible,
      deleteBackendGroup,
    } = this.state;
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    let namespaceList = [];
    let groups = {};
    if (isPlatform) {
      namespaceList = namespaces.map(({ name, fullName }) => ({
        // value: fullName,
        value: name,
        text: name,
      }));
    } else {
      namespaceList = namespaces.map(({ name, clusterName, fullName }) => ({
        value: fullName,
        groupKey: clusterName,
        text: name,
      }));
      groups = namespaces.reduce((accu, item, index, arr) => {
        let { clusterName, clusterDisplayName } = item;
        if (!accu[clusterName]) {
          accu[clusterName] = `${clusterDisplayName}(${clusterName})`;
        }
        return accu;
      }, {});
    }

    let setConfirmVisible = (currentItem, confirmVisible) => {
      let newRules = rules.map(item => ({ ...item }));
      let target = newRules.filter(item => item.name === currentItem.name)[0];
      if (target) {
        target.confirmVisible = confirmVisible;
        this.setState({ rules: newRules });
      }
    };

    let renderOperationColumn = () => {
      return currentItem => {
        return (
          <>
            <Button type="link" onClick={this.handleViewItem(currentItem)}>
              <strong>详情</strong>
            </Button>
            <Button type="link" onClick={this.handleViewEvents(currentItem)}>
              <strong>事件</strong>
            </Button>
            <PopConfirm
              title="确定要删除规则？"
              visible={currentItem.confirmVisible}
              onVisibleChange={confirmVisible => {
                setConfirmVisible(currentItem, confirmVisible);
              }}
              footer={
                <>
                  <Switch value={deleteBackendGroup} onChange={value => this.setState({ deleteBackendGroup: value })}>
                    同时删除服务器组？
                  </Switch>
                  <Button
                    type="link"
                    onClick={() => {
                      setConfirmVisible(currentItem, false);
                      this.handleRemoveItem(currentItem);
                    }}
                  >
                    删除
                  </Button>
                  <Button
                    type="text"
                    onClick={() => {
                      setConfirmVisible(currentItem, false);
                    }}
                  >
                    取消
                  </Button>
                </>
              }
            >
              <Button disabled={currentItem.share && namespace !== 'kube-system'} type="link">
                <strong>删除</strong>
              </Button>
            </PopConfirm>
          </>
        );
      };
    };

    return (
      <ContentView>
        <Header title="CLB规则" />
        <Body>
          <Alert defaultVisible type="info">
            <h4>提示</h4>
            <List type="bullet">
              <List.Item>删除规则会导致规则下所有容器被解绑</List.Item>
              <List.Item>
                规则创建后，还需在<Text theme="warning">CLB管理 --&gt; 服务器组</Text>页面中将规则与服务器组相关联
              </List.Item>
            </List>
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
                      groups={isPlatform ? undefined : groups}
                      size={isPlatform ? 'm' : 'l'}
                      type="simulate"
                      appearence="button"
                      options={namespaceList}
                      value={namespaceValue}
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
                    // render: rule => (
                    //   <Button type="link" onClick={this.handleViewItem(rule)}>
                    //     {rule.name}
                    //   </Button>
                    // ),
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
