/**
 * 规则详情页
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
import { getRuleInfo, modifyRuleNamespace } from '../../services/api';

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

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  ruleName: string;

  // context: string; // 业务侧/平台侧
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
}

class RuleDetail extends React.Component<PropTypes, StateTypes> {
  state = {
    // isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    ruleName: this.props.ruleName,
    ruleInfo: {} as RuleInfo,
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
  };

  getRuleInfo = async () => {
    let { clusterName, namespace, ruleName } = this.state;
    let ruleInfo = await getRuleInfo(clusterName, namespace, ruleName);
    this.setState({ ruleInfo });
  };

  render = () => {
    let { clusterName, ruleInfo } = this.state;
    let { name, namespace, share, type, clbID, clbName, vip, port, protocol, host, path, backendGroups } = ruleInfo;

    return (
      <Card>
        <Card.Body
          title="规则信息"
          // operation={<Button type="link">修改命名空间</Button>}
        >
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
            {/*<Form.Item label="用户名">*/}
            {/*<Form.Text>{share}</Form.Text>*/}
            {/*</Form.Item>*/}
            <Form.Item label="已关联的服务器组">
              <Table
                compact
                verticalTop
                records={backendGroups}
                recordKey="name"
                columns={[
                  {
                    key: 'namespace',
                    header: '命名空间',
                  },
                  {
                    key: 'name',
                    header: '服务器组',
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

export { RuleDetail };
