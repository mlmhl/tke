/**
 * 实例编辑器（导入实例）
 */
import React from 'react';
import { Form as FinalForm, Field, useForm } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Card, Form, Input, SelectMultiple, Table } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import AutoSave from '../../components/AutoSave';
import {
  getAvailableInstancesByCluster,
  getImportedInstancesByCluster,
  getNamespacesByCluster,
} from '../../services/api';

const isEqual = require('lodash.isequal');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

const labels = {
  ruleName: '规则名称',
  clbName: 'CLB名称',
  clbId: 'CLB ID',
  type: '网络类型',
  vip: 'VIP',
  network: '所属网络',
  namespace: '允许使用本实例的命名空间',
  instance: '选择实例',
};

function getStatus(meta, validating) {
  if (meta.active && validating) {
    return 'validating';
  }
  if (!meta.touched) {
    return null;
  }
  return meta.error ? 'error' : 'success';
}

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
  data?: any;

  instances: Instance[]; // 可用实例

  namespaces: String[]; // 可用实例

  selectedCLB: any; // 编辑器中选中的clb实例行
}

class InstanceEditor extends React.Component<PropTypes, StateTypes> {
  state = {
    data: this.props.value,
    instances: [],
    namespaces: [],
    selectedCLB: '',
  };

  componentDidMount() {
    this.loadData();
  }

  /**
   * 加载初始化数据：可选CLB实例列表和命名空间列表
   */
  loadData = async () => {
    const { clusterName } = this.props;
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
    this.setState({ instances, namespaces });
  };

  render = () => {
    let { onChange } = this.props;
    let { data, instances, namespaces, selectedCLB } = this.state;
    let { clbId = '', scope = [] } = data;
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
        onSubmit={save}
        initialValuesEqual={() => true}
        initialValues={{
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
                      label={t('选择实例')}
                      required
                      status={getStatus(meta, validating)}
                      message={getStatus(meta, validating) === 'error' ? meta.error : t('选择一个希望导入的 CLB 实例')}
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
                    return !value ? t('请选择命名空间') : undefined;
                  }}
                >
                  {({ input, meta, ...rest }) => (
                    <Form.Item
                      label={t('允许使用实例的命名空间')}
                      required
                      status={getStatus(meta, validating)}
                      message={getStatus(meta, validating) === 'error' && meta.error}
                    >
                      <SelectMultiple
                        {...input}
                        {...rest}
                        appearence="button"
                        size="m"
                        placeholder={t('请选择命名空间')}
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
