/**
 * 规则编辑器
 */
import React, { useState } from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import {
  Alert,
  AutoComplete,
  Bubble,
  Button,
  Card,
  Collapse,
  Form,
  Icon,
  InputAdornment,
  Input,
  InputNumber,
  List,
  Radio,
  Select,
  SelectMultiple,
  Switch,
  Table,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import {
  setClusterCache,
  getClusterCache,
  setProjectCache,
  getProjectCache,
  setNamespaceCache,
  getNamespaceCache,
} from '../../helpers/util';
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
  useTransferRule: '选择转发规则',
  showTransferRule: '使用现有转发规则',
  newTransferRule: '新建一个转发规则',
};
/**
 * 网络协议 - 下拉选择框的数据源
 * 注意不能在前端创建https类型的监听器，但是可以从现有列表中选择
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
  listenerId?: string;

  protocol: string;

  port: string;

  // host: string; // Domain
  //
  // path: string; // Url
}

// 转发规则
interface TransferRule {
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
  host?: string; // Domain

  path?: string; // Url

  rules?: Rule[];

  occupied?: boolean; // 是否已占用
}

interface RuleType {
  name: string; // 规则名称

  shareable: boolean; // 是否是可共享规则

  project: string; // 所属业务

  namespace: string; // 规则所在命名空间

  scope: string[]; // 共享的命名空间

  lbID: string; // CLB 实例

  useListener: string; // 使用监听器

  listener: ListenerType;
}

interface ListenerRule extends Listener {
  namespace?: string;

  name?: string;

  share?: boolean;
}

interface PropTypes {
  // clusterName: string; // 集群名称

  projects: Project[]; // 业务列表

  value?: RuleType; // value 属性，和 onChange 对应的

  onChange?: (value) => void;

  context: string; // 业务侧/平台侧
}

interface StateTypes {
  projects: Project[]; // 业务列表

  clusters: ClusterType[]; // 集群列表

  instances: Instance[]; // 可用实例下拉选择数据源

  namespaces: String[]; // 命名空间下拉选择数据源

  name: string; // 规则名称

  shareable: boolean; // 是否是可共享规则

  project: string; // 所属业务

  namespace: string; // 规则所在命名空间

  namespaceValue: string; // 规则所在命名空间全名

  scope: string[]; // 共享的命名空间

  lbID: string; // CLB 实例

  useListener: string; // 如何设置监听器

  listener: ListenerType; // 监听器

  useTransferRule: string; // 如何设置转发规则

  transferRule: TransferRule; // 转发规则

  clusterName: string; // 命名空间对应的集群

  listenerList: Listener[]; // 监听器列表

  ruleList: ListenerRule[]; // 规则列表

  occupied: ListenerRule[]; // 已占用规则/监听器列表

  isPlatform: boolean;

  // expandedKeys: string[];
}

// 规则名称文本框
const Name = ({ name, label, shareable }) => (
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
        <InputAdornment before={shareable ? 'lbcf-clb-' : 'clb-'}>
          <Input {...input} {...rest} maxLength={50} />
        </InputAdornment>
      </Form.Item>
    )}
  </Field>
);

// 创建可共享规则开关
const ShareSwitcher = ({ name, label, onChange }) => (
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
        <Switch
          {...input}
          {...rest}
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
        />
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
          searchable
          placeholder="选择业务"
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// 命名空间下拉选择框
const Namespace = ({ name, label, options, groups, onChange }) => (
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
          groups={groups}
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
          // layout="column"
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
        <Form.Item label="端口" required status={getStatus(meta)} message={getStatus(meta) === 'error' && meta.error}>
          <InputNumber {...input} />
          <Bubble content="需要根据CLB实例和网络协议分配">
            <Button type="weak" htmlType="button" onClick={onClick} style={{ marginLeft: 8 }}>
              分配随机端口
            </Button>
          </Bubble>
        </Form.Item>
      )}
    </Field>
  </>
);

// 从现有监听器选择
const ListenerList = ({
  name,
  listeners,
  occupied,
  protocol,
  listenerId,
}: {
  name: string;
  listeners: Listener[];
  // rules: ListenerRule[];
  occupied: ListenerRule[];
  protocol: string;
  listenerId: string;
}) => {
  return (
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
              records={listeners}
              rowDisabled={record => record.occupied}
              recordKey="listenerId"
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
              ]}
              addons={[
                autotip({
                  emptyText: '暂无数据',
                }),
                radioable({
                  value: input.value.listenerId,
                  rowSelect: true,
                  onChange: (value, context) => {
                    // context对象中有个record字段，从中获取port和protocol，再读取该记录是否有rules
                    let { record } = context;
                    let { listenerId, protocol, port } = record;
                    input.onChange({ listenerId, protocol, port });
                  },
                }),
              ]}
            />
          </Card>
        </Form.Item>
      )}
    </Field>
  );
};

// 如何设置转发规则单选框
const TransferRuleChoice = ({ name, label, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      return !value ? '设置转发规则' : undefined;
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
          <Radio name="show">选用现有规则</Radio>
          <Radio name="new">新建转发规则</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);

// 新建转发规则
const TransferRuleCreator = ({ name }) => (
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
);

// 使用现有规则
const TransferRuleList = ({
  name,
  rules,
  occupied,
}: {
  name: string;
  rules: ListenerRule[];
  occupied: ListenerRule[];
}) => {
  // TODO: 考虑ruleList的已占用的处理
  return (
    <Field name={`${name}`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label="选择转发规则"
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
        >
          <Card>
            <Table
              verticalTop
              compact
              bordered
              records={rules}
              rowDisabled={record => record.occupied}
              recordKey={record => `${record.host}${record.path}`}
              columns={[
                {
                  key: 'host',
                  header: '主机/域名',
                },
                {
                  key: 'path',
                  header: '路径/Url',
                },
              ]}
              addons={[
                autotip({
                  emptyText: '暂无数据',
                }),
                radioable({
                  value: `${input.value.host}${input.value.path}`, // 取的是 recordKey 字段的值
                  // value: input.value.listenerId,
                  rowSelect: true,
                  onChange: (value, context) => {
                    // context对象中有个record字段，从中获取port和protocol，再读取该记录是否有rules
                    let { record } = context;
                    let { host, path } = record;
                    input.onChange({ host, path });
                  },
                }),
              ]}
            />
          </Card>
        </Form.Item>
      )}
    </Field>
  );
};

class RuleEditor extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    projects: this.props.projects,
    clusters: [], // 平台侧下的集群列表
    instances: [],
    namespaces: [],
    // selectedCLB: '',
    // isShareRule: true,
    listenerList: [], // 现有监听器列表
    ruleList: [], // 现有规则列表
    occupied: [], // 现有规则列表

    name: '', // 规则名称
    shareable: false,
    project: '',
    clusterName: '',
    namespace: '', // 规则所在命名空间
    namespaceValue: '', // 规则所在命名空间全名
    scope: [], // 共享的命名空间
    lbID: '', // CLB 实例
    useListener: 'show', // 选择如何设置监听器
    listener: {
      listenerId: '',
      protocol: '',
      port: '',
    },
    useTransferRule: 'show', // 选择如何设置转发规则
    transferRule: {
      host: '',
      path: '',
    },
    // expandedKeys: [],
  };

  componentDidMount() {
    if (this.state.isPlatform) {
      this.loadData();
    } else {
      this.getCache();
    }
  }

  // 在业务侧下，如果projects发生了变化，要重新加载缓存
  componentWillReceiveProps(nextProps, nextContext) {
    const { projects } = this.state;
    if (!isEqual(nextProps.projects, projects)) {
      this.setState({ projects: nextProps.projects }, () => {
        if (nextProps.context && nextProps.context === 'business') {
          this.getCache();
        }
      });
    }
  }

  /**
   * 加载初始化数据
   * 如果用户在列表页选择了业务和命名空间，就使用用户选择的【也就是说传到Editor里面的时候value里面的project, namespace是有数据的】，然后加载对应的可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    // const { isPlatform, project, namespace } = this.state;
    // if (!isEmpty(project)) {
    //   await this.getProjectNamespaces(project);
    // }
    // if (isPlatform) {
    //   await this.getClusterList();
    // }
    let clusters = await getAllClusters();
    this.setState({ clusters }, () => {
      this.getCache();
    });
  };

  getCache = () => {
    let { isPlatform, clusters } = this.state;
    if (isPlatform) {
      // 处理缓存的集群选择
      let selectedClusterName = getClusterCache();
      if (clusters.map(item => item.name).includes(selectedClusterName)) {
        this.handleClusterChanged(selectedClusterName);
      }
    } else {
      // 处理缓存的业务选择，注意这里缓存的是业务id
      let { projects } = this.state;
      let selectedProject = getProjectCache();
      if (projects.map(item => item.id).includes(selectedProject)) {
        this.handleProjectChanged(selectedProject);
      }
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
    let response = await getAvailableListeners(clusterName, lbID);
    let { listeners, occupied } = response;
    if (occupied) {
      occupied = occupied.map(item => ({ ...item, port: Number(item.port) }));
    }
    let listenerList: Listener[] = listeners.map(
      ({ ListenerId: listenerId, ListenerName: listenerName, Port: port, Protocol: protocol, Rules: rules }) => {
        let data = {
          listenerId,
          listenerName,
          port,
          protocol,
          // rules: [],
          occupied:
            ['TCP', 'UDP'].includes(protocol) &&
            occupied.find(item => item.protocol === protocol && item.port === port) !== undefined,
        };
        return data;
      }
    );
    let ruleList = [];
    for (let listener of listeners) {
      let {
        ListenerId: listenerId,
        ListenerName: listenerName,
        Port: port,
        Protocol: protocol,
        Rules: rules,
      } = listener;
      if (rules) {
        for (let rule of rules) {
          let { Domain: host, Url: path } = rule;
          ruleList.push({ listenerId, listenerName, port, protocol, host, path });
        }
      }
    }
    this.setState({ listenerList, ruleList, occupied });
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
    setClusterCache(clusterName);
    let namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, namespaces }, () => {
      let selectedNamespace = getNamespaceCache(this.state.isPlatform);
      if (namespaces.map(item => item.name).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  /**
   * 切换业务的时候更新命名空间
   * NOTE: 业务选择器的数据源是从wrapper传过来的
   * @param projectId 业务id
   */
  handleProjectChanged = async projectId => {
    setProjectCache(projectId);
    let namespaces = await getNamespacesByProject(projectId);
    this.setState({ project: projectId, namespaces }, () => {
      let selectedNamespace = getNamespaceCache(this.state.isPlatform);
      if (namespaces.map(item => (this.state.isPlatform ? item.name : item.fullName)).includes(selectedNamespace)) {
        this.handleNamespaceChanged(selectedNamespace);
      }
    });
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleNamespaceChanged = namespaceValue => {
    setNamespaceCache(namespaceValue, this.state.isPlatform);
    let { namespaces } = this.state;
    let namespaceItem = namespaces.find(item => (this.state.isPlatform ? item.name : item.fullName) === namespaceValue);
    // 兼容业务侧场景，直接从ns中取cluster
    if (namespaceItem) {
      let { clusterName, name: namespace } = namespaceItem;
      this.setState({ clusterName, namespace, namespaceValue }, () => {
        this.getInstanceList(clusterName, namespace);
      });
    }
  };

  /**
   * CLB实例变更时重新拉取监听器列表
   * @param lbID
   */
  handleLBIDChanged = lbID => {
    let { clusterName, namespace } = this.state;
    this.setState({ lbID }, () => {
      this.getListenerList(clusterName, lbID);
    });
  };

  /**
   * 处理是否共享的状态切换
   * 如果是共享规则的话，1. 需要有kube-system这个命名空间的权限；2. 共享规则只能创建到kube-system下面
   * @param shareable
   */
  handleShareableChanged = shareable => {
    let { namespaces, namespace: nextNamespace, shareable: nextShareable } = this.state;
    nextShareable = shareable;
    if (shareable) {
      // namespaces 中必须有kube-system这个ns，否则不能设置shareabel
      if (!namespaces.map(item => item.name).includes('kube-system')) {
        nextShareable = false;
      } else {
        nextNamespace = 'kube-system';
      }
    }
    this.setState({ namespace: nextNamespace, shareable: nextShareable });
  };

  stateToPayload = data => {
    let payload = Object.assign(
      {},
      pick(data, ['name', 'namespace', 'lbID']),
      {
        ...data.listener,
        port: Number(data.listener.port),
      },
      { scope: data.shareable ? data.scope : [] }
    );

    return payload;
  };

  /**
   * 用在表单独立提交的时候
   * @param values
   */
  submit = async values => {
    let { clusterName } = this.state;

    try {
      let payload = this.stateToPayload(values);
      let response = await createRule(clusterName, payload);
    } catch (err) {
      // message.error(err)
    }
  };

  render = () => {
    let { projects } = this.props;
    let {
      instances,
      clusters,
      namespaces,
      clusterName,
      useListener,
      listenerList,
      isPlatform,
      name,
      shareable,
      project,
      namespace,
      namespaceValue,
      scope,
      lbID,
      listener,
      useTransferRule,
      transferRule,
      ruleList,
      occupied,
      // expandedKeys,
    } = this.state;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    // let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    let namespaceList = [];
    let groups = {};
    if (isPlatform) {
      namespaceList = namespaces.map(({ name, fullName }) => ({
        // value: fullName,
        value: name,
        text: name,
      }));
    } else {
      namespaceList = namespaces.map(({ name, clusterName, fullName }) => ({
        value: fullName,
        groupKey: clusterName,
        text: name,
      }));
      groups = namespaces.reduce((accu, item, index, arr) => {
        let { clusterName, clusterDisplayName, namespace } = item;
        if (!accu[clusterName]) {
          accu[clusterName] = clusterDisplayName;
        }
        return accu;
      }, {});
    }

    const save = form => {
      return values => {};
    };

    const onFormChange = formState => {
      // console.log('onFormChange, formState = ', formState);
      let { onChange } = this.props;
      // 在这里更新一下state，使跟UI保持同步。其他几个字段都有自己的单独的onChange处理方法
      let { listener, scope, name, transferRule } = formState.values;
      this.setState({ listener, transferRule, scope, name });
      if (onChange) {
        onChange({ values: formState.values, valid: formState.valid });
      }
    };

    let renderListener = () => {
      return (
        <>
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
              listeners={listenerList}
              occupied={occupied}
              protocol={listener.protocol}
              listenerId={listener.listenerId}
            />
          )}
        </>
      );
    };

    // 显示新建规则还是选择规则的条件：1. 设置监听器的方式为"使用现有监听器"，2.用户已经选择了一个监听器，且监听器的协议类型为HTTP（如果是tcp/udp的话不需要设置规则，如果是https的话只能从现有规则选择）
    let renderTransferRuleChoice = () => {
      if (useListener === 'show' && listener && listener.protocol === 'HTTP') {
        return (
          <TransferRuleChoice
            name="useTransferRule"
            label={labels.useTransferRule}
            onChange={value => this.setState({ useTransferRule: value })}
          />
        );
      }
      return <></>;
    };

    let renderTransferRule = () => {
      // 这里显示出来的规则要根据listenerId从总的ruleList中筛选出来；如果没有listener选中的话就置空
      // 还需要对是否已经被占用进行过滤，or在组件里面实现？
      let subRuleList = listener.listenerId
        ? ruleList
            .filter(item => item.listenerId === listener.listenerId)
            .map(item => ({
              ...item,
              occupied:
                occupied.find(
                  occu =>
                    occu.protocol === item.protocol &&
                    occu.port === item.port &&
                    occu.host === item.host &&
                    occu.path === item.path
                ) !== undefined,
            }))
        : [];
      let RuleCreator = <TransferRuleCreator name="transferRule" />;
      let RuleList = <TransferRuleList name="transferRule" rules={subRuleList} occupied={occupied} />;

      if (useListener === 'new') {
        // 新建监听器只能选择新建转发规则
        if (listener.protocol === 'HTTP') {
          return RuleCreator;
        }
      } else {
        // 从现有列表选择
        if (listener.protocol === 'HTTP') {
          if (useTransferRule === 'new') {
            return RuleCreator;
          } else {
            return RuleList;
          }
        } else if (listener.protocol === 'HTTPS') {
          return RuleList;
        }
      }
      return <></>;
    };

    return (
      <div>
        <FinalForm
          onSubmit={this.submit}
          initialValues={{
            name,
            shareable,
            clusterName,
            project,
            namespace: namespaceValue,
            scope,
            lbID,
            useListener,
            listener,
            useTransferRule,
            transferRule,
          }}
          mutators={{ setFieldData }}
          subscription={{}}
        >
          {({ form, handleSubmit, validating, submitting, values, valid }) => (
            <form id="ruleForm" onSubmit={handleSubmit}>
              <AutoSave setFieldData={form.mutators.setFieldData} save={save(form)} onChange={onFormChange} />
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
                  groups={groups}
                  onChange={this.handleNamespaceChanged}
                />
                <LBID
                  name="lbID"
                  label={labels.clbInstance}
                  records={instances}
                  onChange={value => this.handleLBIDChanged(value)}
                />
                {renderListener()}
                {renderTransferRuleChoice()}
                {renderTransferRule()}
                {isPlatform && (
                  <ShareSwitcher
                    name="shareable"
                    label={labels.switch}
                    onChange={value => this.handleShareableChanged(value)}
                  />
                )}
                {shareable && <Scope name="scope" label={labels.sharedNamespace} options={namespaceList} />}
                <Name name="name" label={labels.ruleName} shareable={shareable} />
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
                    普通规则和共享规则
                    <List type="number">
                      <List.Item>{`普通规则名称以"clb-"作为前缀，共享规则名称以"lbcf-clb-"作为前缀，除前缀外规则名称最长50个字符`}</List.Item>
                      <List.Item>{`共享规则的命名空间必须是"kube-system"`}</List.Item>
                      <List.Item>{`共享规则只能通过平台侧创建，在业务侧下用户只能创建普通规则`}</List.Item>
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
