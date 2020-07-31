/**
 * 规则编辑器
 */
import React from 'react';
import { Form as FinalForm, Field, useForm } from 'react-final-form';
import {
  Alert,
  Bubble,
  Button,
  Card,
  Collapse,
  Form,
  Icon,
  Input,
  List,
  Radio,
  Select,
  SelectMultiple,
  Switch,
  Table,
  Text,
  Tooltip,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Cluster as ClusterType } from '../../models';
import AutoSave from '../../components/AutoSave';
import {
  createRule,
  getAllClusters,
  getAvailableInstancesByClusterAndNamespace,
  getAvailableListeners,
  getNamespacesByCluster,
  getNamespacesByProject,
  generateServerPort,
} from '../../services/api';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable, expandable, indentable } = Table.addons;

const labels = {
  cluster: '选择集群',
  project: '选择业务',
  namespace: '选择命名空间',
  ruleName: '输入规则名称',
  switch: '是否共享规则',
  sharedNamespace: '选择共享的命名空间',
  clbInstance: '选择实例',
  useListener: '选择监听器',
  showListener: '使用现有监听器',
  newListener: '新建一个监听器',
};
/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'HTTP' },
  { text: 'TCP', value: 'TCP' },
  { text: 'UDP', value: 'UDP' },
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

interface Project {
  id: string;
  name: string;
}

interface Instance {
  clbID: string; // CLB ID

  clbName: string; // CLB 名称

  disabled: boolean; // 是否已禁用

  name: string; // 实例名称

  type: string; // 网络类型

  scope: string[]; // 命名空间

  vip: string; // vip
}

// 提交用
interface ListenerType {
  protocol: string;

  port: string;

  host: string; // Domain

  path: string; // Url
}

interface Rule {
  // for http rules
  domain: string; // Domain

  url: string; // Url
}

// 展示用
interface Listener {
  listenerId: string;

  listenerName: string;

  protocol: string;

  port: number;

  // for http rules
  // domain: string; // Domain

  // url: string; // Url

  rules?: Rule[];
}

interface RuleType {
  name: string; // 规则名称

  isSharedRule: boolean; // 是否是可共享规则

  project: string; // 所属业务

  namespace: string; // 规则所在命名空间

  scope: string[]; // 共享的命名空间

  lbID: string; // CLB 实例

  useListener: string; // 使用监听器

  listener: ListenerType;
}

interface PropTypes {
  // clusterName: string; // 集群名称

  projects: Project[]; // 业务列表

  value?: RuleType; // value 属性，和 onChange 对应的

  onChange?: (value) => void;

  context: string; // 业务侧/平台侧
}

interface StateTypes {
  // data?: RuleType;

  clusters: ClusterType[]; // 集群列表

  instances: Instance[]; // 可用实例下拉选择数据源

  namespaces: String[]; // 命名空间下拉选择数据源

  name: string; // 规则名称

  isSharedRule: boolean; // 是否是可共享规则

  project: string; // 所属业务

  namespace: string; // 规则所在命名空间

  scope: string[]; // 共享的命名空间

  lbID: string; // CLB 实例

  useListener: string; // 使用监听器

  listener: ListenerType;

  clusterName: string; // 命名空间对应的集群

  listenerList: Listener[];

  isPlatform: boolean;

  expandedKeys: string[];
}

// 规则名称文本框
const Name = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '请输入名称' : undefined;
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

// 创建可共享规则开关
const ShareSwitcher = ({ name, label }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={
          <p>
            {label}
            <Bubble content="可共享规则允许在多个命名空间被使用，必须拥有kube-system权限才能创建可共享规则">
              <Icon type="info" />
            </Bubble>
          </p>
        }
      >
        <Switch {...input} {...rest}></Switch>
      </Form.Item>
    )}
  </Field>
);

// 集群下拉选择框
const Cluster = ({ name, label, options, onChange }) => (
  <Field name={`${name}`} validate={required}>
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
  <Field name={`${name}`} validate={required}>
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
      return !value ? '请选择命名空间' : undefined;
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

// 可共享命名空间下拉选择框
const Scope = ({ name, label, options }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '请选择共享的命名空间' : undefined;
    }}
  >
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <SelectMultiple
          {...input}
          {...rest}
          // onChange={value => {
          //   input.onChange(value);
          //   if (onChange) {
          //     onChange(value);
          //   }
          // }}
          appearence="button"
          size="m"
          placeholder="请选择命名空间"
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// CLB实例选择器 - 表格实现
const LBID = ({
  name,
  label,
  records,
  onChange,
}: {
  name: string;
  label: string;
  records: Instance[];
  onChange: (value) => void;
}) => (
  <Field name={`${name}`} validate={required}>
    {({ input, meta, ...rest }) => (
      <Form.Item label={`${label}`} required>
        <Card>
          <Table
            verticalTop
            compact
            bordered
            records={records}
            rowDisabled={record => record.disabled}
            recordKey="clbID"
            columns={[
              {
                key: 'name',
                header: '名称',
              },
              {
                key: 'clbID',
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
            ]}
            addons={[
              autotip({
                emptyText: '暂无数据',
              }),
              radioable({
                ...input,
                rowSelect: true,
                onChange: (value, context) => {
                  input.onChange(value);
                  if (onChange) {
                    onChange(value);
                  }
                },
              }),
            ]}
          />
        </Card>
      </Form.Item>
    )}
  </Field>
);

// 如何设置监听器单选框
const ListenerChoice = ({ name, label, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '使用监听器' : undefined;
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
          <Radio name="new">新建监听器</Radio>
          <Radio name="show">使用已有监听器</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

// 新建监听器字段组合
const ListenerCreator = ({ name, onClick, protocol }) => (
  <>
    <Field
      name={`${name}.protocol`}
      validate={value => {
        return !value ? '请选择协议' : undefined;
      }}
    >
      {({ input, meta, ...rest }) => (
        <Form.Item label="协议" required status={getStatus(meta)} message={getStatus(meta) === 'error' && meta.error}>
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
    <Field
      name={`${name}.port`}
      validate={value => {
        return !value ? '请输入端口' : undefined;
      }}
    >
      {({ input, meta, ...rest }) => (
        <Form.Item
          label="端口"
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
        >
          <Input {...input} />
          <Bubble content="需要根据CLB实例和网络协议分配">
            <Button type="weak" htmlType="button" onClick={onClick} style={{ marginLeft: 8 }}>
              分配随机端口
            </Button>
          </Bubble>
        </Form.Item>
      )}
    </Field>
    {protocol === 'HTTP' && (
      <>
        <Field
          name={`${name}.host`}
          validate={value => {
            return !value ? '主机地址不能为空' : undefined;
          }}
        >
          {({ input, meta, ...rest }) => (
            <Form.Item
              label="主机(Host)"
              required
              status={getStatus(meta)}
              message={getStatus(meta) === 'error' && meta.error}
            >
              <Input {...input} />
            </Form.Item>
          )}
        </Field>
        <Field
          name={`${name}.path`}
          validate={value => {
            return !value ? '路径不能为空' : undefined;
          }}
        >
          {({ input, meta, ...rest }) => (
            <Form.Item
              label="路径(path)"
              required
              status={getStatus(meta)}
              message={getStatus(meta) === 'error' && meta.error}
            >
              <Input {...input} />
            </Form.Item>
          )}
        </Field>
      </>
    )}
  </>
);

// 从现有监听器选择
const ListenerList = ({
  name,
  records,
  expandedKeys,
  onExpandedKeysChange,
}: {
  name: string;
  records: Listener[];
  expandedKeys: string[];
  onExpandedKeysChange: (value) => void;
}) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label="选择监听器"
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Card>
          <Table
            verticalTop
            compact
            bordered
            records={records}
            rowDisabled={record => Boolean(record.rules)}
            recordKey={record => {
              let recordKey = `${record.listenerId}-${record['protocol'] || 'protocol'}-${record['port'] || 'port'}-${
                record['domain'] || 'domain'
              }-${record['url'] || 'url'}`;
              return recordKey;
            }}
            columns={[
              {
                key: 'listenerName',
                header: '监听器名称',
              },
              {
                key: 'listenerId',
                header: 'ListenerId',
              },
              {
                key: 'protocol',
                header: '端口',
                render: ({ protocol, port }) => (
                  <p>
                    {protocol}:{port}
                  </p>
                ),
              },
              {
                key: 'domain',
                header: '主机/域名',
              },
              {
                key: 'url',
                header: '路径/Url',
              },
            ]}
            addons={[
              autotip({
                emptyText: '暂无数据',
              }),
              expandable({
                expandedKeys,
                expand: record => record.rules || null,
                onExpandedKeysChange,
                shouldRecordExpandable: record => Boolean(record.rules),
              }),
              radioable({
                value: `${input.value.listenerId}-${input.value['protocol'] || 'protocol'}-${
                  input.value['port'] || 'port'
                }-${input.value['domain'] || 'domain'}-${input.value['url'] || 'url'}`, // 取的是 recordKey 字段的值
                rowSelect: true,
                onChange: (value, context) => {
                  // context对象中有个record字段，从中获取port和protocol，再读取该记录是否有rules
                  let { record } = context;
                  let { listenerId, protocol, port, domain: host = '', url: path = '' } = record;
                  input.onChange({ listenerId, protocol, port, host, path });
                },
              }),
              indentable({
                targetColumnKey: 'listenerName',
                // 提供层级关系
                // relations,
              }),
            ]}
          />
        </Card>
      </Form.Item>
    )}
  </Field>
);

class RuleEditor extends React.Component<PropTypes, StateTypes> {
  state = {
    // data: this.props.value || {} as RuleType,
    isPlatform: this.props.context && this.props.context === 'platform',
    clusters: [], // 平台侧下的集群列表
    instances: [],
    namespaces: [],
    // selectedCLB: '',
    // isShareRule: true,
    listenerList: [], // 现有监听器列表

    name: '', // 规则名称
    isSharedRule: false,
    project: '',
    clusterName: '',
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
    expandedKeys: [],
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
      await this.getProjectNamespaces(project);
    }
    if (isPlatform) {
      await this.getClusterList();
    }
  };

  /**
   * 平台侧下获取集群列表
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
   * 业务侧下获取业务下的命名空间列表
   * @param project
   */
  getProjectNamespaces = async project => {
    const namespaces = await getNamespacesByProject(project);
    this.setState({ namespaces });
  };

  /**
   * 获取可用的clb实例列表
   */
  getInstanceList = async (clusterName, namespace) => {
    let instances = await getAvailableInstancesByClusterAndNamespace(clusterName, namespace);
    this.setState({ instances });
  };

  /**
   * 获取现有的监听器列表
   * 由上面选中的clb实例决定的，需要clbId
   */
  getListenerList = async (clusterName, lbID) => {
    // let { clusterName, lbID } = this.state;
    let list = await getAvailableListeners(clusterName, lbID);
    let listenerList: Listener[] = list.map(
      ({ ListenerId: listenerId, ListenerName: listenerName, Port: port, Protocol: protocol, Rules: rules }) => {
        let data = {
          listenerId,
          listenerName,
          port,
          protocol,
          // rules: [],
        };
        if (rules) {
          Object.assign(data, {
            rules: rules.map(({ Domain: domain, Url: url }) => ({
              listenerId,
              listenerName,
              protocol,
              port,
              domain,
              url,
            })),
          });
        }
        return data;
      }
    );
    this.setState({ listenerList });
  };

  /**
   * 分配随机端口
   */
  handleGeneratePort = async () => {
    let { clusterName, lbID, listener } = this.state;
    let { protocol } = listener;
    if (!protocol || !lbID) {
      return Promise.resolve();
    }
    let response = await generateServerPort(clusterName, lbID, protocol);
    if (response.code === 0 && response.message === 'OK') {
      if (response.data) {
        // response.data 形式是 { port: 80 }
        let newListener = { ...listener, ...response.data };
        this.setState({ listener: newListener });
      }
    }
  };

  /**
   * 切换集群时更新命名空间列表
   * @param clusterName
   */
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
      this.getProjectNamespaces(project);
    });
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleNamespaceChanged = namespace => {
    let { namespaces } = this.state;
    // 兼容业务侧场景，直接从ns中取cluster
    let { clusterName } = namespaces.find(item => item.name === namespace);
    this.setState({ clusterName, namespace }, () => {
      this.getInstanceList(clusterName, namespace);
    });
  };

  handleLBIDChanged = lbID => {
    let { clusterName, namespace } = this.state;
    this.setState({ lbID }, () => {
      this.getListenerList(clusterName, lbID);
    });
  };

  /**
   * 转换formstate为payload
   * 1. port 需要是字符串；2. scope在非共享的时候置空数组
   * @param data
   */
  stateToPayload = data => {
    let payload = Object.assign(
      {},
      pick(data, ['name', 'namespace', 'lbID']),
      {
        ...data.listener,
        port: Number(data.listener.port),
      },
      { scope: data.isSharedRule ? data.scope : [] }
    );

    return payload;
  };

  submit = async values => {
    // console.log('form.getState() = ', form.getState());
    // if (onChange) {
    //   onChange(form.getState());
    // }
    let { clusterName } = this.state;
    // let { clusterName } = this.state;
    // let {  } = currentItem;
    // console.log('data = ', values);

    try {
      let payload = this.stateToPayload(values);
      // if (!isEdit) {
      let response = await createRule(clusterName, payload);
      // message.info('网络策略已创建')
      // } else {
      // await updateNetworkPolicy(cluster, name, payload)
      // message.info('网络策略已更新')
      // }
      // this.setState({ dialogVisible: false });
      // await this.getList();
      // this.loadData();
    } catch (err) {
      // message.error(err)
    }
  };

  render = () => {
    let { onChange, projects } = this.props;
    let {
      instances,
      clusters,
      namespaces,
      clusterName,
      useListener,
      listenerList,
      isPlatform,
      name,
      isSharedRule,
      project,
      namespace,
      scope,
      lbID,
      listener,
      expandedKeys,
    } = this.state;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    // TODO: 业务侧下面通过*无法获取关联的集群，去掉
    // namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });

    // const save = form => {
    //   return async values => {
    //     if (onChange) {
    //       onChange(values);
    //     }
    //   };
    // };

    const onFormChange = formState => {
      let { onChange } = this.props;
      // 在这里更新一下state，使跟UI保持同步。其他几个字段都有自己的单独的onChange处理方法
      let { isSharedRule, listener, scope, name } = formState.values;
      this.setState({ listener, isSharedRule, scope, name });
      if (onChange) {
        onChange({ values: formState.values, valid: formState.valid });
      }
    };

    return (
      <div>
        <FinalForm
          onSubmit={this.submit}
          // initialValuesEqual={() => true}
          initialValues={{
            name,
            isSharedRule,
            clusterName,
            project,
            namespace,
            scope,
            lbID,
            useListener,
            listener,
          }}
          // mutators={{ setFieldData }}
          // subscription={{}}
        >
          {({ form, handleSubmit, validating, submitting, values, valid }) => (
            <form id="ruleForm" onSubmit={handleSubmit}>
              <AutoSave setFieldData={form.mutators.setFieldData} onChange={onFormChange} />
              <Form layout="vertical">
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
                <LBID
                  name="lbID"
                  label={labels.clbInstance}
                  records={instances}
                  onChange={value => this.handleLBIDChanged(value)}
                />
                <ListenerChoice
                  name="useListener"
                  label={labels.useListener}
                  onChange={value => this.setState({ useListener: value })}
                />
                {useListener === 'new' ? (
                  <ListenerCreator name="listener" protocol={listener.protocol} onClick={this.handleGeneratePort} />
                ) : (
                  <ListenerList
                    name="listener"
                    records={listenerList}
                    expandedKeys={expandedKeys}
                    onExpandedKeysChange={keys => this.setState({ expandedKeys: keys })}
                  />
                )}
                <ShareSwitcher name="isSharedRule" label={labels.switch} />
                {isSharedRule && <Scope name="scope" label={labels.sharedNamespace} options={namespaceList} />}
                <Name name="name" label={labels.ruleName} />
              </Form>
            </form>
          )}
        </FinalForm>
        <Collapse style={{ marginTop: 8 }}>
          <Collapse.Panel
            id="1"
            title="填写说明"
            content={
              <Alert>
                <List>
                  <List.Item>
                    规则名称
                    <List type="number">
                      <List.Item>{`命名空间非kube-system时，规则名称不能以"lbcf-"开头`}</List.Item>
                      <List.Item>{`规则名称以"lbcf-"开头时，命名空间必须是"kube-system"`}</List.Item>
                      <List.Item>
                        {`创建可共享规则时，命名空间固定为'kube-system'，规则名称固定以'lbcf-'开头`}
                      </List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    可共享规则
                    <List type="number">
                      <List.Item>
                        可共享规则允许在多个命名空间被使用，必须拥有kube-system权限才能创建可共享规则
                      </List.Item>
                    </List>
                  </List.Item>
                  <List.Item>监听器</List.Item>
                  <List type="number">
                    <List.Item>
                      因新建HTTPS监听器较为复杂，所以不支持创建HTTPS监听器。HTTPS监听器必须由管理员在云上创建好，然后用户在“使用已有监听器”中选择。
                    </List.Item>
                    <List.Item>
                      host禁止填写泛域名，如需要，请联系管理员在云控制台创建好，再通过“使用已有监听器”选择。
                    </List.Item>
                  </List>
                </List>
              </Alert>
            }
          />
        </Collapse>
      </div>
    );
  };
}

export { RuleEditor, ListenerType };
