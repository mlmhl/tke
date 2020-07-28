import React, { useState, useEffect } from 'react';
import {
  Bubble,
  Card,
  CardBodyProps,
  CardProps,
  ContentView,
  Drawer,
  Dropdown,
  Form,
  Icon,
  Justify,
  JustifyProps,
  List,
  Modal,
  Pagination,
  PaginationProps,
  Select,
  Table,
  TableColumn,
  TableProps,
  Text,
  Button,
  ExternalLink,
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
import { StatusTip } from '@tencent/tea-component/lib/tips';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

import { getAllClusters, getBackendsList, getNamespacesByCluster, getNamespacesByProject } from '../../services/api';
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
  relatedRules: max([get(item, 'spec.loadBalancers', 0), get(item, 'spec.lbName', 0), 0]), // 两个路径的对象会且只会存在一个，取出它的值来
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
    dialogVisible: false,
    drawerVisible: false,
    detailVisible: false,
    selectedItem: {
      name: '',
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
      this.getList(clusterName, namespace);
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

  stateToPayload = data => {
    let payload = { ...pick(data, ['name', 'namespace', 'scope', 'lbID']), ...data.listener };

    return payload;
  };

  handleSubmitItem = async () => {
    document.getElementById('backendsGroupForm').dispatchEvent(new Event('submit', { cancelable: true }));
    this.showModal(false);
  };

  handleNewItem = () => {
    this.setState({
      drawerVisible: true,
    });
  };

  /**
   * 查看服务器组详情
   * @param item
   */
  handleViewItem = item => {
    return e => {
      let { name } = item;
      let { clusterName, namespace } = this.state;
      this.setState({ selectedItem: item, detailVisible: true });
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

    return (
      <ContentView>
        <Header title={t('CLB服务器组')} />
        <Body>
          <Table.ActionPanel>
            <Justify
              left={
                <Bubble placement="right">
                  <Button type="primary" onClick={this.handleNewItem}>
                    {t('新建')}
                  </Button>
                </Bubble>
              }
              right={
                <Form layout="inline">
                  {isPlatform ? (
                    <Form.Item label={t('集群')}>
                      <Select
                        searchable
                        boxSizeSync
                        size="m"
                        type="simulate"
                        appearence="button"
                        options={clusterList}
                        value={clusterName}
                        onChange={value => this.handleClusterChanged(value)}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item label={t('业务')}>
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
                  <Form.Item label={t('命名空间')}>
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
                    align: 'center',
                    render: ({ backends }) => (
                      <>
                        <p>{backends}</p>
                      </>
                    ),
                  },
                  {
                    key: 'registeredBackends',
                    header: '已绑定数量',
                    width: 100,
                    render: ({ registeredBackends }) => (
                      <>
                        <p>{registeredBackends}</p>
                      </>
                    ),
                  },
                  {
                    key: 'relatedRules',
                    header: '关联规则',
                  },
                ]}
                addons={[
                  autotip({
                    emptyText: '暂无数据',
                  }),
                ]}
              />
              <Drawer
                visible={drawerVisible}
                title="新建服务器组"
                outerClickClosable={false}
                onClose={this.handleCloseDrawer}
                size="l"
                footer={
                  <>
                    <Button type="primary" onClick={this.handleSubmitItem}>
                      确定
                    </Button>
                    <Button type="weak" onClick={this.handleCloseDrawer}>
                      取消
                    </Button>
                  </>
                }
              >
                <BackendsGroupEditor projects={projects} context={this.props.context} />
              </Drawer>
              <Drawer
                visible={detailVisible}
                title="服务器组详情"
                onClose={this.handleCloseDetail}
                size="l"
                footer={
                  <>
                    <Button type="primary" onClick={this.handleCloseDetail}>
                      确定
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
            </Card.Body>
          </Card>
        </Body>
      </ContentView>
    );
  }
}
