/**
 * 规则编辑器
 */
import React from 'react';
import { Form as FinalForm, Field, useForm } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  Button,
  Card,
  Form,
  Icon,
  Input,
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
// import { ListenerCreator } from './components/ListenerCreator';
// import { ListenerList } from './components/ListenerList';
import {
  createRule,
  getAllClusters,
  getAvailableInstancesByCluster,
  getAvailableListeners,
  getNamespacesByCluster,
  getNamespacesByProject,
} from '../../services/api';

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
  clbId: string; // CLB ID

  clbName: string; // CLB 名称

  type: string; // 网络类型

  vips: string[]; // vip数组
}

interface ListenerType {
  protocol: string;

  port: string;

  host: string;

  path: string;
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

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface StateTypes {
  data?: RuleType;

  clusters: Cluster[]; // 集群列表

  instances: Instance[]; // 可用实例下拉选择数据源

  namespaces: String[]; // 命名空间下拉选择数据源

  clusterName: string; // 命名空间对应的集群

  project: string; // 当前选中的业务
  // selectedCLB: any; // 编辑器中选中的clb实例行

  listenerList: any[];

  isPlatform: boolean;
}

// 规则名称文本框
const Name = ({ name, label }) => (
  <Field
    name={`${name}`}
    // component={NameAdapter}
    // required
    validate={value => {
      // 1. 命名空间非kube-system时，规则名称不能已"lbcf-"开头
      // 2. 规则名称以"lbcf-"开头时，命名空间必须是"kube-system"
      // 3. 创建可共享规则时，命名空间固定为"kube-system"(前端需判断用户是否有kube-system权限），规则名称固定以"lbcf-"开头
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
        label={`${label}`}
        required
        // status={getStatus(meta)}
        // message={getStatus(meta) === 'error' ? meta.error : t('请输入规则名称')}
      >
        <Switch {...input} {...rest}>
          <span>创建可共享规则</span>
          <Tooltip title={t('可共享规则允许在多个命名空间被使用，必须拥有kube-system权限才能创建可共享规则')}>
            <Icon type="info" />
          </Tooltip>
        </Switch>
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

// 可共享命名空间下拉选择框
const Scope = ({ name, label, options, onChange }) => (
  <Field
    name={`${name}`}
    validate={value => {
      console.log('scope value = ', value);
      return !value ? t('请选择共享的命名空间') : undefined;
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
          onChange={value => {
            input.onChange(value);
            if (onChange) {
              onChange(value);
            }
          }}
          appearence="button"
          size="m"
          placeholder={t('请选择命名空间')}
          options={options}
        />
      </Form.Item>
    )}
  </Field>
);

// CLB实例选择器 - 表格实现
const LBID = ({ name, label, records }: { name: string; label: string; records: Instance[] }) => (
  <Field name={`${name}`} validate={required}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={`${label}`}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' ? meta.error : t('选择一个希望导入的 CLB 实例')}
      >
        <Card>
          <Table
            verticalTop
            records={records}
            recordKey="clbId"
            columns={[
              {
                key: 'clbId',
                header: 'CLB ID',
                render: instance => (
                  <>
                    <p>
                      <a>{instance.clbId}</a>
                    </p>
                  </>
                ),
              },
              {
                key: 'clbName',
                header: 'CLB名称',
              },
              {
                key: 'vips',
                header: 'VIP',
                render: instance => (
                  <>
                    {instance.vips.map(vip => (
                      <p key={vip}>{vip}</p>
                    ))}
                  </>
                ),
              },
              {
                key: 'type',
                header: '网络类型',
                render: instance => (
                  <>
                    <p>{instance.type === 'OPEN' ? '公网' : '内网'}</p>
                  </>
                ),
              },
            ]}
            addons={[
              autotip({
                // isLoading: loading,
                // isError: Boolean(error),
                // isFound: Boolean(keyword),
                // onClear: () => setKeyword(""),
                // onRetry: load,
                // foundKeyword: keyword,
                emptyText: '暂无数据',
              }),
              radioable({
                ...input,
                // value: value, // 取的是 recordKey 字段的值
                rowSelect: true,
                // onChange: (value, context) => {
                //   console.log(value, context);
                //   // setSelected(value);
                //   this.handleLBIDChanged(value);
                // },
                // render: (element, { disabled }) => {
                //   return disabled ? <Icon type="loading" /> : element;
                // },
              }),
            ]}
          />
        </Card>
      </Form.Item>
    )}
  </Field>
);

// 如何设置监听器单选框
const ListenerChoice = ({ name, label }) => (
  <Field
    name={`${name}`}
    validate={value => {
      console.log('useListener value = ', value);
      return !value ? t('使用监听器') : undefined;
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
          // onChange={value => {
          //   this.handleUseListenerChanged(value);
          // }}
          layout="column"
        >
          <Radio name="new">新建监听器</Radio>
          <Radio name="show">使用已有监听器</Radio>
        </Radio.Group>
      </Form.Item>
    )}
  </Field>
);
// const Listener = ({ name, option, records }) => {
//   return option === 'new' ? <ListenerCreator name="listener" onClick={this.handleGeneratePort} /> : <ListenerList name="listener" records={records} />;
// };

// 新建监听器字段组合
const ListenerCreator = ({ name, onClick }) => (
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
          <Button type="weak" onClick={onClick}>
            分配随机端口
          </Button>
        </Form.Item>
      )}
    </Field>
    <Field name={`${name}.host`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={t('主机（host）')}
          required
          status={getStatus(meta)}
          message={getStatus(meta) === 'error' && meta.error}
        >
          <Input {...input} />
        </Form.Item>
      )}
    </Field>
    <Field name={`${name}.path`}>
      {({ input, meta, ...rest }) => (
        <Form.Item
          label={t('路径（path）')}
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

// 从现有监听器选择
const ListenerList = ({ name, records }) => (
  <Field name={`${name}`}>
    {({ input, meta, ...rest }) => (
      <Form.Item
        label={t('选择监听器')}
        required
        status={getStatus(meta)}
        message={getStatus(meta) === 'error' && meta.error}
      >
        <Card>
          <Table
            verticalTop
            records={records}
            recordKey="ListenerName"
            columns={[
              {
                key: 'ListenerName',
                header: '监听器名称',
                render: ({ ListenerName }) => <p>{ListenerName}</p>,
              },
              {
                key: 'Protocol',
                header: 'Protocol',
              },
              {
                key: 'Port',
                header: 'Port',
              },
              {
                key: 'Domain',
                header: 'Host',
              },
              {
                key: 'Url',
                header: 'Path',
              },
            ]}
            addons={[
              autotip({
                // isLoading: loading,
                // isError: Boolean(error),
                // isFound: Boolean(keyword),
                // onClear: () => setKeyword(""),
                // onRetry: load,
                // foundKeyword: keyword,
                emptyText: '暂无数据',
              }),
              radioable({
                value: input.value, // 取的是 recordKey 字段的值
                rowSelect: true,
                onChange: (value, context) => {
                  console.log(value, context);
                  // setSelected(value);
                  input.onChange(value);
                  // this.setState({ selectedListener: value });
                },
                // render: (element, { disabled }) => {
                //   return disabled ? <Icon type="loading" /> : element;
                // },
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
    data: this.props.value,
    isPlatform: this.props.context && this.props.context === 'platform',
    clusters: [], // 平台侧下的集群列表
    instances: [],
    namespaces: [],
    // selectedCLB: '',
    // isShareRule: true,
    clusterName: '',
    project: '',
    listenerList: [], // 现有监听器列表
    // name: '', // 规则名称
    // namespace: '', // 规则所在命名空间
    // clusterName: '',
    // scope: [], // 共享的命名空间
    // lbID: '', // CLB 实例
    // useListener: 'new', // 使用监听器
    // listener: {
    //   protocol: '',
    //   port: '',
    //   host: '',
    //   path: '',
    // },
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
    const {
      isPlatform,
      data: { project, namespace },
    } = this.state;
    if (!isEmpty(project)) {
      await this.getProjectNamespaces(project);
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

  getProjectNamespaces = async (project) => {
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
    this.setState({ instances });
  };

  /**
   * 获取现有的监听器列表
   * 由上面选中的clb实例决定的，需要clbId
   */
  getListenerList = async () => {
    let { clusterName, data } = this.state;
    let { lbID } = data;
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
   * @param project 业务id
   */
  handleProjectChanged = project => {
    console.log('project = ', project);
    this.setState({ project }, () => {
      this.getProjectNamespaces(project);
    });
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

  // handleRuleNameChanged = value => {
  //   console.log('new name = ', value);
  //   let { data } = this.state;
  //   let newData = Object.assign(data, { name: value });
  //   this.setState({ data: newData });
  //   // this.handleDataChanged(newData);
  // };

  // handleShareRuleChanged = value => {
  //   console.log('new isSharedRule = ', value);
  //   let { data } = this.state;
  //   let newData = Object.assign(data, { isSharedRule: value });
  //   this.setState({ data: newData });
  //   // this.handleDataChanged(newData);
  // };

  handleScopeChanged = value => {
    console.log('new scope = ', value);
    let { data } = this.state;
    let newData = Object.assign(data, { scope: value });
    this.setState({ data: newData });
    // this.handleDataChanged(newData);
  };

  handleLBIDChanged = value => {
    console.log('new lbID = ', value);
    let { data } = this.state;
    let newData = Object.assign(data, { lbID: value });
    this.setState({ data: newData });
    // this.handleDataChanged(newData);
  };

  // handleUseListenerChanged = value => {
  //   console.log('new useListener = ', value);
  //   let { data } = this.state;
  //   let newData = Object.assign(data, { useListener: value });
  //   this.setState({ data: newData });
  //   // this.handleDataChanged(newData);
  // };

  // handleListenerChanged = value => {
  //   console.log('new Listener = ', value);
  //   let { data } = this.state;
  //   let newData = Object.assign(data, { listener: value });
  //   this.setState({ data: newData });
  //   // this.handleDataChanged(newData);
  // };
  stateToPayload = data => {
    // let { currentItem } = this.state;
    // let { name, isSharedRule, namespace, scope, lbID, listener } = data;
    let payload = Object.assign({}, pick(data, ['name', 'namespace', 'scope', 'lbID']), {
      ...data.listener,
      port: Number(data.listener.port),
    });
    console.log('payload = ', payload);

    return payload;
  };

  submit = async values => {
    console.log('values = ', values);
    // console.log('form.getState() = ', form.getState());
    // if (onChange) {
    //   onChange(form.getState());
    // }
    // let { clusterName } = this.state;
    let { clusterName, data } = this.state;
    // let {  } = currentItem;
    console.log('data = ', values);

    try {
      let payload = this.stateToPayload(values);
      // if (!isEdit) {
      let response = await createRule(clusterName, payload);
      console.log('response@save = ', response);
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
    console.log('render@RuleEditor');
    let { onChange, projects } = this.props;
    let { data, instances, clusters, namespaces, clusterName, listenerList, isPlatform } = this.state;
    let { name, isSharedRule, project, namespace, scope, lbID, useListener, listener } = data;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    console.log('clusterList = ', clusterList);
    let projectList = projects.map(({ id, name }) => ({
      value: id,
      text: name,
    }));
    let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    // TODO: 业务侧下面通过*无法获取关联的集群，去掉
    // namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });

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
      let { onChange } = this.props;
      let { data } = this.state;
      // let { clbId, scope } = data;
      console.log('formState = ', formState);
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
        initialValuesEqual={() => true}
        initialValues={{
          name,
          isSharedRule,
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
                <Name name="name" label={labels.ruleName} />
                <ShareSwitcher name="isSharedRule" label={labels.switch} />
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
                <Scope
                  name="scope"
                  label={labels.sharedNamespace}
                  options={namespaceList}
                  onChange={this.handleScopeChanged}
                />
                <LBID name="lbID" label={labels.clbInstance} records={instances} />
                <ListenerChoice name="useListener" label={labels.useListener} />
                {useListener === 'new' ? (
                  <ListenerCreator name="listener" onClick={this.handleGeneratePort} />
                ) : (
                  <ListenerList name="listener" records={listenerList} />
                )}
              </Form>
            </form>
          );
        }}
      </FinalForm>
    );
  };
}

export { RuleEditor, ListenerType };
