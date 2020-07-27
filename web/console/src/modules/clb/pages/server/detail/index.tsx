import React from 'react';
import { Layout } from '@tea/component/layout';
import { Tabs, TabPanel } from '@tea/component/tabs';

import { createBackendsGroup, getBackendsGroupInfo } from '../../../services/api';
const { isEqual, isEmpty, pick } = require('lodash');

import { InfoPanel } from './info';
import { ServerPanel } from './server';
import { EventsPanel } from './events';
import { YamlPanel } from './yaml';

const { Body, Content } = Layout;

const tabs = [
  { id: 'info', label: '详情' },
  { id: 'server', label: 'CLB规则与服务器' },
  { id: 'events', label: '事件' },
  { id: 'yaml', label: 'YAML' },
];

/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'http' },
  { text: 'TCP', value: 'tcp' },
  { text: 'UDP', value: 'udp' },
];

interface Project {
  id: string;
  name: string;
}

interface Backend {
  name: string;

  namespace: string;
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface PortSelector {
  port: number; // 端口号

  protocol: string; // 支持TCP和UDP，默认TCP
}

interface ServiceBackend {
  name: string; // 被绑定Service的name

  port: PortSelector; // 用来选择被绑定的Service Port

  nodeSelector: any; // 用来选择被绑定的计算节点，只有label与之匹配的节点才会被绑定。为空是，选中所有节点
  // map<string, string>
}

interface SelectPodByLabel {
  selector: any; // map<string, string> 被选中的Pod label

  except?: string[]; // Pod.name数组，数组中的Pod不会被选中，如果之前已被选中，则会触发该Pod的解绑流程
}

interface PodBackend {
  ports: PortSelector[]; // 用来选择被绑定的容器内端口

  byLabel?: SelectPodByLabel; // 通过label选择Pod

  byName?: string[]; // 通过Pod.name选择Pod
}

interface DeregisterWebhookSpec {
  driverName: string; // The name of LoadBalancerDriver.

  failurePolicy: 'DoNothing' | 'IfNotReady' | 'IfNotRunning';
}

interface EnsurePolicy {}

interface BackendsGroupInfo {
  name: string;

  namespace: string;

  loadBalancers: string[]; // 使用的LoadBalancer的name

  service?: ServiceBackend; // 被绑定至负载均衡的service配置。service、pods、static三种配置中只能存在一种

  podChoice?: string;

  pods?: PodBackend; // 被绑定至负载均衡的Pod配置。service、pods、static三种配置中只能存在一种

  static?: string[]; // 被绑定至负载均衡的静态地址配置。service、pods、static三种配置中只能存在一种

  parameters?: any; // 绑定backend时使用的参数 map<string, string>

  deregisterPolicy?: string; // Pod解绑条件，仅当pods不为nil时有效，可选的值为IfNotReady、IfNotRunning、Webhook。不填时默认为IfNotReady。详见文档自定义解绑条件设计

  deregisterWebhook?: DeregisterWebhookSpec; // 通过Webhook判断Pod是否解绑，仅当deregisterPolicy为Webhook时有效。详见文档自定义解绑条件设计

  ensurePolicy?: EnsurePolicy; // 与LoadBalancer中的ensurePolicy相同
}

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;
}

class ServerDetail extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: {} as BackendsGroupInfo,
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name } = this.state;

    if (!isEqual(nextProps.clusterName, clusterName) || !isEqual(nextProps.namespace, namespace) || !isEqual(nextProps.name, name)) {
      this.setState({ clusterName: nextProps.clusterName, namespace: nextProps.namespace, name: nextProps.name }, () => {
        if (nextProps.clusterName && nextProps.namespace && nextProps.name) {
          this.loadData();
        }
      });
    }
  }

  componentDidMount() {
    this.loadData();
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    await this.getBackendsGroupInfo();
  };

  getBackendsGroupInfo = async () => {
    let { clusterName, namespace, name } = this.state;
    let backendsGroupInfo: BackendsGroupInfo = await getBackendsGroupInfo(clusterName, namespace, name);
    this.setState({ backendsGroupInfo });
  };

  render() {
    let { backendsGroupInfo } = this.state;

    return (
      <div>
        <Tabs ceiling animated={false} tabs={tabs}>
          <TabPanel id="info">
            <InfoPanel {...this.props} backendsGroupInfo={backendsGroupInfo} />
          </TabPanel>
          <TabPanel id="server">
            <ServerPanel {...this.props} backendsGroupInfo={backendsGroupInfo} />
          </TabPanel>
          <TabPanel id="events">
            <EventsPanel {...this.props} backendsGroupInfo={backendsGroupInfo} />
          </TabPanel>
          <TabPanel id="yaml">
            <YamlPanel {...this.props} backendsGroupInfo={backendsGroupInfo} />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export { ServerDetail, BackendsGroupInfo };
