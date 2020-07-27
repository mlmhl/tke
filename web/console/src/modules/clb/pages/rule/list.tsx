/**
 * CLB 规则列表页
 */
import React, { useState, useEffect } from 'react';
import {
  Bubble,
  Card,
  ContentView,
  Drawer,
  Form,
  Justify,
  Modal,
  Select,
  Table,
  Button,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  getAllClusters,
  getRuleList,
  getNamespacesByProject,
  getNamespacesByCluster,
} from '../../services/api';
import { Editor } from './editor';
import { RuleDetail } from './detail';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
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
    if (clusters.map(item => (item.name)).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  showModal = visible => {
    this.setState({ dialogVisible: visible });
  };

  showDrawer = visible => {
    this.setState({ drawerVisible: visible });
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
      if (namespaces.map(item => (item.name)).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  getList = async (clusterName, namespace) => {
    // let { clusterName, namespace } = this.state;
    let rules = await getRuleList(clusterName, namespace);
    // let backendsList = backends.map(item => convert(item));
    this.setState({ rules });
  };

  /**
   * 增加一个刷新图标按钮用来刷新列表数据
   * TODO: 把操作区做成一个小的表单处理
   */
  reloadList = () => {
    let { clusterName, namespace } = this.state;
    if (clusterName && namespace) {
      this.getList(clusterName, namespace);
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

  stateToPayload = data => {
    // let { currentItem } = this.state;
    // let { name, isSharedRule, namespace, scope, lbID, listener } = data;
    let payload = { ...pick(data, ['name', 'namespace', 'scope', 'lbID']), ...data.listener };

    return payload;
  };

  handleSubmitItem = async () => {
    document.getElementById('ruleForm').dispatchEvent(new Event('submit', { cancelable: true }));
    this.showModal(false);
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
    return (e) => {
      let { name } = item;
      let { clusterName, namespace } = this.state;
      this.setState({ selectedItem: item, drawerVisible: true });
    };
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
      currentItem,
      isPlatform,
      drawerVisible,
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

    return (
      <ContentView>
        <Header title={t('CLB规则')} />
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
            <Table
              verticalTop
              records={rules}
              recordKey="name"
              columns={[
                {
                  key: 'name',
                  header: '规则名称',
                  render: rule => (
                    <Button type="link" onClick={this.handleViewItem(rule)}>{rule.name}</Button>
                  ),
                },
                {
                  key: 'type',
                  header: '网络类型',
                  align: 'center',
                  render: rule => (
                    <>
                      <p>{rule.type}</p>
                    </>
                  ),
                },
                {
                  key: 'vip',
                  header: 'VIP',
                },
                {
                  key: 'port',
                  header: '端口',
                  width: 100,
                  render: rule => (
                    <>
                      <p>
                        {rule.protocol}:{rule.port}
                      </p>
                    </>
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
                    <>
                      <p>
                        <a>{rule.backendGroups.length}</a>
                      </p>
                    </>
                  ),
                },
              ]}
              addons={[
                autotip({
                  // isLoading: loading,
                  // isError: Boolean(error),
                  // isFound: Boolean(keyword),
                  // onClear: () => setKeyword(""),
                  // onRetry: load,
                  // foundKeyword: keyword,
                  emptyText: '暂无数据',
                }),
              ]}
            />
            <Modal visible={dialogVisible} caption="新建CLB规则" onClose={this.handleCancelItem} size="l">
              <Modal.Body>
                <Editor
                  projects={projects}
                  value={currentItem}
                  onChange={this.handleEditorChanged}
                  context={this.props.context}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button type="primary" onClick={this.handleSubmitItem}>
                  确定
                </Button>
                <Button type="weak" onClick={this.handleCancelItem}>
                  取消
                </Button>
              </Modal.Footer>
            </Modal>
            <Drawer
              visible={drawerVisible}
              title="CLB规则详情"
              outerClickClosable={false}
              onClose={this.handleCloseDrawer}
              size="l"
              footer={
                <>
                  <Button type="primary" onClick={this.handleCloseDrawer}>
                    确定
                  </Button>
                </>
              }
            >
              <RuleDetail
                clusterName={clusterName}
                namespace={namespace}
                ruleName={selectedItem.name}
              />
            </Drawer>
          </Card>
        </Body>
      </ContentView>
    );
  }
}
