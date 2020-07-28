/**
 * 服务器组详情页 - 基本信息
 */
import React from 'react';
import { Button, Card, Form, Input, Radio, Select, Table } from '@tencent/tea-component';

import { Field, Form as FinalForm } from 'react-final-form';
import { createBackendsGroup, getBackendsGroupInfo } from '../../../services/api';
import { Selector } from '@src/modules/clb/pages/server/components/Selector';
import { Ports } from '@src/modules/clb/pages/server/components/Ports';
import { Names } from '@src/modules/clb/pages/server/components/Names';
import { BackendsGroupInfo } from './index';
const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'http' },
  { text: 'TCP', value: 'tcp' },
  { text: 'UDP', value: 'udp' },
];

// interface Project {
//   id: string;
//   name: string;
// }
//
// interface Backend {
//   name: string;
//
//   namespace: string;
// }
//
// interface Cluster {
//   name: string;
//
//   displayName: string;
//
//   phase: string;
// }
//
// interface PortSelector {
//   port: number; // 端口号
//
//   protocol: string; // 支持TCP和UDP，默认TCP
// }
//
// interface ServiceBackend {
//   name: string; // 被绑定Service的name
//
//   port: PortSelector; // 用来选择被绑定的Service Port
//
//   nodeSelector: any; // 用来选择被绑定的计算节点，只有label与之匹配的节点才会被绑定。为空是，选中所有节点
//   // map<string, string>
// }
//
// interface SelectPodByLabel {
//   selector: any; // map<string, string> 被选中的Pod label
//
//   except?: string[]; // Pod.name数组，数组中的Pod不会被选中，如果之前已被选中，则会触发该Pod的解绑流程
// }
//
// interface PodBackend {
//   ports: PortSelector[]; // 用来选择被绑定的容器内端口
//
//   byLabel?: SelectPodByLabel; // 通过label选择Pod
//
//   byName?: string[]; // 通过Pod.name选择Pod
// }
//
// interface DeregisterWebhookSpec {
//   driverName: string; // The name of LoadBalancerDriver.
//
//   failurePolicy: 'DoNothing' | 'IfNotReady' | 'IfNotRunning';
// }
//
// interface EnsurePolicy {}

// interface BackendsGroupInfo {
//   name: string;
//
//   namespace: string;
//
//   loadBalancers: string[]; // 使用的LoadBalancer的name
//
//   service?: ServiceBackend; // 被绑定至负载均衡的service配置。service、pods、static三种配置中只能存在一种
//
//   podChoice?: string;
//
//   pods?: PodBackend; // 被绑定至负载均衡的Pod配置。service、pods、static三种配置中只能存在一种
//
//   static?: string[]; // 被绑定至负载均衡的静态地址配置。service、pods、static三种配置中只能存在一种
//
//   parameters?: any; // 绑定backend时使用的参数 map<string, string>
//
//   deregisterPolicy?: string; // Pod解绑条件，仅当pods不为nil时有效，可选的值为IfNotReady、IfNotRunning、Webhook。不填时默认为IfNotReady。详见文档自定义解绑条件设计
//
//   deregisterWebhook?: DeregisterWebhookSpec; // 通过Webhook判断Pod是否解绑，仅当deregisterPolicy为Webhook时有效。详见文档自定义解绑条件设计
//
//   ensurePolicy?: EnsurePolicy; // 与LoadBalancer中的ensurePolicy相同
// }

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧

  backendsGroupInfo: BackendsGroupInfo;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  // podChoice: string; // 选择Pod
}

// 名称 - 文本框
const Name = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Form.Text>{input.value}</Form.Text>
      </Form.Item>
    )}
  </Field>
);

// 命名空间下拉选择框
const Namespace = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Form.Text>{input.value}</Form.Text>
      </Form.Item>
    )}
  </Field>
);

// 选择Pod 的选择：按Label，按Pod名
const PodChoice = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Radio.Group {...input} layout="column" disabled>
          <Radio name="byLabel">按Label</Radio>
          <Radio name="byName">按Pod名</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

const SelectorAdaptor = ({ name, label, clusterName, namespace }) => (
  <Field
    name={`${name}`}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Selector {...input} clusterName={clusterName} namespace={namespace} />
      </Form.Item>
    )}
  </Field>
);

const Except = ({ name, label }) => (
  <Field
    name={`${name}`}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Input {...input} />
      </Form.Item>
    )}
  </Field>
);

// 选择pod - 按Label
const SelectPodByLabel = ({ name, label, clusterName, namespace }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`}>
        <Card bordered>
          <Card.Body>
            <SelectorAdaptor
              name={`${name}.selector`}
              label="selector"
              clusterName={clusterName}
              namespace={namespace}
            />
            <NamesAdaptor name={`${name}.except`} label="排除Pod" />
          </Card.Body>
        </Card>
      </Form.Item>
    )}
  </Field>
);

// 选择pod - 按Pod名称，字符串数组
const PortSelector = ({ name, label }) => (
  <>
    <Field name={`${name}.protocol`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={'协议'}
        >
          <Select
            {...input}
            type="simulate"
            appearence="button"
            size="m"
            placeholder={'请选择网络协议'}
            options={ProtocolList}
          />
        </Form.Item>
      )}
    </Field>
    <Field name={`${name}.port`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={'端口'}
        >
          <Input {...input} />
        </Form.Item>
      )}
    </Field>
  </>
);

// Pod端口
const PortsAdaptor = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
      >
        <Ports {...input} />
      </Form.Item>
    )}
  </Field>
);

// Pod名称
const NamesAdaptor = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
      >
        <Names {...input} />
      </Form.Item>
    )}
  </Field>
);

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

class InfoPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,
  };

  componentDidMount() {
    // this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { clusterName, namespace, name, backendsGroupInfo } = this.state;

    if (
      !isEqual(nextProps.clusterName, clusterName) ||
      !isEqual(nextProps.namespace, namespace) ||
      !isEqual(nextProps.name, name) ||
      !isEqual(nextProps.backendsGroupInfo, backendsGroupInfo)
    ) {
      this.setState({
        clusterName: nextProps.clusterName,
        namespace: nextProps.namespace,
        name: nextProps.name,
        backendsGroupInfo: nextProps.backendsGroupInfo,
      });
    }
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  // loadData = async () => {
  //   await this.getBackendsGroupInfo();
  // };

  // getBackendsGroupInfo = async () => {
  //   let { clusterName, namespace, name } = this.state;
  //   let backendsGroupInfo: BackendsGroupnfo = await getBackendsGroupInfo(clusterName, namespace, name);
  //   this.setState({ backendsGroupInfo });
  // };

  stateToPayload = values => {
    let { name, namespace, loadBalancers, ports, podChoice, byLabel, byName, parameters } = values;
    let pods = Object.assign({}, podChoice === 'byLabel' ? { byLabel } : { byName }, {
      ports: ports.map(({ protocol, port }) => ({ protocol, port })),
    });
    let payload = {
      apiVersion: 'lbcf.tkestack.io/v1beta1',
      kind: 'BackendGroup',
      metadata: { name, namespace },
      spec: {
        loadBalancers,
        pods,
        parameters,
      },
    };

    return payload;
  };

  submit = async values => {
    let { clusterName, namespace } = this.state;

    try {
      let payload = this.stateToPayload(values);
      let response = await createBackendsGroup(clusterName, namespace, payload);
    } catch (err) {}
  };

  render = () => {
    let { clusterName, backendsGroupInfo } = this.state;
    let backendsGroup = convert(backendsGroupInfo);
    let { name, namespace, loadBalancers, podChoice, pods } = backendsGroup;
    let { byLabel, byName, ports } = pods;

    return (
      <FinalForm
        onSubmit={this.submit}
        initialValuesEqual={() => true}
        initialValues={{
          name,
          namespace,
          podChoice,
          loadBalancers,
          byName,
          byLabel,
          ports,
        }}
        subscription={{}}
      >
        {({ form, handleSubmit, validating, submitting, values, valid }) => {
          return (
            <form id="backendsGroupForm" onSubmit={handleSubmit}>
              <Card>
                <Card.Body>
                  <Form>
                    <Name name="name" label="名称" />
                    <Namespace name="namespace" label="命名空间" />
                    <PodChoice
                      name="podChoice"
                      label="选择Pod"
                    />
                    {podChoice === 'byLabel' ? (
                      <SelectPodByLabel
                        name="byLabel"
                        label="按Label"
                        clusterName={clusterName}
                        namespace={namespace}
                      />
                    ) : (
                      <NamesAdaptor name="byName" label="按Pod名" />
                    )}
                    <PortsAdaptor name="ports" label="Pod端口" />
                  </Form>
                  <Form.Action>
                    <Button type="primary">保存</Button>
                    <Button>取消</Button>
                  </Form.Action>
                </Card.Body>
              </Card>
            </form>
          );
        }}
      </FinalForm>
    );
  };
}

export { InfoPanel };
