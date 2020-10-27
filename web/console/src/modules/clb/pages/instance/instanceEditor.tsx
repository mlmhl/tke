/**
 * 实例编辑器（导入实例）
 */
import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import { Card, Form, Select, SelectMultiple, Table, Pagination, Justify, Button, Input } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { Cluster as ClusterType, PagingQuery } from '../../models';
import { ImportedInstance, Instance, InstanceForTable } from '../../models/instance';
import AutoSave from '../../components/AutoSave';
import {
  getAllClusters,
  getAvailableInstancesByCluster,
  getImportedInstancesByCluster,
  getNamespacesByCluster
} from '../../services/api';

const isEqual = require('lodash.isequal');
const { radioable } = Table.addons;

const labels = {
  cluster: '选择集群',
  ruleName: '规则名称',
  clbName: 'CLB名称',
  clbId: 'CLB ID',
  type: '网络类型',
  vip: 'VIP',
  network: '所属网络',
  namespace: '允许使用本实例的命名空间',
  instance: '选择实例'
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

interface PropTypes {
  clusterName: string; // 集群名称

  value?: any; // value 属性，和 onChange 对应的

  onChange?: (value) => void;
}

interface StateTypes {
  clusterName: string; // 集群名称

  data?: any;

  clusters: ClusterType[];

  importedInstances: Instance[]; // 已经被导入的实例列表

  instanceList: InstanceForTable[]; // 数据加工后可以给表格组件使用的数据

  namespaces: String[]; // 可使用该实例的命名空间

  selectedCLB: any; // 编辑器中选中的clb实例行

  instanceTotalCount: number; // 实例总数

  pageSize: number; // 分页大小

  pageIndex: number; // 从1开始的页码
}

interface IQuery {
  clusterName: string;

  pagination: PagingQuery;

  keyword: string;
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
  defaultPageSize = 2; // 系统默认的分页大小
  state = {
    data: this.props.value,
    clusterName: this.props.clusterName || '', // 如果提供了的话可以从props中获取
    clusters: [], // 平台侧下的集群列表
    namespaces: [],
    // instances: [], // 全部实例列表
    instanceTotalCount: 0,
    importedInstances: [], // 已导入实例列表
    instanceList: [],
    pageIndex: 1,
    pageSize: this.defaultPageSize,
    keyword: '',
    selectedCLB: ''
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

  /**
   * 处理集群下拉选择框的切换事件
   * 分页页码重新开始，页面大小保持不变；重新拉取全部实例，已导入实例列表，和命名空间列表
   * 重新计算表格渲染需要使用的数据，更新当前集群，命名空间列表，实例总数，offset(页码), 当前页实例列表？，已导入实例列表，表格用数据实例列表的状态
   * @param clusterName
   */
  handleClusterChanged = async clusterName => {
    const { pageSize, keyword } = this.state;
    const pageIndex = 1;
    const pagination: PagingQuery = {
      pageIndex,
      pageSize
    };
    const [instanceTotalCount, instances] = await this.getInstances({ clusterName, pagination, keyword });
    const importedInstances = await this.getImportedInstances(clusterName);
    const namespaces = await getNamespacesByCluster(clusterName);
    const instanceList = this.withImported(instances, importedInstances);
    // this.setState({ clusterName, namespaces, instanceTotalCount, offset, instances, importedInstances, instanceList });
    this.setState({ clusterName, namespaces, instanceTotalCount, pageIndex, importedInstances, instanceList });
  };

  /**
   * 点击查询按钮进行查询
   * 根据当前所在的集群和搜索条件进行查询，页面大小保持跟当前状态一致，页码归零即回到第一页，筛选条件重置。
   * 重新拉取全部实例列表，已导入实例列表保持不变，重新计算表格需要用到的数据实例列表
   * 更新状态：页码，全部实例列表，表格数据列表，总条数
   * 重置分页和筛选条件
   */
  handleSearchButtonClicked = async () => {
    const { clusterName, pageSize, keyword, importedInstances } = this.state;
    const pageIndex = 1;
    const pagination = {
      pageIndex,
      pageSize
    };
    const [instanceTotalCount, instances] = await this.getInstances({ clusterName, pagination, keyword });
    const instanceList = this.withImported(instances, importedInstances);
    // this.setState({ instanceTotalCount, offset, instances, instanceList });
    this.setState({ instanceTotalCount, pageIndex, instanceList });
  };

  /**
   * 用户切换分页：变更页码或者页面大小
   * 根据分页参数和搜索条件重新进行数据查询，拉取新的实例列表，
   * 更新以下状态：表格数据实例列表，分页状态：offset, limit，
   * @param pagination
   */
  handleCLBTableChange = async pagination => {
    const { clusterName, keyword, importedInstances } = this.state;
    const { pageSize, pageIndex } = pagination;
    // NOTE: 注意这里面有个问题，就是关键字变更的时候，如果没有重新点查询，这时候切换页码的话其实应该在原来的查询条件的基础上进行分页
    // const filters = Object.keys(filtersArg).reduce((obj, key) => {
    //   const newObj = { ...obj }
    //   newObj[key] = getValue(filtersArg[key])
    //   return newObj
    // }, {})

    // TODO: 加类型说明
    const query = {
      clusterName,
      pagination: {
        pageSize,
        pageIndex
      },
      keyword
    };
    // if (sorter.field) {
    //   params.sorter = `${sorter.field}_${sorter.order}`
    // }

    const [instanceTotalCount, instances] = await this.getInstances(query);
    const instanceList = this.withImported(instances, importedInstances);
    this.setState({ instanceTotalCount, ...query.pagination, instanceList });
  };

  /**
   * 拉取clb实例列表
   * 支持分页
   * @param clusterName
   * @param pagination
   */
  getInstances = async ({ clusterName, pagination, keyword = '' }: IQuery): Promise<[number, Instance[]]> => {
    console.log('pagination@getInstanceList = ', pagination);
    // const { limit, offset } = pagination;
    let [instanceTotalCount, instances] = await getAvailableInstancesByCluster(clusterName, pagination, keyword);
    return [instanceTotalCount, instances];
  };

  /**
   * 拉取已经导入到系统的clb实例数据
   * @param clusterName
   */
  getImportedInstances = async (clusterName): Promise<ImportedInstance[]> => {
    return getImportedInstancesByCluster(clusterName); // 主键clbID
  };

  /**
   * 数据加工，给实例增加是否已经被导入的标识
   * @param instances
   * @param importedInstances
   */
  withImported = (instances: Instance[], importedInstances: ImportedInstance[]): InstanceForTable[] => {
    const importedClbIDs = importedInstances.map(item => item.clbId);
    return instances.map(item => ({
      ...item,
      imported: importedClbIDs.includes(item.clbId)
    }));
  };

  render = () => {
    let { onChange } = this.props;
    let {
      data,
      clusters,
      instanceTotalCount,
      // limit,
      pageSize,
      // offset,
      pageIndex,
      // instances,
      importedInstances,
      instanceList,
      namespaces,
      selectedCLB,
      clusterName
    } = this.state;
    let { clbId = '', scope = [] } = data;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`
    }));
    let namespaceList = namespaces.map(item => ({ text: item.name, value: item.name }));
    namespaceList.unshift({ text: '*(任意命名空间)', value: '*' });

    const save = form => {
      return values => {};
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
    };

    return (
      <FinalForm
        onSubmit={save}
        initialValuesEqual={() => true}
        initialValues={{
          clusterName,
          clbId: '',
          scope: []
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
                      scope: form.getFieldState('scope').value
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
                        <Table.ActionPanel>
                          <Justify
                            left={
                              <Button htmlType="button" type="primary" onClick={this.handleSearchButtonClicked}>
                                查询
                              </Button>
                            }
                            right={
                              <Form layout="inline">
                                <Form.Item align="middle" label="CLB ID">
                                  <Input />
                                </Form.Item>
                              </Form>
                            }
                          />
                        </Table.ActionPanel>
                        <Table
                          verticalTop
                          records={instanceList}
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
                              )
                            },
                            {
                              key: 'clbName',
                              header: 'CLB名称'
                            },
                            {
                              key: 'vips',
                              header: 'VIP',
                              render: instance => (
                                <>{instance.vips && instance.vips.map(vip => <p key={vip}>{vip}</p>)}</>
                              )
                            },
                            {
                              key: 'type',
                              header: '网络类型',
                              render: instance => (
                                <>
                                  <p>{instance.type === 'OPEN' ? '公网' : '内网'}</p>
                                </>
                              )
                            }
                          ]}
                          addons={[
                            autotip({
                              // isLoading: loading,
                              // isError: Boolean(error),
                              // isFound: Boolean(keyword),
                              // onClear: () => setKeyword(""),
                              // onRetry: load,
                              // foundKeyword: keyword,
                              emptyText: '暂无数据'
                            }),
                            radioable({
                              value: selectedCLB, // 取的是 recordKey 字段的值
                              rowSelect: true,
                              onChange: (value, context) => {
                                onChange(value);
                                this.setState({ selectedCLB: value });
                              }
                              // render: (element, { disabled }) => {
                              //   return disabled ? <Icon type="loading" /> : element;
                              // },
                            })
                          ]}
                        />
                        <Pagination
                          recordCount={instanceTotalCount}
                          pageSizeOptions={[1, 2, 10, 20, 30, 50, 100]}
                          pageIndex={pageIndex}
                          pageSize={pageSize}
                          onPagingChange={query => {
                            console.log('query = ', query);
                            // 获取新的可用clb列表数据
                            this.handleCLBTableChange(query);
                          }}
                          stateTextVisible={true}
                          pageSizeVisible={true}
                          pageIndexVisible={true}
                          jumpVisible={true}
                          endJumpVisible={true}
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
