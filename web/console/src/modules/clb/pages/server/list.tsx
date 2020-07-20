import React, { useState, useEffect } from 'react';
import {
  Bubble,
  Card,
  CardBodyProps,
  CardProps,
  ContentView,
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
import { BackendsGroupEditor } from '@src/modules/clb/pages/server/editor';

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
    backendsList: [],
    dialogVisible: true,
  };

  componentDidMount() {
    this.state.isPlatform && this.loadData();
  }

  /**
   * 在平台侧时，获取全部集群列表
   */
  loadData = async () => {
    let clusters = await getAllClusters();
    console.log('clusters@loadData = ', clusters);
    this.setState({ clusters });
  };

  /**
   * 切换集群的时候更新命名空间列表
   * @param clusterName 集群名称
   */
  handleClusterChanged = async clusterName => {
    console.log('clusterName = ', clusterName);
    let namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, namespaces });
    // this.setState({ clusterName }, () => {
    //   this.getList(clusterName);
    // });
  };

  /**
   * 获取服务器组列表数据
   */
  getList = async (clusterName, namespace) => {
    let backends = await getBackendsList(clusterName, namespace);
    let backendsList = backends.map(item => convert(item));
    this.setState({ backendsList: backends });
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

  /**
   * 切换业务的时候更新命名空间
   * @param projectId 业务id
   */
  handleProjectChanged = async projectId => {
    console.log('project = ', projectId);
    let namespaces = await getNamespacesByProject(projectId);
    this.setState({ projectId, namespaces });
  };

  /**
   * 切换命名空间的时候更新列表页数据
   * 注意要兼容业务侧和平台侧两种情况
   * @param namespace
   */
  handleNamespaceChanged = namespace => {
    console.log('namespace = ', namespace);
    let { namespaces } = this.state;
    let { clusterName } = namespaces.find(item => item.name === namespace);
    this.setState({ namespace, clusterName }, () => {
      this.getList(clusterName, namespace);
    });
  };

  handleCancelItem = () => {
    this.showModal(false);
  };

  stateToPayload = data => {
    let payload = { ...pick(data, ['name', 'namespace', 'scope', 'lbID']), ...data.listener };
    console.log('payload = ', payload);

    return payload;
  };

  handleSubmitItem = async () => {
    document.getElementById('backendsGroupForm').dispatchEvent(new Event('submit', { cancelable: true }));
  };

  handleNewItem = () => {
    this.setState({
      dialogVisible: true,
      // isEdit: false,
      // currentItem: {
      //   name: '', // 规则名称
      //   isSharedRule: false,
      //   project: '',
      //   namespace: '', // 规则所在命名空间
      //   clusterName: '',
      //   scope: [], // 共享的命名空间
      //   lbID: '', // CLB 实例
      //   useListener: 'new', // 使用监听器
      //   listener: {
      //     protocol: '',
      //     port: '',
      //     host: '',
      //     path: '',
      //   },
      // },
    });
  };

  render() {
    let {
      projectId,
      clusterName,
      clusters,
      namespace,
      namespaces,
      backendsList,
      dialogVisible,
      isPlatform,
    } = this.state;
    let { projects, context } = this.props;
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    console.log('projectList = ', projectList);
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    console.log('clusterList = ', clusterList);
    console.log('namespaces = ', namespaces);
    let namespaceList = namespaces.map(({ name }) => ({
      value: name,
      text: name,
    }));

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
            <Table
              verticalTop
              records={backendsList}
              recordKey="name"
              columns={[
                {
                  key: 'name',
                  header: '名称',
                  render: ({ name }) => (
                    <>
                      <p>
                        <a>{name}</a>
                      </p>
                    </>
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
            <Modal visible={dialogVisible} caption="新建服务器组" onClose={this.handleCancelItem} size="l">
              <Modal.Body>
                <BackendsGroupEditor projects={projects} context={this.props.context} />
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
          </Card>
        </Body>
      </ContentView>
    );
  }
}
