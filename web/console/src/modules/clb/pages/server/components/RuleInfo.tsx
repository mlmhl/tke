/**
 * 规则信息
 */
import React from 'react';
import {
  Button,
  Card,
  Form,
  SelectMultiple,
  Table,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { getRuleInfo, getBackendsInfo } from '../../../services/api';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

const labels = {
  cluster: '选择集群',
  project: '选择业务',
  namespace: '命名空间',
  ruleName: '规则名称',
  switch: '创建可共享规则',
  sharedNamespace: '可使用本规则的命名空间',
  clbInstance: 'CLB 实例',
  useListener: '使用监听器',
  showListener: '使用已有监听器',
  newListener: '新建监听器',
};

const getStatus = meta => {
  if (meta.active && meta.validating) {
    return 'validating';
  }
  if (!meta.touched) {
    return null;
  }
  return meta.error ? 'error' : 'success';
};

interface Project {
  id: string;
  name: string;
}

interface BackendGroup {
  name: string;

  namespace: string;
}

interface RuleInfo {
  name: string; // 规则名称

  namespace: string; // 规则所在命名空间

  share: boolean; // 是否是可共享规则

  type: string; // 类型

  clbID: string; // CLB 实例

  clbName: string;

  vip: string;

  port: string;

  protocol: string;

  host: string;

  path: string;

  scope: string[]; // 共享的命名空间

  backendGroups: BackendGroup[];
}

interface BackendInfo {
  serverId: string;

  serverAddress: string;

  status: string;
}

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  backendGroupName: string;

  ruleName: string;

  context: string; // 业务侧/平台侧
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  ruleName: string;

  ruleInfo: RuleInfo;

  backends: BackendInfo[];
}

class RuleInfo extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    backendGroupName: this.props.backendGroupName,
    ruleName: this.props.ruleName,
    ruleInfo: {} as RuleInfo,
    backends: [],
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, ruleName } = this.state;

    if (!isEqual(nextProps.clusterName, clusterName) || !isEqual(nextProps.namespace, namespace) || !isEqual(nextProps.ruleName, ruleName)) {
      this.setState({ clusterName: nextProps.clusterName, namespace: nextProps.namespace, ruleName: nextProps.ruleName }, () => {
        if (nextProps.clusterName && nextProps.namespace && nextProps.ruleName) {
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
    await this.getRuleInfo();
    await this.getBackendsInfo();
  };

  /**
   * 获取规则信息
   */
  getRuleInfo = async () => {
    let { clusterName, namespace, ruleName } = this.state;
    let ruleInfo = await getRuleInfo(clusterName, namespace, ruleName);
    this.setState({ ruleInfo });
  };

  getBackendsInfo = async () => {
    let { clusterName, namespace, backendGroupName, ruleName } = this.state;
    let backendsInfo = await getBackendsInfo(clusterName, namespace, backendGroupName, ruleName);
    let backends = backendsInfo.map(item => ({
      serverId: item.metadata.name,
      serviceAddress: item.status.backendAddr,
      status: `${item.status.conditions[0]['type']}:${item.status.conditions[0]['status']}`,
    }));
    this.setState({ backends });
  };

  render = () => {
    let { clusterName, ruleInfo, backends } = this.state;
    let { name, namespace, share, type, clbID, clbName, vip, port, protocol, host, path, backendGroups } = ruleInfo;

    return (
      <div>
        <Form>
          <Form.Item label="命名空间">
            <Form.Text>{namespace}</Form.Text>
          </Form.Item>
          <Form.Item label="规则名称">
            <Form.Text>{name}</Form.Text>
          </Form.Item>
          <Form.Item label="CLB名称">
            <Form.Text>{clbName}</Form.Text>
          </Form.Item>
          <Form.Item label="CLB ID">
            <Form.Text>{clbID}</Form.Text>
          </Form.Item>
          <Form.Item label="网络类型">
            <Form.Text>{type}</Form.Text>
          </Form.Item>
          <Form.Item label="VIP">
            <Form.Text>{vip}</Form.Text>
          </Form.Item>
          <Form.Item label="端口号">
            <Form.Text>{protocol}:{port}</Form.Text>
          </Form.Item>
          <Form.Item label="Host">
            <Form.Text>{host}</Form.Text>
          </Form.Item>
          <Form.Item label="Path">
            <Form.Text>{path}</Form.Text>
          </Form.Item>
          <Form.Item label="服务器">
            <Table
              compact
              verticalTop
              records={backends}
              recordKey="name"
              columns={[
                {
                  key: 'serverId',
                  header: '服务器ID',
                },
                {
                  key: 'serverAddress',
                  header: '服务器地址',
                },
                {
                  key: 'status',
                  header: '状态',
                },
              ]}
              addons={[
                autotip({
                  emptyText: '暂无数据',
                }),
              ]}
            />
          </Form.Item>
        </Form>
      </div>
    );
  };
}

export { RuleInfo };
