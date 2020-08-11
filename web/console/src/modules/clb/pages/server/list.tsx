import React, { useState, useEffect } from 'react';
import {
  Bubble,
  Card,
  ContentView,
  Drawer,
  Form,
  Justify,
  List,
  Modal,
  PopConfirm,
  Select,
  Table,
  Text,
  Button,
} from '@tencent/tea-component';
import {
  expandable,
  ExpandableAddonOptions,
  filterable,
  FilterableConfig,
  FilterOption,
  radioable,
  RadioableOptions,
  scrollable,
  ScrollableAddonOptions,
  selectable,
  SelectableOptions,
  sortable,
  SortBy,
  stylize,
  StylizeOption,
} from '@tencent/tea-component/lib/table/addons';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { BackendsGroupEditor } from './editor';
import { ServerDetail } from './detail';
import {
  createBackendsGroup,
  getAllClusters,
  getBackendsList,
  getNamespacesByCluster,
  getNamespacesByProject,
  removeBackendsGroup,
} from '../../services/api';
import {
  getClusterCache,
  setClusterCache,
  getProjectCache,
  setProjectCache,
  getNamespaceCache,
  setNamespaceCache,
} from '../../helpers/util';

const { isEqual, at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
const { Body, Header } = ContentView;

const convert = item => ({
  name: get(item, 'metadata.name', stubString()), // 取值
  type: findKey(
    { pods: has(item, 'spec.pods'), service: has(item, 'spec.service'), static: has(item, 'spec.static') },
    item => item
  ), // 通过path是否存在判断消息内容的类型
  backends: get(item, 'status.backends', 0),
  registeredBackends: get(item, 'status.registeredBackends', 0),
  relatedRules: get(item, 'spec.loadBalancers', []),
  // relatedRules: get(item, 'spec.lbName') ? 1 : max([get(item, 'spec.loadBalancers', []).length, 0]), // 两个路径的对象会且只会存在一个，取出它的值来
  confirmVisible: item.confirmVisible,
});

interface Project {
  id: string;
  name: string;
}

interface PropTypes {
  projects: Project[];

  context: string; // 业务侧/平台侧
}

export class ServerList extends React.Component<PropTypes> {
  state = {
    clusters: [], // 平台侧下的集群列表
    isPlatform: this.props.context && this.props.context === 'platform',
    projects: this.props.projects,
    projectId: '',
    clusterName: '',
    namespace: '', // 当前选中的命名空间（给接口使用）
    namespaceValue: '', // 当前选中的命名空间的全名（给组件使用）
    namespaces: [],
    backendGroups: [],
    alertVisible: false,
    dialogVisible: false,
    drawerVisible: false,
    detailVisible: false,
    selectedItem: {
      name: '',
    },
    valid: false,
    currentItem: {
      clusterName: '',
      namespace: '',
    },
  };

  componentDidMount() {
    this.state.isPlatform && this.loadData();
  }

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
   * 在平台侧时，获取全部集群列表
   */
  loadData = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters }, () => {
      this.getCache();
    });
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

  /**
   * 切换业务的时候更新命名空间
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
   * 获取服务器组列表数据
   */
  getList = async (clusterName, namespace) => {
    // let { namespaces } = this.state;
    // let namespaceItem = namespaces.find(item => (this.state.isPlatform ? item.name : item.fullName) === namespaceValue);
    // // TODO: 注意这个地方的 namespaceValue 和 namespaceName 是不一样的，在平台侧和业务侧下面
    // let { name: namespacenName } = namespaceItem;
    let backendGroups = await getBackendsList(clusterName, namespace);
    this.setState({
      backendGroups: backendGroups.map(item => convert(item)).map(item => ({ ...item, confirmVisible: false })),
    });
  };

  reloadList = () => {
    let { clusterName, namespace } = this.state;
    if (clusterName && namespace) {
      this.setState({ backendGroups: [] }, () => {
        this.getList(clusterName, namespace);
      });
    }
  };

  showModal = visible => {
    this.setState({ dialogVisible: visible });
  };

  showDrawer = visible => {
    this.setState({ drawerVisible: visible });
  };

  /**
   * 切换命名空间的时候更新列表页数据
   * 注意要兼容业务侧和平台侧两种情况
   * @param namespace
   */
  handleNamespaceChanged = namespaceValue => {
    setNamespaceCache(namespaceValue, this.state.isPlatform);
    let { namespaces } = this.state;
    let namespaceItem = namespaces.find(item => (this.state.isPlatform ? item.name : item.fullName) === namespaceValue);
    if (namespaceItem) {
      // 注意这里区分了namespaceName和namespaceValue，就是在业务侧下，namespaceName是ns的名称，namespaceValue是其fullName
      let { clusterName, name: namespace } = namespaceItem;
      this.setState({ namespace, namespaceValue, clusterName }, () => {
        this.getList(clusterName, namespace);
      });
    }
  };

  handleCancelItem = () => {
    this.showModal(false);
  };

  handleCloseDrawer = () => {
    this.showDrawer(false);
  };

  handleCloseDetail = () => {
    this.setState({ detailVisible: false });
  };

  handleEditorChanged = ({ values, valid }) => {
    this.setState({ currentItem: { ...values }, valid });
    // setValid(valid);
  };

  stateToPayload = values => {
    let { clusterName, name, namespace, loadBalancers, ports, podChoice, byLabel, byName, parameters } = values;
    if (!this.state.isPlatform) {
      namespace = namespace.replace(new RegExp(`^${clusterName}-`), '');
    }
    let pods = Object.assign({}, podChoice === 'byLabel' ? { byLabel } : { byName: byName.map(item => item.name) }, {
      ports: ports.map(({ protocol, port }) => ({ protocol, port })),
    });
    let payload = {
      apiVersion: 'lbcf.tkestack.io/v1beta1',
      kind: 'BackendGroup',
      metadata: { name: `clb-${name}`, namespace },
      spec: {
        loadBalancers,
        pods,
        parameters: {
          weight: String(parameters.weight),
        },
      },
    };

    return payload;
  };

  alertSuccess = () => {
    this.setState({ alertVisible: true });
  };

  close = () => {
    let { clusterName, namespace } = this.state;
    this.setState({ alertVisible: false });
    if (clusterName && namespace) {
      this.getList(clusterName, namespace);
    }
  };

  handleSubmitItem = async () => {
    let { currentItem } = this.state;
    let { clusterName, namespace } = currentItem;
    if (!this.state.isPlatform) {
      namespace = namespace.replace(new RegExp(`^${clusterName}-`), '');
    }

    try {
      let payload = this.stateToPayload(currentItem);
      let response = await createBackendsGroup(clusterName, namespace, payload);
      if (response && response.code === 0 && response.message === 'OK') {
        this.showDrawer(false);
        this.alertSuccess();
        this.loadData();
      }
    } catch (err) {
      // message.error(err)
    }
  };

  handleNewItem = () => {
    this.setState({
      drawerVisible: true,
      currentItem: {
        clusterName: '',
        namespace: '',
      },
    });
  };

  /**
   * 查看服务器组详情
   * @param item
   */
  handleViewItem = item => {
    return e => {
      this.setState({ selectedItem: item, detailVisible: true });
    };
  };

  handleRemoveItem = async item => {
    let { clusterName, namespace } = this.state;
    let { name } = item;
    let response = await removeBackendsGroup(clusterName, namespace, name);
    if (response && response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  render() {
    let {
      projectId,
      clusterName,
      clusters,
      namespace,
      namespaceValue,
      namespaces,
      backendGroups,
      dialogVisible,
      drawerVisible,
      detailVisible,
      alertVisible,
      currentItem,
      isPlatform,
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
        let { clusterName, clusterDisplayName, namespace } = item;
        if (!accu[clusterName]) {
          accu[clusterName] = clusterDisplayName;
        }
        return accu;
      }, {});
    }

    let setConfirmVisible = (currentItem, confirmVisible) => {
      let newList = backendGroups.map(item => ({ ...item }));
      let target = newList.filter(item => item.name === currentItem.name)[0];
      if (target) {
        target.confirmVisible = confirmVisible;
        this.setState({ backendGroups: newList });
      }
    };

    let renderOperationColumn = () => {
      return currentItem => {
        return (
          <>
            <Button type="link" onClick={this.handleViewItem(currentItem)}>
              <strong>详情</strong>
            </Button>
            <PopConfirm
              title="确定要删除该记录？"
              visible={currentItem.confirmVisible}
              onVisibleChange={confirmVisible => {
                setConfirmVisible(currentItem, confirmVisible);
              }}
              footer={
                <>
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
              <Button type="link">
                <strong>删除</strong>
              </Button>
            </PopConfirm>
          </>
        );
      };
    };

    return (
      <ContentView>
        <Header title="CLB服务器组" />
        <Body>
          <Table.ActionPanel>
            <Justify
              left={
                <Bubble placement="right">
                  <Button type="primary" onClick={this.handleNewItem}>
                    新建
                  </Button>
                </Bubble>
              }
              right={
                <Form layout="inline">
                  {isPlatform ? (
                    <Form.Item label="集群">
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
                    <Form.Item label="业务">
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
                records={backendGroups}
                recordKey="name"
                columns={[
                  {
                    key: 'name',
                    header: '名称',
                    render: backendGroup => (
                      <Button type="link" onClick={this.handleViewItem(backendGroup)}>
                        {backendGroup.name}
                      </Button>
                    ),
                  },
                  {
                    key: 'type',
                    header: '类型',
                  },
                  {
                    key: 'backends',
                    header: '服务器数量',
                    align: 'right',
                  },
                  {
                    key: 'registeredBackends',
                    header: '已绑定数量',
                    align: 'right',
                  },
                  {
                    key: 'relatedRules',
                    header: '关联规则',
                    render: ({ relatedRules = [] }) => (
                      <List>
                        {relatedRules.map(item => (
                          <List.Item key={item}>{item}</List.Item>
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
                ]}
              />
              <Modal visible={drawerVisible} caption="新建服务器组" onClose={this.handleCloseDrawer} size="l">
                <Modal.Body>
                  <BackendsGroupEditor
                    projects={projects}
                    context={this.props.context}
                    // value={currentItem}
                    onChange={this.handleEditorChanged}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button type="primary" disabled={!this.state.valid} onClick={this.handleSubmitItem}>
                    确定
                  </Button>
                  <Button type="weak" onClick={this.handleCloseDrawer}>
                    取消
                  </Button>
                </Modal.Footer>
              </Modal>
              <Drawer
                visible={detailVisible}
                title="服务器组详情"
                onClose={this.handleCloseDetail}
                size="l"
                footer={
                  <>
                    <Button type="primary" onClick={this.handleCloseDetail}>
                      关闭
                    </Button>
                  </>
                }
              >
                <ServerDetail
                  context={this.props.context}
                  clusterName={clusterName}
                  namespace={namespace}
                  name={selectedItem.name}
                />
              </Drawer>
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
            </Card.Body>
          </Card>
        </Body>
      </ContentView>
    );
  }
}
