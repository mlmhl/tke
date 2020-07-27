/**
 * 服务器组详情页 - 服务器
 * 主要使用两个接口，一个通过规则名称获取规则详情，一个通过服务器组名称和clb规则名称获取服务器信息
 */
import React from 'react';
import { Button, Card, Form, SelectMultiple, Table } from '@tencent/tea-component';

import { getRuleInfo, getBackendsInfo } from '../../../services/api';
import { BackendsGroupInfo } from './index';
import { RuleInfo } from '../components/RuleInfo';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

interface Project {
  id: string;
  name: string;
}

// interface BackendGroup {
//   name: string;
//
//   namespace: string;
// }
//
// interface BackendsGroupInfo {
//   name: string; // 规则名称
//
//   namespace: string; // 规则所在命名空间
//
//   share: boolean; // 是否是可共享规则
//
//   type: string; // 类型
//
//   clbID: string; // CLB 实例
//
//   clbName: string;
//
//   vip: string;
//
//   port: string;
//
//   protocol: string;
//
//   host: string;
//
//   path: string;
//
//   scope: string[]; // 共享的命名空间
//
//   backendGroups: BackendGroup[];
// }

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧

  backendsGroupInfo: BackendsGroupInfo;
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;
}

const convert = backendsGroupInfo => {
  if (isEmpty(backendsGroupInfo)) {
    return {
      name: '',
      namespace: '',
      pods: {},
      loadBalancers: [],
      podChoice: '',
    };
  }
  let {
    metadata: { name, namespace },
    spec: { pods, loadBalancers },
  } = backendsGroupInfo;
  let data = {
    name,
    namespace,
    pods,
    loadBalancers,
    podChoice: isEmpty(pods.byLabel) ? 'byName' : 'byLabel',
  };
  return data;
};

class ServerPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name } = this.state;

    if (
      !isEqual(nextProps.clusterName, clusterName) ||
      !isEqual(nextProps.namespace, namespace) ||
      !isEqual(nextProps.name, name)
    ) {
      this.setState(
        { clusterName: nextProps.clusterName, namespace: nextProps.namespace, name: nextProps.name },
        () => {
          if (nextProps.clusterName && nextProps.namespace && nextProps.name) {
            this.loadData();
          }
        }
      );
    }
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {};

  render = () => {
    let { clusterName, backendsGroupInfo } = this.state;
    let backendsGroup = convert(backendsGroupInfo);
    let { name, namespace, loadBalancers } = backendsGroup;

    return (
      <div>
        {loadBalancers.map(item => (
          <Card key={item}>
            <Card.Body title={`规则名称:${item}`}>
              <RuleInfo
                context={this.props.context}
                clusterName={clusterName}
                namespace={namespace}
                backendGroupName={name}
                ruleName={item}
              />
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };
}

export { ServerPanel };
