/**
 * CLB 实例管理 - 实例列表页
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  ContentView,
  Drawer,
  Form,
  Justify,
  Modal,
  Select,
  Table,
  Text,
  Button,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import InstanceEditor from './instanceEditor';
import {
  getAllClusters,
  getImportedInstancesByCluster,
  importInstance,
  disableInstance,
  enableInstance,
  removeInstance,
} from '../../services/api';
import { InstanceDetail } from './detail';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
const { Body, Header } = ContentView;

const convert = item => ({ ...item });

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
    alertVisible: false,
    currentItem: {
      clbId: '',
      scope: [],
    },
    valid: false,
    detailVisible: false,
    selectedItem: {
      name: '',
      clbID: '',
    },
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters });
    // 缓存处理
    let selectedClusterName = window.localStorage.getItem('selectedClusterName');
    if (clusters.map(item => (item.name)).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
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
    this.setState({ clusterName, instanceList: [] }, () => {
      this.getList(clusterName);
      // 缓存选择的集群
      window.localStorage.setItem('selectedClusterName', clusterName);
    });
  };

  showModal = visible => {
    this.setState({ dialogVisible: visible });
  };

  showDetail = visible => {
    this.setState({ detailVisible: visible });
  };

  alertSuccess = () => {
    this.setState({ alertVisible: true });
  }

  handleInstanceChanged = ({ values, valid }) => {
    this.setState({ currentItem: { ...values }, valid });
    // setValid(valid);
  };

  handleCancelItem = () => {
    this.showModal(false);
  };

  /**
   * 关闭详情窗口
   */
  handleCloseDetail = () => {
    this.showDetail(false);
  };

  handleSubmitItem = async () => {
    let { data, currentItem, clusterName } = this.state;
    let { clbId, scope } = currentItem;

    try {
      const payload = {
        lbID: clbId,
        scope,
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

  /**
   * 查看实例详情
   * @param item
   */
  handleViewItem = item => {
    return (e) => {
      let { name } = item;
      this.setState({ selectedItem: item, detailVisible: true });
    };
  };

  /**
   * 启用实例
   * @param clbID
   */
  handleEnableInstance = async clbID => {
    let { clusterName } = this.state;
    let response = await enableInstance(clusterName, clbID);
    if (response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  /**
   * 禁用实例
   * @param clbID
   */
  handleDisableInstance = async clbID => {
    let { clusterName } = this.state;
    let response = await disableInstance(clusterName, clbID);
    if (response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  /**
   * 删除实例
   * @param clbID
   */
  handleRemoveInstance = async clbID => {
    let { clusterName } = this.state;
    let response = await removeInstance(clusterName, clbID);
    if (response.code === 0 && response.message === 'OK') {
      this.alertSuccess();
    }
  };

  close = () => {
    let { clusterName } = this.state;
    this.setState({ alertVisible: false });
    this.getList(clusterName);
  };

  render() {
    let { clusterName, clusters, instanceList, dialogVisible, currentItem, alertVisible, detailVisible, selectedItem } = this.state;
    let { projects } = this.props;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));

    let renderOperationColumn = () => {
      return ({ disabled, clbID }) => {
        return (
          <>
            <Button
              type="link"
              onClick={() => (disabled ? this.handleEnableInstance(clbID) : this.handleDisableInstance(clbID))}
            >
              <strong>{disabled ? '启用' : '禁用'}</strong>
            </Button>
            <Button
              type="link"
              onClick={() => {
                this.handleRemoveInstance(clbID);
              }}
            >
              <strong>删除</strong>
            </Button>
          </>
        );
      };
    };

    return (
      <Card>
        <Card.Body>
          <Table.ActionPanel>
            <Justify
              left={
                <>
                  <Button type="primary" onClick={this.handleNewItem}>
                    导入实例
                  </Button>
                  {/*<Button>禁用实例</Button>*/}
                  {/*<Button>删除实例</Button>*/}
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
                    <Button type="link" onClick={this.handleViewItem(instance)}>{instance.name}</Button>
                  ),
                },
                {
                  key: 'clbID',
                  header: 'CLB ID',
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
                {
                  key: 'disabled',
                  header: '状态',
                  render: instance => (
                    <>
                      {instance.disabled ? <Text theme="warning">已禁用</Text> : <Text theme="success">允许使用</Text>}
                    </>
                  ),
                },
                {
                  key: 'settings',
                  header: '操作',
                  width: 100,
                  render: renderOperationColumn(),
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
            <Modal visible={alertVisible} disableCloseIcon onClose={this.close}>
              <Modal.Body>
                <Modal.Message
                  icon="success"
                  message="操作成功"
                  description="列表将自动刷新"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button type="primary" onClick={this.close}>
                  确定
                </Button>
                {/*<Button type="weak" onClick={this.close}>*/}
                {/*  取消*/}
                {/*</Button>*/}
              </Modal.Footer>
            </Modal>
            <Drawer
              visible={detailVisible}
              title="查看实例详情"
              outerClickClosable={false}
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
              <InstanceDetail
                clusterName={clusterName}
                name={selectedItem.clbID}
              />
            </Drawer>
          </Card>
        </Card.Body>
      </Card>
    );
  }
}
