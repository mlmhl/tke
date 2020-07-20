/**
 * CLB 实例管理 - 实例列表页
 */
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
  Layout,
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
import InstanceEditor from './InstanceEditor';
import { getAllClusters, getImportedInstancesByCluster, importInstance } from '../../services/api';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
const { Body, Header } = ContentView;

const convert = item => ({ ...item });
// const convert = item => ({
//   name: get(item, 'metadata.name', stubString()), // 取值
//   type: findKey(
//     { pods: has(item, 'spec.pods'), service: has(item, 'spec.service'), static: has(item, 'spec.static') },
//     item => item
//   ), // 通过path是否存在判断消息内容的类型
//   clbId: get(item, 'status.backends', 0),
//   clbName: get(item, 'status.registeredBackends', 0),
//   vip: max([get(item, 'spec.loadBalancers', 0), get(item, 'spec.lbName', 0), 0]),
//   disabled: false,
// });

interface Project {
  id: string;
  name: string;
}

interface PropTypes {
  projects: Project[];

  value?: any;
}

export class InstanceList extends React.Component<PropTypes> {
  index = 0;

  state = {
    data: this.props.value,
    clusterName: '',
    clusters: [],
    instanceList: [],
    dialogVisible: false,
    currentItem: {
      clbId: '',
      scope: [],
    },
    valid: false,
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    let clusters = await getAllClusters();
    console.log('clusters@getClusterList = ', clusters);
    this.setState({ clusters });
  };

  /**
   * 获取列表页数据并进行数据加工
   * @param clusterName
   */
  getList = async clusterName => {
    let instances = await getImportedInstancesByCluster(clusterName);
    let instanceList = instances.map(item => convert(item));
    this.setState({ instanceList });
  };

  /**
   * 切换集群的时候更新实例列表
   * @param clusterName 集群名称
   */
  handleClusterChanged = async clusterName => {
    console.log('clusterName = ', clusterName);
    this.setState({ clusterName, instanceList: [] }, () => {
      this.getList(clusterName);
    });
  };

  showModal = visible => {
    this.setState({ dialogVisible: visible });
  };

  handleInstanceChanged = ({ values, valid }) => {
    console.log('values = ', values, ', valid = ', valid);
    this.setState({ currentItem: { ...values }, valid });
    // setValid(valid);
  };

  handleCancelItem = () => {
    this.showModal(false);
  };

  handleSubmitItem = async () => {
    let { data, currentItem, clusterName } = this.state;
    let { clbId, scope } = currentItem;

    try {
      const payload = {
        lbID: clbId,
        scope: [scope],
      };
      // if (!isEdit) {
      await importInstance(clusterName, payload);
      // message.info('网络策略已创建')
      // } else {
      // await updateNetworkPolicy(cluster, name, payload)
      // message.info('网络策略已更新')
      // }
      this.setState({ dialogVisible: false });
      this.getList(clusterName);
      // this.loadData();
    } catch (err) {
      // message.error(err)
    }
  };

  handleNewItem = () => {
    this.setState({
      dialogVisible: true,
      isEdit: false,
      currentItem: {
        key: `NEW_ITEMID_${this.index++}`,
        clbId: '',
        scope: [],
      },
    });
  };

  render() {
    let { clusterName, clusters, instanceList, dialogVisible, currentItem } = this.state;
    let { projects } = this.props;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    console.log('clusterList = ', clusterList);

    return (
      <ContentView>
        <Header title={t('CLB实例')} />
        <Body>
          <Table.ActionPanel>
            <Justify
              left={
                <>
                  <Button type="primary" onClick={this.handleNewItem}>
                    导入实例
                  </Button>
                  <Button>禁用实例</Button>
                  <Button>删除实例</Button>
                </>
              }
              right={
                <Form layout="inline">
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
                  <Form.Item>
                    <Button
                      icon="refresh"
                      onClick={() => {
                        let { clusterName } = this.state;
                        if (clusterName) {
                          this.getList(clusterName);
                        }
                      }}
                    />
                  </Form.Item>
                </Form>
              }
            />
          </Table.ActionPanel>
          <Card>
            <Table
              verticalTop
              records={instanceList}
              recordKey="name"
              columns={[
                {
                  key: 'name',
                  header: '名称',
                  render: instance => (
                    <>
                      <p>
                        <a>{instance.name}</a>
                      </p>
                    </>
                  ),
                },
                {
                  key: 'clbID',
                  header: 'CLBID',
                  render: instance => (
                    <>
                      <p>
                        <a>{instance.clbID}</a>
                      </p>
                    </>
                  ),
                },
                {
                  key: 'clbName',
                  header: 'CLB名称',
                },
                {
                  key: 'vip',
                  header: 'VIP',
                },
                {
                  key: 'type',
                  header: '网络类型',
                  render: instance => (
                    <>
                      <p>{instance.type}</p>
                    </>
                  ),
                },
                {
                  key: 'scope',
                  header: '命名空间',
                  render: instance => (
                    <>
                      {instance.scope.map(item => (
                        <p key={item}>{item}</p>
                      ))}
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
            <Modal visible={dialogVisible} caption="导入CLB实例" onClose={this.handleCancelItem} size="l">
              <Modal.Body>
                <InstanceEditor clusterName={clusterName} value={currentItem} onChange={this.handleInstanceChanged} />
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
          </Card>
        </Body>
      </ContentView>
    );
  }
}
