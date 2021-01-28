/**
 * 实例编辑器（导入实例）
 */
import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';
import {
  Card,
  Form,
  Select,
  SelectMultiple,
  Table,
  Pagination,
  Justify,
  Button,
  Input,
  SearchBox,
} from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { get } from 'lodash';

import { Cluster as ClusterType, PagingQuery } from '../../models';
import { ImportedInstance, Instance, InstanceForTable } from '../../models/instance';
import AutoSave from '../../components/AutoSave';
import {
  getAllClusters,
  getAvailableInstancesByCluster,
  getImportedInstancesByCluster,
  getNamespacesByCluster,
} from '../../services/api';
import { fetchProjectList } from '@src/modules/project/WebAPI';
const { useState, useEffect } = React;

declare const WEBPACK_CONFIG_SHARED_CLUSTER: boolean;

const isEqual = require('lodash.isequal');
const { radioable, filterable } = Table.addons;

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

const TYPE_TEXT = {
  INTERNAL: '内网',
  OPEN: '公网',
};
const ALL_VALUE = '__ALL__';

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

type PropTypes = {
  clusterName: string; // 集群名称

  value?: any; // value 属性，和 onChange 对应的

  onChange?: (value) => void;
};

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

  keyword: string;

  type: string; // 筛选用的类型
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

const CMDBMapping = {
  'teg.tkex.oa.com/department': 'department',
  'teg.tkex.oa.com/department-id': 'departmentID',
  'teg.tkex.oa.com/business1': 'business1',
  'teg.tkex.oa.com/business1-id': 'business1ID',
  'teg.tkex.oa.com/business2': 'business2',
  'teg.tkex.oa.com/business2-id': 'business2ID',
  'teg.tkex.oa.com/product': 'product',
  'teg.tkex.oa.com/product-id': 'productId',
};

// 共享集群的业务信息
export type ProjectInfoType = {
  project: string;

  projectId: string;

  projectName: string;

  projectDisplayName?: string;

  department: string;

  departmentID: number;

  business1: string;

  business1ID: number;

  business2: string;

  business2ID: number;
};

function ProjectSelector(props) {
  const { value: prevProject, onChange } = props;
  const [currentProject, setCurrentProject] = useState(prevProject.projectName);
  const [projectList, setProjectList] = useState([]);

  useEffect(() => {
    const getProjectList = async () => {
      const data = await fetchProjectList({
        filter: {},
        searchFilter: {},
      });
      const { recordCount, records } = data;
      const formatProject = projectDetail => {
        let cmdbInfo = {};
        const { labels, annotations } = projectDetail.metadata;
        cmdbInfo = Object.assign({}, labels ? labels : {}, annotations ? annotations : {});
        const cmdbValue = Object.keys(CMDBMapping).reduce((accu, item, arr) => {
          if (cmdbInfo[item]) {
            accu[CMDBMapping[item]] = new RegExp(/-id$/).test(item) ? Number(cmdbInfo[item]) : cmdbInfo[item];
          }
          return accu;
        }, {});
        return {
          projectName: projectDetail.metadata.name,
          projectDisplayName: projectDetail.spec.displayName,
          ...cmdbValue,
        };
      };
      const projectList = records.map(item => formatProject(item));

      setProjectList(projectList);
      return data;
    };
    getProjectList();
  }, []);

  return (
    <Form.Item required label="用户所在业务">
      <Select
        value={currentProject}
        onChange={value => {
          setCurrentProject(value);
          const project = projectList.find(item => item.projectName === value);

          if (onChange) {
            onChange(project);
          }
        }}
        options={projectList.map((item: ProjectInfoType) => ({
          text: `${item.projectDisplayName}(${item.department}-${item.business1}-${item.business2})`,
          value: item.projectName,
        }))}
        searchable
        type="simulate"
        appearence="button"
        size="l"
        boxSizeSync
      />
    </Form.Item>
  );
}

class InstanceEditor extends React.Component<PropTypes, StateTypes> {
  defaultPageSize = 10; // 前端默认的分页大小
  state = {
    data: this.props.value,
    clusterName: this.props.clusterName || '', // 如果提供了的话可以从props中获取
    clusters: [], // 平台侧下的集群列表
    namespaces: [],
    instanceTotalCount: 0,
    importedInstances: [], // 已导入实例列表
    instanceList: [],
    pageIndex: 1,
    pageSize: this.defaultPageSize,
    keyword: '',
    type: ALL_VALUE,
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
      pageSize,
    };
    const [instanceTotalCount, instances] = await this.getInstances({ clusterName, pagination, keyword });
    const importedInstances = await this.getImportedInstances(clusterName);
    const namespaces = await getNamespacesByCluster(clusterName);
    const instanceList = this.withImported(instances, importedInstances);
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
      pageSize,
    };
    const [instanceTotalCount, instances] = await this.getInstances({ clusterName, pagination, keyword });
    const instanceList = this.withImported(instances, importedInstances);
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
    const query = {
      clusterName,
      pagination: {
        pageSize,
        pageIndex,
      },
      keyword,
    };

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
      imported: importedClbIDs.includes(item.clbId),
    }));
  };

  render = () => {
    let { onChange } = this.props;
    let {
      data,
      clusters,
      instanceTotalCount,
      pageSize,
      pageIndex,
      keyword,
      type,
      importedInstances,
      instanceList,
      namespaces,
      selectedCLB,
      clusterName,
    } = this.state;
    let { clbId = '', scope = [] } = data;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
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

    let filteredRecords = instanceList.slice();

    // 根据网络类型筛选
    if (type !== ALL_VALUE) {
      filteredRecords = filteredRecords.filter(x => x.type === type);
    }

    return (
      <FinalForm
        onSubmit={save}
        initialValuesEqual={() => true}
        initialValues={{
          clusterName,
          clbId: '',
          scope: [],
          project: {
            // projectName: 'prj-wnlmnh7r',
            // department: 'AI平台部',
            // departmentID: 56,
            // business1: '[SNG][qq相册搜索]',
            // business1ID: 460857,
            // business2: '[搜索业务中心][qzone旅游相册]',
            // business2ID: 419663,
          },
          user: '',
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
                        <Card.Body>
                          <SearchBox
                            // disabled={loading}
                            value={keyword}
                            onChange={keyword => this.setState({ keyword: keyword.trim() })}
                            onSearch={this.handleSearchButtonClicked}
                            onClear={() => this.setState({ keyword: '' })}
                            placeholder="搜索CLBID/CLBName/VIP"
                          />
                          <Table
                            verticalTop
                            records={filteredRecords}
                            rowDisabled={record => record.imported}
                            recordKey="clbId"
                            columns={[
                              {
                                key: 'clbId',
                                header: 'CLB ID',
                                render: instance => instance.clbId,
                              },
                              {
                                key: 'clbName',
                                header: 'CLB名称',
                              },
                              {
                                key: 'vips',
                                header: 'VIP',
                                render: instance => (
                                  <>{instance.vips && instance.vips.map(vip => <p key={vip}>{vip}</p>)}</>
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
                                emptyText: '暂无数据',
                              }),
                              // 对 type 列增加单选过滤支持
                              filterable({
                                type: 'single',
                                column: 'type',
                                value: type,
                                onChange: value => this.setState({ type: value }),
                                // 增加 "全部" 选项
                                all: {
                                  value: ALL_VALUE,
                                  text: '全部',
                                },
                                // 选项列表
                                options: [
                                  { value: 'OPEN', text: '公网' },
                                  { value: 'INTERNAL', text: '内网' },
                                ],
                              }),
                              radioable({
                                value: selectedCLB, // 取的是 recordKey 字段的值
                                rowSelect: true,
                                onChange: (value, context) => {
                                  onChange(value);
                                  this.setState({ selectedCLB: value });
                                },
                              }),
                            ]}
                          />
                          <Pagination
                            recordCount={instanceTotalCount}
                            pageSizeOptions={[10, 20, 30, 50, 100]}
                            pageIndex={pageIndex}
                            pageSize={pageSize}
                            onPagingChange={query => {
                              // 获取新的可用clb列表数据
                              this.handleCLBTableChange(query);
                            }}
                            stateTextVisible={true}
                            pageSizeVisible={true}
                            pageIndexVisible={true}
                            jumpVisible={true}
                            endJumpVisible={true}
                          />
                        </Card.Body>
                      </Card>
                    </Form.Item>
                  )}
                </Field>
                {WEBPACK_CONFIG_SHARED_CLUSTER && (
                  <>
                    <Field
                      name="project"
                      required
                      validate={value => {
                        return !value ? '请选择业务' : undefined;
                      }}
                    >
                      {({ input, meta, ...rest }) => <ProjectSelector {...input} />}
                    </Field>
                    <Field
                      name="user"
                      required
                      validate={value => {
                        return !value ? '请输入用户' : undefined;
                      }}
                    >
                      {({ input, meta, ...rest }) => (
                        <Form.Item required label="用户申请人">
                          <Input {...input} />
                        </Form.Item>
                      )}
                    </Field>
                  </>
                )}
                <Field
                  name="scope"
                  required
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
