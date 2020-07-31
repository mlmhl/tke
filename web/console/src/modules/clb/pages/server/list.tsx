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

import {
  createBackendsGroup,
  getAllClusters,
  getBackendsList,
  getNamespacesByCluster,
  getNamespacesByProject,
  removeBackendsGroup,
} from '../../services/api';
import { BackendsGroupEditor } from './editor';
import { ServerDetail } from './detail';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
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
    projectId: '',
    clusterName: '',
    namespace: '',
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

  /**
   * 在平台侧时，获取全部集群列表
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

  /**
   * 获取服务器组列表数据
   */
  getList = async (clusterName, namespace) => {
    let backendGroups = await getBackendsList(clusterName, namespace);
    this.setState({ backendGroups });
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
   * 切换业务的时候更新命名空间
   * @param projectId 业务id
   */
  handleProjectChanged = async projectId => {
    let namespaces = await getNamespacesByProject(projectId);
    this.setState({ projectId, namespaces });
  };

  /**
   * 切换命名空间的时候更新列表页数据
   * 注意要兼容业务侧和平台侧两种情况
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
    let { name, namespace, loadBalancers, ports, podChoice, byLabel, byName, parameters } = values;
    let pods = Object.assign({}, podChoice === 'byLabel' ? { byLabel } : { byName: byName.map(item => item.name) }, {
      ports: ports.map(({ protocol, port }) => ({ protocol, port })),
    });
    let payload = {
      apiVersion: 'lbcf.tkestack.io/v1beta1',
      kind: 'BackendGroup',
      metadata: { name, namespace },
      spec: {
        loadBalancers,
        pods,
        // parameters,
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
    this.getList(clusterName, namespace);
  };

  handleSubmitItem = async () => {
    // document.getElementById('backendsGroupForm').dispatchEvent(new Event('submit', { cancelable: true }));
    // this.showDrawer(false);
    let { currentItem } = this.state;
    let { clusterName, namespace } = currentItem;

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

  handleRemoveItem = item => {
    return async () => {
      let { clusterName, namespace } = this.state;
      let { name } = item;
      let response = await removeBackendsGroup(clusterName, namespace, name);
      if (response && response.code === 0 && response.message === 'OK') {
        this.alertSuccess();
      }
    };
  };

  render() {
    let {
      projectId,
      clusterName,
      clusters,
      namespace,
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
    let namespaceList = namespaces.map(({ name }) => ({
      value: name,
      text: name,
    }));
    let backendGroupList = backendGroups.map(item => convert(item));

    let renderOperationColumn = () => {
      return item => {
        return (
          <>
            <Button type="link" onClick={this.handleViewItem(item)}>
              <strong>详情</strong>
            </Button>
            <Button type="link" onClick={this.handleRemoveItem(item)}>
              <strong>删除</strong>
            </Button>
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
                  <Form.Item label="命名空间">
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
                  </Form.Item>
                  <Form.Item>
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
                records={backendGroupList}
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
