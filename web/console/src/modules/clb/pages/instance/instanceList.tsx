/**
 * CLB 实例管理 - 实例列表页
 */
import React from 'react';
import {
  Card,
  ContentView,
  Drawer,
  Form,
  Justify,
  Modal,
  PopConfirm,
  Select,
  Table,
  Text,
  Button,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { InstanceEditor } from './instanceEditor';
import { InstanceDetail } from './detail';
import {
  getAllClusters,
  getImportedInstancesByCluster,
  importInstance,
  disableInstance,
  enableInstance,
  removeInstance,
} from '../../services/api';
import { Cluster as ClusterType } from '../../models';
import { Instance, ImportedInstance } from '../../models/instance';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
const { Body, Header } = ContentView;

const convert = item => ({ ...item, confirmVisible: false });

interface Project {
  id: string;
  name: string;
}

interface PropTypes {
  projects: Project[];

  value?: any;
}

interface InstanceForTable extends ImportedInstance {
  confirmVisible: boolean;
}

type ItemType = {
  clusterName: string;

  clbId: string;

  scope: Array<string>;
};

type SelectedItemType = {
  name: string;

  clbId: string;
};

interface StateTypes {
  clusterName: string; // 集群名称

  clusters: ClusterType[];

  instanceList: InstanceForTable[]; // 数据加工后可以给表格组件使用的数据

  dialogVisible: boolean;

  alertVisible: boolean;

  currentItem: ItemType;

  valid: boolean;

  detailVisible: boolean;

  selectedItem: SelectedItemType;
}

export class InstanceList extends React.Component<PropTypes, StateTypes> {
  index = 0;

  state = {
    clusterName: '',
    clusters: [],
    instanceList: [],
    dialogVisible: false,
    alertVisible: false,
    currentItem: {
      clusterName: '',
      clbId: '',
      scope: [],
    },
    valid: false,
    detailVisible: false,
    selectedItem: {
      name: '',
      clbId: '',
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
    if (clusters.map(item => item.name).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  /**
   * 获取列表页数据并进行数据加工
   * @param clusterName
   */
  getList = async clusterName => {
    let instances = await getImportedInstancesByCluster(clusterName);
    let instanceList: InstanceForTable[] = instances.map(item => convert(item));
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
  };

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
    let { currentItem } = this.state;
    let { clusterName, clbId, scope } = currentItem;

    try {
      const payload = {
        lbID: clbId,
        scope,
      };
      await importInstance(clusterName, payload);
      this.setState({ dialogVisible: false });
      this.getList(clusterName);
    } catch (err) {
      // message.error(err)
    }
  };

  handleNewItem = () => {
    this.setState({
      dialogVisible: true,
      currentItem: {
        key: `NEW_ITEMID_${this.index++}`,
        clusterName: '',
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
    return e => {
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
   * @param item, 主要是取里面的 clbID 使用
   */
  handleRemoveInstance = async item => {
    let { clusterName } = this.state;
    let { clbID } = item;
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
    let {
      clusterName,
      clusters,
      instanceList,
      dialogVisible,
      currentItem,
      alertVisible,
      detailVisible,
      selectedItem,
    } = this.state;
    let { projects } = this.props;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));

    let setConfirmVisible = (currentItem, confirmVisible) => {
      let newList = instanceList.map(item => ({ ...item }));
      // instance 的 key 是 name
      let target = newList.filter(item => item.name === currentItem.name)[0];
      if (target) {
        target.confirmVisible = confirmVisible;
        this.setState({ instanceList: newList });
      }
    };

    let renderOperationColumn = () => {
      return currentItem => {
        let { disabled, clbId } = currentItem;

        return (
          <>
            <Button type="link" onClick={this.handleViewItem(currentItem)}>
              <strong>详情</strong>
            </Button>
            <Button
              type="link"
              onClick={() => (disabled ? this.handleEnableInstance(clbId) : this.handleDisableInstance(clbId))}
            >
              <strong>{disabled ? '启用' : '禁用'}</strong>
            </Button>
            <PopConfirm
              title="确定要删除该条记录？"
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
                      this.handleRemoveInstance(currentItem);
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
      <Card>
        <Card.Body>
          <Table.ActionPanel>
            <Justify
              left={
                <Button type="primary" onClick={this.handleNewItem}>
                  导入实例
                </Button>
              }
              right={
                <Form layout="inline">
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
                    <Button
                      icon="refresh"
                      onClick={() => {
                        let { clusterName } = this.state;
                        if (clusterName) {
                          this.setState({ instanceList: [] }, () => {
                            this.getList(clusterName);
                          });
                        }
                      }}
                    />
                  </Form.Item>
                </Form>
              }
            />
          </Table.ActionPanel>
          <Table
            verticalTop
            disableTextOverflow={true}
            records={instanceList}
            recordKey="name"
            columns={[
              {
                key: 'name',
                header: '名称',
                render: instance => (
                  <Button type="link" onClick={this.handleViewItem(instance)}>
                    {instance.name}
                  </Button>
                ),
              },
              {
                key: 'clbId',
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
                render: instance => <p>{instance.type === 'OPEN' ? '公网' : '内网'}</p>,
              },
              {
                key: 'vipIsp',
                header: '运营商',
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
                  <>{instance.disabled ? <Text theme="warning">已禁用</Text> : <Text theme="success">允许使用</Text>}</>
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
              <Modal.Message icon="success" message="操作成功" description="列表将自动刷新" />
            </Modal.Body>
            <Modal.Footer>
              <Button type="primary" onClick={this.close}>
                确定
              </Button>
            </Modal.Footer>
          </Modal>
          <Drawer
            visible={detailVisible}
            title="查看详情"
            onClose={this.handleCloseDetail}
            size="l"
            footer={<Button onClick={this.handleCloseDetail}>关闭</Button>}
          >
            <InstanceDetail clusterName={clusterName} name={selectedItem.clbId} />
          </Drawer>
        </Card.Body>
      </Card>
    );
  }
}
