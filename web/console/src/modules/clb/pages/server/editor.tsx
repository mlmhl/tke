/**
 * 服务器组编辑器
 */
import React from 'react';
import { Form as FinalForm, Field, useForm } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
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
  Text,
  Tooltip,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import AutoSave from '../../components/AutoSave';
import {
  createRule,
  getAllClusters,
  getAvailableInstancesByCluster,
  getAvailableListeners,
  getNamespacesByCluster,
  getNamespacesByProject,
} from '../../services/api';
import { ListenerType } from '@src/modules/clb/pages/rule/RuleEditor';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

const labels = {
  name: '名称',
  typeChoice: '类型',
  cluster: '选择集群',
  project: '选择业务',
  namespace: '命名空间',
  podChoice: '选择Pod',
  ports: 'Pod端口',
  weight: '权重',
  useListener: '使用监听器',
  showListener: '使用已有监听器',
  newListener: '新建监听器',
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

interface Instance {
  ruleName?: string; // 规则名称

  clbName: string; // CLB 名称

  clbId: string; // CLB ID

  type: string; // 网络类型
}

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

  ensurePolicy: EnsurePolicy; // 与LoadBalancer中的ensurePolicy相同
}

interface PropTypes {
  // clusterName: string; // 集群名称

  projects: Project[]; // 业务列表

  // value?: RuleType; // value 属性，和 onChange 对应的
  //
  // onChange?: (value) => void;
  context: string; // 业务侧/平台侧
}

interface Rule {
  name: string; // 规则名称

  project: string; // 所属业务

  namespace: string; // 规则所在命名空间

  scope: string[]; // 共享的命名空间

  lbID: string; // CLB 实例

  useListener: string; // 使用监听器

  listener: ListenerType;
}

interface StateTypes {
  data?: BackendGroup;

  rules: Rule[]; // 可用实例

  namespaces: String[]; // 集群或业务下的命名空间列表

  clusters: String[]; // 集群列表

  clusterName: string; // 命名空间对应的集群

  listenerList: any[];
}

// 名称 - 文本框
const Name = ({ name, label }) => (
  <Field name={`${name}`} validate={value => {}}>
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
          type="simulate"
          appearence="button"
          size="m"
          placeholder={t('选择集群')}
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
          type="simulate"
          appearence="button"
          size="m"
          placeholder={t('选择业务')}
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
      console.log('namespace value = ', value);
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
          type="simulate"
          appearence="button"
          size="m"
          placeholder={t('请选择命名空间')}
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// Pod解绑条件，仅当pods不为nil时有效，可选的值为IfNotReady、IfNotRunning、Webhook。不填时默认为IfNotReady。详见文档自定义解绑条件设计
const DeregisterPolicy = ({ name, label }) => (
  <>
    <Field
      name={`${name}.policy`}
      validate={value => {
        return !value ? t('请选择Pod解绑条件') : undefined;
      }}
    >
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={`${label}`}
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
        >
          <Radio.Group {...input}>
            <Radio name="IfNotReady">
              <span>IfNotReady</span>
              <Tooltip title={t('K8S默认条件，Pod不再Ready时解绑')}>
                <Icon type="info" />
              </Tooltip>
            </Radio>
            <Radio name="IfNotRunning">
              <span>IfNotRunning</span>
              <Tooltip title={t('Pod不再Running时解绑（绑定条件依旧为Pod Ready）')}>
                <Icon type="info" />
              </Tooltip>
            </Radio>
            <Radio name="Webhook">
              <span>自定义</span>
              <Tooltip title={t('当Pod不再Ready，且非deleting状态时，通过webhook自定义解绑条件')}>
                <Icon type="info" />
              </Tooltip>
            </Radio>
          </Radio.Group>
        </Form.Item>
      )}
    </Field>
    <Field
      name="deregisterWebhook.driverName"
      validate={value => {
        console.log('driverName value = ', value);
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
        console.log('failurePolicy value = ', value);
        return !value ? t('请选择failurePolicy') : undefined;
      }}
    >
      {({ input, meta, ...rest }) => (
        <Form.Item
          label="failurePolicy"
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
  </>
);

// 选择Pod 的选择：按Label，按Pod名
const PodChoice = ({ name, label }) => (
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

const Selector = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      console.log('selector value = ', value);
      return !value ? t('请选择selector') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Input {...input} />
      </Form.Item>
    )}
  </Field>
);

const Except = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      console.log('except value = ', value);
      return !value ? t('请设置except') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Input {...input} />
      </Form.Item>
    )}
  </Field>
);

// 选择pod - 按Label
const SelectPodByLabel = ({ name, label }) => (
  <>
    <Selector name="selector" label="selector" />
    <Except name="except" label="排除Pod" />
  </>
);

// 选择pod - 按Pod名称，字符串数组
const SelectPodByName = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      console.log('SelectPodByName value = ', value);
      return !value ? t('请输入pod名称') : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Input {...input} />
      </Form.Item>
    )}
  </Field>
);

// 选择Pod
const PodSelector = ({ name, label }) => (
  <>
    <PodChoice name="podChoice" label="选择Pod" />
    <SelectPodByLabel name="byLabel" label="" />
    <SelectPodByName name="byName" label="" />
  </>
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
            placeholder={t('请选择网络协议')}
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

// 自定义列表形式实现
const Ports = (
  <>
    <PortSelector name="selector" label="selector" />
    <Button>添加</Button>
  </>
);

// 权重
const Weight = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={t('权重')}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <InputNumber min={0} max={100} {...input} />
      </Form.Item>
    )}
  </Field>
);

// 参数
const Parameters = ({ name, onClick }) => (
  <>
    <Weight name="weight" label={t('权重')} />
  </>
);

class BackendsGroupEditor extends React.Component<PropTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    // data: this.props.value,
    clusters: [],
    instances: [],
    namespaces: [],
    // selectedCLB: '',
    // isShareRule: true,
    clusterName: '',
    listenerList: [], // 现有监听器列表

    name: '', // 名称
    typeSelector: 'podbackends', // 类型：pod直连
    podChoic: 'byLabel', // 选择Pod
    project: '',
    namespace: '', // 规则所在命名空间
    scope: [], // 共享的命名空间
    lbID: '', // CLB 实例
    useListener: 'new', // 使用监听器
    listener: {
      protocol: '',
      port: '',
      host: '',
      path: '',
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
    const { isPlatform, project, namespace } = this.state;
    if (!isEmpty(project)) {
      await this.getNamespaceList();
    }
    if (isPlatform) {
      await this.getClusterList();
    }
  };

  getClusterList = async () => {
    let clusters = await getAllClusters();
    console.log('clusters@getClusterList = ', clusters);
    this.setState({ clusters });
  };

  getNamespaceList = async () => {
    const { project } = this.state;
    const namespaces = await getNamespacesByProject(project);
    this.setState({ namespaces });
  };

  /**
   * 获取可用的clb实例列表
   */
  getInstanceList = async () => {
    let { clusterName } = this.state;
    let instances = await getAvailableInstancesByCluster(clusterName);
    // NOTE: 这里的接口数据是直接从公有云的接口返回的，因此跟tkestack的规范约定并不一致
    instances = instances.map(({ LoadBalancerId, LoadBalancerName, LoadBalancerVips, LoadBalancerType }) => ({
      clbId: LoadBalancerId,
      clbName: LoadBalancerName,
      vips: LoadBalancerVips,
      type: LoadBalancerType,
    }));

    const namespaces = await getNamespacesByCluster(clusterName);
    // this.setState({ instances });
  };

  /**
   * 获取现有的监听器列表
   * 由上面选中的clb实例决定的，需要clbId
   */
  getListenerList = async () => {
    let { clusterName, lbID } = this.state;
    let list = await getAvailableListeners(clusterName, lbID);
    this.setState({ listenerList: list });
  };

  /**
   * 分配随机端口
   */
  handleGeneratePort = () => {
    //
  };

  handleClusterChanged = async clusterName => {
    console.log('clusterName = ', clusterName);
    let namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, namespaces });
  };

  /**
   * 切换业务的时候更新命名空间
   * NOTE: 业务选择器的数据源是从wrapper传过来的
   * @param projectId 业务id
   */
  handleProjectChanged = project => {
    console.log('project = ', project);
    this.getNamespaceList();
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleNamespaceChanged = namespace => {
    console.log('namespace = ', namespace);
    let { namespaces } = this.state;
    let { clusterName } = namespaces.find(item => item.name === namespace);
    this.setState({ clusterName }, () => {
      this.getInstanceList();
    });
  };

  handleScopeChanged = value => {
    console.log('new scope = ', value);
    // let { data } = this.state;
    // let newData = Object.assign(data, { scope: value });
    // this.setState({ data: newData });
  };

  handleLBIDChanged = value => {
    console.log('new lbID = ', value);
    // let { data } = this.state;
    // let newData = Object.assign(data, { lbID: value });
    // this.setState({ data: newData });
  };

  stateToPayload = data => {
    // let { currentItem } = this.state;
    // let { name, isSharedRule, namespace, scope, lbID, listener } = data;
    let payload = Object.assign({}, pick(data, ['name', 'namespace', 'scope', 'lbID']), {
      listener: { ...data.listener, port: Number(data.listener.port) },
    });
    console.log('payload = ', payload);

    return payload;
  };

  submit = async values => {
    let { clusterName } = this.state;
    // let {  } = currentItem;

    try {
      let payload = this.stateToPayload(Object.assign({}, { clusterName }, ...values));
      // if (!isEdit) {
      let response = await createRule(clusterName, payload);
      console.log('response@save = ', response);
    } catch (err) {
      // message.error(err)
    }
  };

  render = () => {
    console.log('render@RuleEditor');
    let { projects } = this.props;
    let {
      instances,
      namespaces,
      clusters,
      clusterName,
      listenerList,
      name,
      project,
      namespace,
      scope,
      lbID,
      useListener,
      listener,
      isPlatform,
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
        console.log('values = ', values);
        console.log('form.getState() = ', form.getState());
        // if (onChange) {
        //   onChange(form.getState());
        // }
      };
    };

    const onFormChange = formState => {
      // let { onChange } = this.props;
      // let { data } = this.state;
      // let { clbId, scope } = data;
      console.log('formState = ', formState);
      // if (onChange) {
      //   onChange({ values: formState.values, valid: formState.valid });
      // }
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
        initialValuesEqual={() => true}
        initialValues={{
          name,
          project,
          namespace,
          scope,
          lbID,
          useListener,
          listener,
        }}
        mutators={{ setFieldData }}
        subscription={{}}
      >
        {({ form, handleSubmit, validating, submitting, values, valid }) => {
          return (
            <form id="ruleForm" onSubmit={handleSubmit}>
              <AutoSave setFieldData={form.mutators.setFieldData} save={save(form)} onChange={onFormChange} />
              <Form>
                <Name name="name" label={labels.name} />
                <TypeChoice name="type" label={labels.typeChoice} />
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
                <PodSelector
                  name="PodBackend"
                  label={labels.podChoice}
                />
                <PortSelector name="ports" label={labels.ports} />
                <Weight name="weight" label={labels.weight} />
                <DeregisterPolicy name="deregisterPolicy" label={''} />
              </Form>
            </form>
          );
        }}
      </FinalForm>
    );
  };
}

export { BackendsGroupEditor };
