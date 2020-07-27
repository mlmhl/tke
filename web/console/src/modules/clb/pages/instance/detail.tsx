/**
 * 实例详情页
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

import AutoSave from '../../components/AutoSave';
import { getInstanceInfo, modifyInstanceNamespace } from '../../services/api';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

// const labels = {
//   cluster: '选择集群',
//   project: '选择业务',
//   namespace: '命名空间',
//   ruleName: '规则名称',
//   switch: '创建可共享规则',
//   sharedNamespace: '可使用本规则的命名空间',
//   clbInstance: 'CLB 实例',
//   useListener: '使用监听器',
//   showListener: '使用已有监听器',
//   newListener: '新建监听器',
// };

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

interface InstanceInfo {
  name: string; // 规则名称

  type: string; // 类型

  clbID: string; // CLB 实例

  clbName: string;

  vip: string;

  scope: string[]; // 共享的命名空间

  disabled: boolean;
}

interface PropTypes {
  clusterName: string; // 集群名称

  // namespace: string;

  name: string;

  // context: string; // 业务侧/平台侧
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  // namespace: string;

  name: string;

  instanceInfo: InstanceInfo;
}

class InstanceDetail extends React.Component<PropTypes, StateTypes> {
  state = {
    // isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    // namespace: this.props.namespace,
    name: this.props.name,
    instanceInfo: {} as InstanceInfo,
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
    this.setState({ instanceInfo });
  };

  render = () => {
    let { clusterName, instanceInfo } = this.state;
    let { name, type, clbID, clbName, vip, disabled, scope = [] } = instanceInfo;
    let namespaceList = scope.map(item => ({ namespace: item }));

    return (
      <Card>
        <Card.Body
          title="规则信息"
          operation={<Button type="link">修改命名空间</Button>}
        >
          <Form>
            <Form.Item label="规则名称">
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
              <Form.Text>{type}</Form.Text>
            </Form.Item>
            <Form.Item label="VIP">
              <Form.Text>{vip}</Form.Text>
            </Form.Item>
            <Form.Item label="允许使用本实例的命名空间">
              <Table
                compact
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
            </Form.Item>
          </Form>
        </Card.Body>
      </Card>
    );
  };
}

export { InstanceDetail };
