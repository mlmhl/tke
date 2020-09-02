/**
 * 实例编辑器（导入实例）
 */
import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { Card, Form, Select, SelectMultiple, Table } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Cluster as ClusterType } from '../../models';
import AutoSave from '../../components/AutoSave';
import {
  getAllClusters,
  getAvailableInstancesByCluster,
  getImportedInstancesByCluster,
  getNamespacesByCluster,
} from '../../services/api';

const isEqual = require('lodash.isequal');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

const labels = {
  cluster: '选择集群',
  ruleName: '规则名称',
  clbName: 'CLB名称',
  clbId: 'CLB ID',
  type: '网络类型',
  vip: 'VIP',
  network: '所属网络',
  namespace: '允许使用本实例的命名空间',
  instance: '选择实例',
};

const required = value => (value ? undefined : 'Required');

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

  imported: boolean; // 是否已导入
}

interface PropTypes {
  clusterName: string; // 集群名称

  value?: any; // value 属性，和 onChange 对应的

  onChange?: (value) => void;
}

interface StateTypes {
  clusterName: string; // 集群名称

  data?: any;

  clusters: ClusterType[];

  instances: Instance[]; // 可用实例

  namespaces: String[]; // 可使用该实例的命名空间

  selectedCLB: any; // 编辑器中选中的clb实例行
}

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

class InstanceEditor extends React.Component<PropTypes, StateTypes> {
  state = {
    data: this.props.value,
    clusterName: this.props.clusterName || '', // 如果提供了的话可以从props中获取
    clusters: [], // 平台侧下的集群列表
    namespaces: [],
    instances: [],
    selectedCLB: '',
  };

  componentDidMount() {
    this.loadData();
  }

  /**
   * 在平台侧时，获取全部集群列表
   */
  loadData = async () => {
    let { clusterName } = this.state;
    let clusters = await getAllClusters();
    this.setState({ clusters });
    // 缓存处理（如果没有从父组件传入clusterName的话使用缓存中的）
    let selectedClusterName = clusterName || window.localStorage.getItem('selectedClusterName');
    if (clusters.map(item => item.name).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  handleClusterChanged = async clusterName => {
    let instances = await getAvailableInstancesByCluster(clusterName);
    // NOTE: 这里的接口数据是直接从公有云的接口返回的，因此跟tkestack的规范约定并不一致
    let importedInstances = await getImportedInstancesByCluster(clusterName); // 主键clbID
    let importedClbIDs = importedInstances.map(item => item.clbID);
    // 给 instances 标注是否已导入
    instances = instances.map(({ LoadBalancerId, LoadBalancerName, LoadBalancerVips, LoadBalancerType }) => ({
      clbId: LoadBalancerId,
      clbName: LoadBalancerName,
      vips: LoadBalancerVips,
      type: LoadBalancerType,
      imported: importedClbIDs.includes(LoadBalancerId),
    }));
    const namespaces = await getNamespacesByCluster(clusterName);
    this.setState({ clusterName, instances, namespaces });
  };

  render = () => {
    let { onChange } = this.props;
    let { data, clusters, instances, namespaces, selectedCLB, clusterName } = this.state;
    let { clbId = '', scope = [] } = data;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });

    const save = form => {
      return values => {
      };
    };

    const onFormChange = formState => {
      let { onChange } = this.props;
      let { data } = this.state;
      let { clbId, scope } = data;
      if (onChange) {
        onChange({ values: formState.values, valid: formState.valid });
      }
    };

    const validate = async ({ clbId, scope }) => {
      if (!clbId) {
        return '请选择一个实例';
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
        onSubmit={save}
        initialValuesEqual={() => true}
        initialValues={{
          clusterName,
          clbId: '',
          scope: [],
        }}
        mutators={{ setFieldData }}
        subscription={{}}
      >
        {({ form, handleSubmit, validating, submitting, values, valid }) => {
          return (
            <form id="repoForm" onSubmit={handleSubmit}>
              <AutoSave setFieldData={form.mutators.setFieldData} save={save(form)} onChange={onFormChange} />
              <Form layout="vertical">
                <Cluster
                  name="clusterName"
                  label={labels.cluster}
                  options={clusterList}
                  onChange={this.handleClusterChanged}
                />
                <Field
                  name="clbId"
                  required
                  validate={async value => {
                    const result = await validate({
                      clbId: value,
                      scope: form.getFieldState('scope').value,
                    });
                    return result;
                  }}
                >
                  {({ input: { onChange, value }, meta, ...rest }) => (
                    <Form.Item
                      label="选择实例"
                      required
                      status={getStatus(meta)}
                      message={getStatus(meta) === 'error' ? meta.error : '选择一个希望导入的 CLB 实例'}
                    >
                      <Card>
                        <Table
                          verticalTop
                          records={instances}
                          rowDisabled={record => record.imported}
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
                                  {instance.vips && instance.vips.map(vip => (
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
                              value: selectedCLB, // 取的是 recordKey 字段的值
                              rowSelect: true,
                              onChange: (value, context) => {
                                onChange(value);
                                this.setState({ selectedCLB: value });
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
                <Field
                  name="scope"
                  required
                  // validateOnBlur
                  // validateFields={[]}
                  validate={value => {
                    return !value ? '请选择命名空间' : undefined;
                  }}
                >
                  {({ input, meta, ...rest }) => (
                    <Form.Item
                      label="允许使用实例的命名空间"
                      required
                      status={getStatus(meta)}
                      message={getStatus(meta) === 'error' && meta.error}
                    >
                      <SelectMultiple
                        {...input}
                        {...rest}
                        appearence="button"
                        size="l"
                        placeholder="请选择命名空间"
                        options={namespaceList}
                      />
                    </Form.Item>
                  )}
                </Field>
              </Form>
            </form>
          );
        }}
      </FinalForm>
    );
  };
}

export { InstanceEditor };
