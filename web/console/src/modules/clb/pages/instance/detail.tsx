/**
 * 实例详情页
 */
import React from 'react';
import { Button, Card, Form, SelectMultiple, Table } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { getInstanceInfo, getNamespacesByCluster, modifyInstanceNamespace } from '../../services/api';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

const getStatus = meta => {
  if (meta.active && meta.validating) {
    return 'validating';
  }
  if (!meta.touched) {
    return null;
  }
  return meta.error ? 'error' : 'success';
};

type InstanceInfo = {
  name: string; // 规则名称

  type: string; // 类型

  clbID: string; // CLB 实例

  clbName: string;

  vip: string;

  vipIsp: string;

  scope: string[]; // 共享的命名空间

  disabled: boolean;
};

interface PropTypes {
  clusterName: string; // 集群名称

  name: string;
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespaces: String[]; // 可使用该实例的命名空间

  name: string;

  instanceInfo: InstanceInfo;

  mode: string;

  scope: string[];
}

class InstanceDetail extends React.Component<PropTypes, StateTypes> {
  state = {
    // isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespaces: [],
    name: this.props.name,
    instanceInfo: {} as InstanceInfo,
    mode: 'view', // view: 查看，edit：编辑
    scope: [],
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, name } = this.state;

    if (!isEqual(nextProps.clusterName, clusterName) || !isEqual(nextProps.name, name)) {
      this.setState({ clusterName: nextProps.clusterName, name: nextProps.name }, () => {
        if (nextProps.clusterName && nextProps.name) {
          this.loadData();
        }
      });
    }
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    await this.getInstanceInfo();
  };

  getInstanceInfo = async () => {
    let { clusterName, name } = this.state;
    let instanceInfo = await getInstanceInfo(clusterName, name);
    // 初始化一下scope的状态，后续修改命名空间初始化用
    let { scope } = instanceInfo;
    this.setState({ instanceInfo, scope });
  };

  handleEditScope = async () => {
    let { clusterName } = this.state;
    const namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ namespaces, mode: 'edit' });
  };

  handleScopeChanged = value => {
    this.setState({ scope: value });
  };

  handleSubmitScope = async () => {
    let {
      clusterName,
      instanceInfo: { clbID },
      scope,
    } = this.state;
    let response = await modifyInstanceNamespace(clusterName, clbID, scope);
    if (response.code === 0 && response.message === 'OK') {
      this.setState({ mode: 'view' }, () => {
        this.getInstanceInfo();
      });
    }
  };

  render = () => {
    let { clusterName, instanceInfo, namespaces, mode, scope: newScope } = this.state;
    let { name, type, clbID, clbName, vip, vipIsp, disabled, scope = [] } = instanceInfo;
    let namespaceList = [];
    if (mode === 'view') {
      namespaceList = scope.map(item => ({ namespace: item }));
    } else {
      namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
      namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });
    }

    return (
      <div>
        <Form style={{ marginBottom: 16 }}>
          <Form.Item label="名称">
            <Form.Text>{name}</Form.Text>
          </Form.Item>
          <Form.Item label="状态">
            <Form.Text>{disabled ? '已禁用' : '启用中'}</Form.Text>
          </Form.Item>
          <Form.Item label="CLB名称">
            <Form.Text>{clbName}</Form.Text>
          </Form.Item>
          <Form.Item label="CLB ID">
            <Form.Text>{clbID}</Form.Text>
          </Form.Item>
          <Form.Item label="网络类型">
            <Form.Text>{type === 'OPEN' ? '公网' : '内网'}</Form.Text>
          </Form.Item>
          <Form.Item label="VIP">
            <Form.Text>{vip}</Form.Text>
          </Form.Item>
          <Form.Item label="运营商">
            <Form.Text>{vipIsp}</Form.Text>
          </Form.Item>
        </Form>
        <Form layout="vertical">
          <Form.Item label="允许使用本实例的命名空间">
            {mode === 'view' ? (
              <Table
                compact
                bordered
                hideHeader
                verticalTop
                records={namespaceList}
                recordKey="namespace"
                columns={[
                  {
                    key: 'namespace',
                    header: '命名空间',
                  },
                ]}
                addons={[
                  autotip({
                    emptyText: '暂无数据',
                  }),
                ]}
              />
            ) : (
              <SelectMultiple
                value={newScope}
                onChange={this.handleScopeChanged}
                // staging={false}
                appearence="button"
                size="l"
                placeholder="请选择命名空间"
                options={namespaceList}
              />
            )}
          </Form.Item>
        </Form>
        <Form.Action>
          {mode === 'view' ? (
            <Button type="primary" onClick={this.handleEditScope}>
              修改命名空间
            </Button>
          ) : (
            <>
              <Button type="primary" onClick={this.handleSubmitScope}>
                保存
              </Button>
              <Button
                onClick={() => {
                  this.setState({ mode: 'view' });
                }}
              >
                取消
              </Button>
            </>
          )}
        </Form.Action>
      </div>
    );
  };
}

export { InstanceDetail };
