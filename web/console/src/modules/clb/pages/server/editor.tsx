/**
 * 服务器组编辑器
 */
import React, { useState } from 'react';
import { Form as FinalForm, Field, useForm } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  Bubble,
  Button,
  Card,
  ExternalLink,
  Form,
  Icon,
  Input,
  InputNumber,
  Radio,
  Select,
  SelectMultiple,
  Switch,
  Table,
  Tag,
  Text,
  Tooltip,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Cluster as ClusterType } from '../../models';
import { Ports } from './components/Ports';
import { Names } from './components/Names';
import { Selector } from './components/Selector';
import AutoSave from '../../components/AutoSave';
import {
  createBackendsGroup,
  getAllClusters,
  getAvailableInstancesByCluster,
  getAvailableListeners,
  getNamespacesByCluster,
  getNamespacesByProject,
  getRuleList,
} from '../../services/api';

const { findKey, get, has, isEqual, isEmpty, max, pick, stubString } = require('lodash');
const { sortable, filterable, scrollable, selectable, injectable } = Table.addons;

const labels = {
  name: '名称',
  typeChoice: '类型',
  cluster: '选择集群',
  project: '选择业务',
  namespace: '命名空间',
  loadBalancers: '选择规则',
  byName: '按Pod名',
  byLabel: '按Label',
  except: '排除Pod',
  podChoice: '选择Pod',
  ports: 'Pod端口',
  weight: '权重',
  deregisterPolicy: '解绑条件',
  webhook: '自定义解绑条件',
};

/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'http' },
  { text: 'TCP', value: 'tcp' },
  { text: 'UDP', value: 'udp' },
];

const required = value => (value ? undefined : 'Required');
const mustBeNumber = value => (isNaN(value) ? 'Must be a number' : undefined);
const minValue = min => value => (isNaN(value) || value >= min ? undefined : `Should be greater than ${min}`);
const composeValidators = (...validators) => value =>
  validators.reduce((error, validator) => error || validator(value), undefined);

const getStatus = meta => {
  if (meta.active && meta.validating) {
    return 'validating';
  }
  if (!meta.touched) {
    return null;
  }
  return meta.error ? 'error' : 'success';
};

// const formatRule = item => ({
//   name: get(item, 'metadata.name', stubString()), // 取值
//   type: findKey(
//     { pods: has(item, 'spec.pods'), service: has(item, 'spec.service'), static: has(item, 'spec.static') },
//     item => item
//   ), // 通过path是否存在判断消息内容的类型
//   backends: get(item, 'status.backends', 0),
//   registeredBackends: get(item, 'status.registeredBackends', 0),
//   relatedRules: max([get(item, 'spec.loadBalancers', 0), get(item, 'spec.lbName', 0), 0]), // 两个路径的对象会且只会存在一个，取出它的值来
// });

interface Project {
  id: string;
  name: string;
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

  failurePolicy: 'DoNothing' | 'IfNotReady' | 'IfNotRunning'; // 【设置成anyof。】Action taken by LBCF if invoking webhook failed. There are 3 available options:
  // DoNothing: No Pods will be deregistered. This is the default value.
  // IfNotReady: Same as the IfNotReady of deregisterPolicy
  // IfNotRunning: Same as the IfNotRunning of deregisterPolicy
}

interface EnsurePolicy {}

interface BackendGroup {
  loadBalancers: string[]; // 使用的LoadBalancer的name

  service?: ServiceBackend; // 被绑定至负载均衡的service配置。service、pods、static三种配置中只能存在一种

  pods?: PodBackend; // 被绑定至负载均衡的Pod配置。service、pods、static三种配置中只能存在一种

  static?: string[]; // 被绑定至负载均衡的静态地址配置。service、pods、static三种配置中只能存在一种

  parameters: any; // 绑定backend时使用的参数 map<string, string>

  deregisterPolicy?: string; // Pod解绑条件，仅当pods不为nil时有效，可选的值为IfNotReady、IfNotRunning、Webhook。不填时默认为IfNotReady。详见文档自定义解绑条件设计

  deregisterWebhook?: DeregisterWebhookSpec; // 通过Webhook判断Pod是否解绑，仅当deregisterPolicy为Webhook时有效。详见文档自定义解绑条件设计

  // ensurePolicy: EnsurePolicy; // 与LoadBalancer中的ensurePolicy相同
}

interface PropTypes {
  // clusterName: string; // 集群名称

  projects: Project[]; // 业务列表

  // value?: BackendGroup; // value 属性，和 onChange 对应的
  //
  onChange?: (value) => void;

  context: string; // 业务侧/平台侧
}

interface Rule {
  name: string; // 规则名称

  type: string; // 类型

  vip: string;

  protocol: string;

  port: string;

  host: string;

  path: string;
}

interface Namespace {
  id: string;

  name: string;
}

interface Name {
  id: number;

  text: string;
}

interface Webhook {
  driverName: string;
  failurePolicy: string;
}

interface StateTypes {
  isPlatform: boolean;

  clusters: ClusterType[]; // 集群列表

  namespaces: Namespace[];

  rules: Rule[];

  name: string; // 名称

  typeChoice: string; // 类型：pod直连

  podChoice: string; // 选择Pod

  project: string; // 所在业务

  clusterName: string; // 所在集群

  namespace: string; // 所在命名空间

  loadBalancers: string[]; // 规则名称数组

  byName?: Name[]; // Pod名称数组

  byLabel?: SelectPodByLabel;

  // except: Name[]; // Pod名称数组

  parameters: object; // { weigth: number }

  ports: any[]; // Pod端口

  deregisterPolicy: string; // 解绑条件

  deregisterWebhook: Webhook;
}

// 名称 - 文本框
const Name = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('请输入名称') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Input {...input} {...rest} />
      </Form.Item>
    )}
  </Field>
);

// 类型 - 单选框，Pod直连（只有一个选项，默认强制选中）
const TypeChoice = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('选择类型') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Radio.Group {...input} layout="column">
          <Radio name="podbackends">Pod直连</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

// 集群下拉选择框
const Cluster = ({ name, label, options, onChange }) => (
  <Field
    name={`${name}`}
    // required
    // validateOnBlur
    // validateFields={[]}
    validate={value => {
      return !value ? t('请选择集群') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Select
          {...input}
          {...rest}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          searchable
          type="simulate"
          appearence="button"
          size="l"
          boxSizeSync
          placeholder="选择集群"
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// 业务下拉选择框
const Project = ({ name, label, options, onChange }) => (
  <Field
    name={`${name}`}
    // required
    // validateOnBlur
    // validateFields={[]}
    validate={required}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Select
          {...input}
          {...rest}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          searchable
          type="simulate"
          appearence="button"
          size="l"
          boxSizeSync
          placeholder="选择业务"
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// 命名空间下拉选择框
const Namespace = ({ name, label, options, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('请选择命名空间') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Select
          {...input}
          {...rest}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          searchable
          type="simulate"
          appearence="button"
          size="l"
          boxSizeSync
          placeholder="请选择命名空间"
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// 从规则列表中选取规则，可多选，生成一个规则名称的数组
const LoadBalancers = ({ name, label, records }: { name: string; label: string; records: Rule[] }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('请选择至少一个要应用的规则') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        showStatusIcon={false}
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' ? meta.error : t('选择至少一个要应用的规则')}
      >
        <Table
          verticalTop
          compact
          records={records}
          recordKey="name"
          columns={[
            {
              key: 'name',
              header: '规则名称',
            },
            {
              key: 'type',
              header: '网络类型',
            },
            {
              key: 'vip',
              header: 'VIP',
            },
            {
              key: 'port',
              header: '端口',
              render: rule => (
                <p>
                  {rule.protocol}:{rule.port}
                </p>
              ),
            },
            {
              key: 'host',
              header: 'Host',
            },
            {
              key: 'path',
              header: 'Path',
            },
          ]}
          addons={[
            autotip({
              emptyText: '暂无数据',
            }),
            selectable({
              // 选框放在「消息类型」列上
              targetColumnKey: 'name',
              // 禁用全选
              all: false,
              // 已选中的键值
              ...input,
              // value: selectedKeys,
              // // 选中键值发生变更
              // onChange: value => setSelectedKeys(value),
            }),
          ]}
        />
      </Form.Item>
    )}
  </Field>
);

// 选择Pod 的选择：按Label，按Pod名
const PodChoice = ({ name, label, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '选择类型' : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Radio.Group
          {...input}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          // layout="column"
        >
          <Radio name="byLabel">按 Label</Radio>
          <Radio name="byName">按 Pod 名</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

const SelectorAdaptor = ({ name, label, clusterName, namespace }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '请选择selector' : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Selector {...input} clusterName={clusterName} namespace={namespace} />
      </Form.Item>
    )}
  </Field>
);

// const Except = ({ name, label }) => (
//   <Field
//     name={`${name}`}
//     validate={value => {
//       return !value ? t('请设置except') : undefined;
//     }}
//   >
//     {({ input, meta, ...rest }) => (
//       <Form.Item
//         label={`${label}`}
//         required
//         status={getStatus(meta)}
//         message={getStatus(meta) === 'error' && meta.error}
//       >
//         <Input {...input} />
//       </Form.Item>
//     )}
//   </Field>
// );

// 选择pod - 按Label
const SelectPodByLabel = ({ name, label, clusterName, namespace }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('请设置except') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`} status={getStatus(meta)} message={getStatus(meta) === 'error' && meta.error}>
        <Card bordered>
          <Card.Body>
            <SelectorAdaptor
              name={`${name}.selector`}
              label="selector"
              clusterName={clusterName}
              namespace={namespace}
            />
            <NamesAdaptor name={`${name}.except`} label="排除 Pod" />
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
          label={t('协议')}
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
        >
          <Select
            {...input}
            type="simulate"
            appearence="button"
            size="m"
            placeholder="请选择网络协议"
            options={ProtocolList}
          />
        </Form.Item>
      )}
    </Field>
    <Field name={`${name}.port`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={t('端口')}
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
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
        required
        showStatusIcon={false}
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
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
        showStatusIcon={false}
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Names {...input} />
      </Form.Item>
    )}
  </Field>
);

// 权重
const Weight = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item label="权重(0-100)" status={getStatus(meta)} message={getStatus(meta) === 'error' && meta.error}>
        <InputNumber min={0} max={100} {...input} />
      </Form.Item>
    )}
  </Field>
);

// 参数
const Parameters = () => (
  <>
    <Weight name="parameters.weight" label="权重" />
  </>
);

// Pod解绑条件，仅当pods不为nil时有效，可选的值为IfNotReady、IfNotRunning、Webhook。不填时默认为IfNotReady。详见文档自定义解绑条件设计
const DeregisterPolicy = ({ name, label, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '请选择Pod解绑条件' : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Radio.Group
          {...input}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          layout="column"
        >
          <Radio name="IfNotReady">
            IfNotReady<Text theme="weak">K8S默认条件，Pod不再Ready时解绑</Text>
          </Radio>
          <Radio name="IfNotRunning">
            IfNotRunning<Text theme="weak">Pod不再Running时解绑（绑定条件依旧为Pod Ready）</Text>
          </Radio>
          <Radio name="Webhook">
            自定义<Text theme="weak">当Pod不再Ready，且非deleting状态时，通过webhook自定义解绑条件</Text>
          </Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

const DeregisterWebhook = () => (
  <Card bordered>
    <Card.Body>
      <Field
        name="deregisterWebhook.driverName"
        validate={value => {
          return !value ? t('请选择driverName') : undefined;
        }}
      >
        {({ input, meta, ...rest }) => (
          <Form.Item
            label="driverName"
            required
            status={getStatus(meta)}
            message={getStatus(meta) === 'error' && meta.error}
          >
            <Input {...input} />
            <span>参见</span>
            <ExternalLink
              href="https://github.com/tkestack/lb-controlling-framework/blob/master/docs/design/lbcf-crd.md#%E8%8C%83%E4%BE%8B6%E8%87%AA%E5%AE%9A%E4%B9%89%E8%A7%A3%E7%BB%91%E6%9D%A1%E4%BB%B6"
              style={{ marginRight: 10 }}
            >
              LBCF的自定义解绑条件
            </ExternalLink>
          </Form.Item>
        )}
      </Field>
      <Field
        name="deregisterWebhook.failurePolicy"
        validate={value => {
          return !value ? t('请选择failurePolicy') : undefined;
        }}
      >
        {({ input, meta, ...rest }) => (
          <Form.Item label="failurePolicy" status={getStatus(meta)} message={getStatus(meta) === 'error' && meta.error}>
            <Input {...input} />
            <span>参见</span>
            <ExternalLink
              href="https://github.com/tkestack/lb-controlling-framework/blob/master/docs/design/lbcf-crd.md#%E8%8C%83%E4%BE%8B6%E8%87%AA%E5%AE%9A%E4%B9%89%E8%A7%A3%E7%BB%91%E6%9D%A1%E4%BB%B6"
              style={{ marginRight: 10 }}
            >
              LBCF的自定义解绑条件
            </ExternalLink>
          </Form.Item>
        )}
      </Field>
    </Card.Body>
  </Card>
);

const DeregisterWebhookAdaptor = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? t('请设置Webhook') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <DeregisterWebhook />
      </Form.Item>
    )}
  </Field>
);

class BackendsGroupEditor extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    // data: this.props.value,
    clusters: [],
    namespaces: [],
    rules: [],

    name: '', // 名称
    typeChoice: 'podbackends', // 类型：pod直连
    podChoice: 'byLabel', // 选择Pod
    project: '', // 所在业务
    clusterName: '', // 所在集群
    namespace: '', // 所在命名空间
    loadBalancers: [], // 规则名称数组
    byName: [], // 规则名称数组
    byLabel: {
      selector: {},
      except: [],
    },
    // except: [], // 排除Pod数组
    ports: [], // Pod 端口
    parameters: {
      // weight: 0,
    },
    deregisterPolicy: 'IfNotReady',
    deregisterWebhook: {
      driverName: '',
      failurePolicy: '',
    },
  };

  componentDidMount() {
    this.loadData();
  }

  // componentWillReceiveProps(nextProps, nextContext) {
  //   const { data } = this.state;
  //   const { value } = nextProps;
  //
  //   if (!isEqual(data, value)) {
  //     console.log('rerender');
  //     this.setState({ data: value });
  //   }
  // }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    const { isPlatform, project } = this.state;
    if (!isEmpty(project)) {
      await this.getNamespaceList();
    }
    if (isPlatform) {
      await this.getClusterList();
    }
  };

  /**
   * 获取集群列表
   * 用于初始化集群下拉选择框
   */
  getClusterList = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters });
    // 缓存处理（如果没有从父组件传入clusterName的话使用缓存中的）
    let { clusterName } = this.state;
    let selectedClusterName = clusterName || window.localStorage.getItem('selectedClusterName');
    if (clusters.map(item => item.name).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  /**
   * 获取业务下的命名空间列表
   * 适用于业务侧
   */
  getNamespaceList = async () => {
    const { project } = this.state;
    const namespaces = await getNamespacesByProject(project);
    this.setState({ namespaces });
  };

  /**
   * 获取可用的clb规则列表
   */
  getRuleList = async (clusterName, namespace) => {
    let rules = await getRuleList(clusterName, namespace);
    this.setState({ rules });
  };

  handleClusterChanged = async clusterName => {
    let namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, namespaces });
    // 缓存处理（如果没有从父组件传入clusterName的话使用缓存中的）
    let { namespace } = this.state;
    let selectedNamespace = namespace || window.localStorage.getItem('selectedNamespace');
    if (namespaces.map(item => item.name).includes(selectedNamespace)) {
      this.handleNamespaceChanged(selectedNamespace);
    }
  };

  /**
   * 切换业务的时候更新命名空间
   * NOTE: 业务选择器的数据源是从wrapper传过来的
   * @param project 业务id
   */
  handleProjectChanged = project => {
    this.setState({ project }, () => {
      this.getNamespaceList();
    });
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleNamespaceChanged = namespace => {
    let { namespaces } = this.state;
    let { clusterName } = namespaces.find(item => item.name === namespace);
    this.setState({ clusterName, namespace }, () => {
      this.getRuleList(clusterName, namespace);
    });
  };

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
        // parameters,
        parameters: {
          weight: String(parameters.weight),
        },
      },
    };

    return payload;
  };

  submit = async values => {
    let { clusterName, namespace } = this.state;

    try {
      let payload = this.stateToPayload(values);
      // if (!isEdit) {
      let response = await createBackendsGroup(clusterName, namespace, payload);
      // let response = await createBackendsGroup(clusterName, 'tfan', payload_bylabel);
      // let response = await createBackendsGroup(clusterName, 'tfan', payload_byname);
    } catch (err) {
      // message.error(err)
    }
  };

  render = () => {
    let { projects } = this.props;
    let {
      namespaces,
      clusters,
      clusterName,
      name,
      project,
      namespace,
      loadBalancers,
      byName,
      byLabel,
      ports,
      parameters,
      deregisterPolicy,
      deregisterWebhook,
      isPlatform,
      typeChoice,
      podChoice,
      rules,
    } = this.state;
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    // TODO: 业务侧下面通过*无法获取关联的集群，去掉
    // namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));

    const save = form => {
      return async values => {
        // if (onChange) {
        //   onChange(form.getState());
        // }
      };
    };

    const onFormChange = formState => {
      let { onChange } = this.props;
      let {
        name,
        typeChoice,
        loadBalancers,
        byLabel,
        byName,
        ports,
        parameters,
        deregisterPolicy,
        deregisterWebhook,
      } = formState.values;
      this.setState({
        name,
        typeChoice,
        loadBalancers,
        byLabel,
        byName,
        ports,
        parameters,
        deregisterPolicy,
        deregisterWebhook,
      });
      if (onChange) {
        onChange({ values: formState.values, valid: formState.valid });
      }
    };

    const validate = async ({ clbId, scope }) => {
      if (!clbId) {
        return t('请选择一个实例');
      }
      // if (!/(?!^[._-].*)(?!.*[._-]$)(?!.*[._-]{2,}.*)(?=^[0-9a-z._-]{2,26}$)[0-9a-z._-]+/.test(repo_name)) {
      //   return t('长度2-26个字符，只能包含小写字母、数字及分隔符("."、"_"、"-")，且不能以分隔符开头、结尾或连续');
      // }
      // let response = await WebAPI.fetchRepositoryList(
      //   {},
      //   {
      //     exact_query: `${project_name}/${repo_name}`,
      //   }
      // );
      // if (response.records.length) {
      //   return t('名称重复');
      // }
    };

    return (
      <FinalForm
        onSubmit={this.submit}
        // initialValuesEqual={() => true}
        initialValues={{
          name,
          project,
          clusterName,
          namespace,
          typeChoice,
          podChoice,
          loadBalancers,
          byName,
          byLabel,
          ports,
          parameters,
          deregisterPolicy,
          deregisterWebhook,
        }}
        // mutators={{ setFieldData }}
        // subscription={{}}
      >
        {({ form, handleSubmit, validating, submitting, values, valid }) => {
          return (
            <form id="backendsGroupForm" onSubmit={handleSubmit}>
              <AutoSave setFieldData={form.mutators.setFieldData} onChange={onFormChange} />
              <Form layout="vertical">
                <Name name="name" label={labels.name} />
                <TypeChoice name="typeChoice" label={labels.typeChoice} />
                {isPlatform ? (
                  <Cluster
                    name="clusterName"
                    label={labels.cluster}
                    options={clusterList}
                    onChange={this.handleClusterChanged}
                  />
                ) : (
                  <Project
                    name="project"
                    label={labels.project}
                    options={projectList}
                    onChange={this.handleProjectChanged}
                  />
                )}
                <Namespace
                  name="namespace"
                  label={labels.namespace}
                  options={namespaceList}
                  onChange={this.handleNamespaceChanged}
                />
                <LoadBalancers name="loadBalancers" label={labels.loadBalancers} records={rules} />
                <PodChoice name="podChoice" label="选择 Pod" onChange={value => this.setState({ podChoice: value })} />
                {podChoice === 'byLabel' ? (
                  <SelectPodByLabel
                    name="byLabel"
                    label={labels.byLabel}
                    clusterName={clusterName}
                    namespace={namespace}
                  />
                ) : (
                  <NamesAdaptor name="byName" label={labels.byName} />
                )}
                <PortsAdaptor name="ports" label={labels.ports} />
                {/*<PortSelector name="ports" label={labels.ports} />*/}
                <Parameters />
                <DeregisterPolicy
                  name="deregisterPolicy"
                  label={labels.deregisterPolicy}
                  onChange={value => {
                    // this.setState({ deregisterPolicy: value });
                  }}
                />
                {deregisterPolicy === 'Webhook' && (
                  <DeregisterWebhookAdaptor name="deregisterWebhook" label={labels.deregisterPolicy} />
                )}
              </Form>
            </form>
          );
        }}
      </FinalForm>
    );
  };
}

export { BackendsGroupEditor };
