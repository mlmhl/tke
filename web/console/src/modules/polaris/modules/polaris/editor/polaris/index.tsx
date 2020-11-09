/**
 * 北极星创建
 */
import React, { useState, useEffect, useContext, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { CHANGE_CLUSTER, CHANGE_PROJECT, StateContext, DispatchContext } from '../../context';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  Layout,
  Card,
  Select,
  Text,
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  Radio,
  Table,
  Bubble,
  List,
  Icon
} from '@tencent/tea-component';
import { LinkButton } from '@src/modules/common/components';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { isEmpty } from '@src/modules/common/utils';
import { insertCSS, uuid } from '@tencent/ff-redux/libs/qcloud-lib';
import { useNamespaces, useWorkloads } from '@src/modules/polaris/common/hooks';
import { createPolaris } from '../../../../services/api';
import ClusterSelector from '@src/modules/polaris/common/components/clusterSelector';
import ProjectSelector from '@src/modules/polaris/common/components/projectSelector';
import NamespaceSelector from '@src/modules/polaris/common/components/namespaceSelector';

/**
 * 组件样式
 */
insertCSS(
    'polaris-editor-panel',
    `
      .polaris-edit-strategy-ul { margin-bottom : 10px; }
      .polaris-edit-strategy-li + .polaris-edit-strategy-li { margin-top: 5px; }
    `
);

const polarisNamespaceList = [
  {
    text: 'Test',
    value: 'Test'
  },
  {
    text: 'Production',
    value: 'Production'
  },
  {
    text: 'Development',
    value: 'Development'
  },
  {
    text: 'Pre-release',
    value: 'Pre-release'
  },
  {
    text: 'Polaris',
    value: 'Polaris'
  }
];

const PolarisEditor = (
  props: {
    clusterList: any[];
    namespaceList: any[];
    projectList: any[];
    isFormBottomButtonShow?: boolean;
    selectedRecord?: any;
    createToggle: () => void;
    triggerRefresh: () => void;
  },
  ref
) => {
  const scopeState = useContext(StateContext);
  const scopeDispatch = useContext(DispatchContext);
  const { namespaceId, clusterId, projectId, isPlatform } = scopeState;
  const { clusterList = [], namespaceList = [], projectList = [], isFormBottomButtonShow = true, createToggle, triggerRefresh } = props;

  /**
   * 表单初始化
   */
  const { register, watch, handleSubmit, reset, control, errors, setValue } = useForm<{
      cluster?: string;
      project?: string;
      namespace: string;
      ruleName: string;
      polarisNamespace: string;
      token: string;
      serviceName: string;
      weight: number;
      protocol: string;
      version: string;
      metadata: any;
      isolate: boolean;
      healthy?: string;
      enableHealthCheck: boolean;
      healthCheckType?: string;
      healthCheckTTL?: number;
      podChoice: string;
      resourceType: string;
      resource: string;
      excludePodNames?: any;
      includePodNames?: any;
      ports: any;
    }>({
    mode: 'onBlur',
    defaultValues: {
      cluster: clusterId,
      project: projectId,
      namespace: isPlatform ? namespaceId : `${clusterId}-${namespaceId}`,
      ruleName: '',
      polarisNamespace: '',
      token: '',
      serviceName: '',
      weight: null,
      protocol: '',
      version: '',
      metadata: [],
      isolate: false,
      healthy: 'true',
      enableHealthCheck: false,
      healthCheckType: '上报心跳',
      healthCheckTTL: 1,
      podChoice: 'byLabel',
      resourceType: 'deployments',
      resource: '',
      excludePodNames: [],
      includePodNames: [],
      ports: [{ protocol: 'TCP', port: null }],
    }
  });
  const { fields: metadataFields, append: metadataAppend, remove: metadataRemove } = useFieldArray({
    control,
    name: 'metadata'
  });

  const { fields: excludePodFields, append: excludePodAppend, remove: excludePodRemove } = useFieldArray({
    control,
    name: 'excludePodNames'
  });

  const { fields: includePodFields, append: includePodAppend, remove: includePodRemove } = useFieldArray({
    control,
    name: 'includePodNames'
  });

  const { fields: portsFields, append: portsAppend, remove: portsRemove } = useFieldArray({
    control,
    name: 'ports'
  });

  const { cluster, project, namespace, resourceType, resource, healthy, enableHealthCheck, podChoice } = watch();

  /**
   * 在UI上不知道是不是UI组件确实什么的原因，控制不住数据，所以这里额外加了控制逻辑，配合UI上的数据处理一起使用
   */
  useEffect(() => {
    if (enableHealthCheck) {
      setValue('healthy', 'false');
    } else {
      setValue('healthy', 'true');
    }
  }, [enableHealthCheck]);


  // useEffect(() => {
  //   setValue('namespace', '');
  // }, [project, cluster]);

  /**
   * 设置命名空间列表数据
   */
  // 根据props设置
  const [theNamespaceList, setTheNamespaceList] = useState([]);
  useEffect(() => {
    if (!isEmpty(namespaceList)) {
      setTheNamespaceList(namespaceList);
    }
  }, [namespaceList]);

  // 切换cluster、project后重新设置
  // const newNamespaceList = useNamespaces({ projectId, clusterId });
  const newNamespaceList = useNamespaces({ projectId: project, clusterId: cluster });
  const [groups, setGroups] = useState({});
  useEffect(() => {
    if (!isEmpty(newNamespaceList)) {
      setTheNamespaceList(newNamespaceList);
      // setValue('namespace', newNamespaceList[0].value);
      if (!isPlatform) {
        const groupObj = {};
        newNamespaceList.forEach(item => {
          groupObj[item.groupKey] = item.groupValue;
        });
        setGroups(groupObj);
      }
    }
    // else {
    //   setTheNamespaceList([]);
    //   setValue('namespace', '');
    // }
  }, [newNamespaceList]);

  /**
   * 设置选择namespace的id
   */
  const [selectedNamespaceId, setSelectedNamespaceId] = useState('');
  useEffect(() => {
    if (isPlatform) {
      setSelectedNamespaceId(namespace);
    } else {
      theNamespaceList.forEach(item => {
        const { value, namespaceId, groupKey } = item;
        if (value === namespace) {
          setSelectedNamespaceId(namespaceId);
          setValue('cluster', groupKey);
        }
      });
    }
  }, [namespace, theNamespaceList]);

  /**
   * 选择 Pod后，进行相关数据设置
   */
  useEffect(() => {
    if (podChoice === 'byLabel') {
      // 删除全部
      includePodRemove();
    } else {
      includePodAppend({ name: '' });
    }
  }, [podChoice]);

  /**
   * 处理 容器参数 中按Label 中的selector部分
   */
  const [labels, setLabels] = useState({});

  // const workloads = useWorkloads({ type: resourceType, clusterName: clusterId, namespace: selectedNamespaceId });
  const workloads = useWorkloads({ type: resourceType, clusterName: cluster || clusterId, namespace: selectedNamespaceId });
  const workloadList = workloads.map(item => ({ value: item.name, text: item.name }));

  useEffect(() => {
    setLabels({});
    setValue('resource', '');
  }, [workloads]);

  useEffect(() => {
    setLabels([]);
  }, [resourceType]);

  useEffect(() => {
    if (resource) {
      const workload = workloads.find(item => item.name === resource);
      const { labels = {}} = workload;
      setLabels(labels);
    }
  }, [resource, namespace]);

  console.log('errors is:', resourceType, isPlatform, cluster, namespace, selectedNamespaceId, workloads, workloadList, errors);
  /**
   * 表单提交数据处理
   * @param data
   */
  const onSubmit = data => {
    console.log('data is:', data);
    const { cluster, namespace, ruleName, polarisNamespace, serviceName, token, weight, protocol, version, metadata = [], isolate, healthy, healthCheckType = '', healthCheckTTL = '', ports, excludePodNames = [], includePodNames = [] } = data;
    let newMetadata = {};
    metadata.forEach(item => {
      const { key, value } = item;
      newMetadata[key] = value;
    });

    // parameters
    let parameters = {
      weight: weight.toString(),
      protocol,
      version,
      metadata: JSON.stringify(newMetadata),
      isolate: isolate.toString(),
      healthy: healthy.toString(),
      enableHealthCheck: enableHealthCheck.toString()
    };
    if (enableHealthCheck) {
      parameters['healthCheckType'] = '1';
      parameters['healthCheckTTL'] = healthCheckTTL.toString();
    }

    // pods
    let pods = {
      ports
    };
    let selector = {};
    Object.keys(labels).forEach(item => {
      selector[item] = labels[item];
    });
    if (podChoice === 'byLabel') {
      pods['byLabel'] = {
        selector,
        except: excludePodNames.map(item => item.name)
      };
    } else {
      pods['byName'] = includePodNames.map(item => item.name);
    }

    const polarisData = {
      apiVersion: 'lbcf.tkestack.io/v1',
      kind: 'Bind',
      metadata: {
        labels: {
          'type.bind': 'polaris'
        },
        name: 'polaris-' + ruleName,
        namespace: selectedNamespaceId,
      },
      spec: {
        loadBalancers: [
          {
            driver: 'lbcf-polaris-driver',
            name: ruleName,
            spec: {
              namespace: polarisNamespace,
              service: serviceName,
              token
            }
          }
        ],
        parameters,
        pods
      }
    };

    console.log('submit namespace, cluster ,polarisData:', namespace, cluster, polarisData);
    async function addPolaris() {
      const addPolarisResult = await createPolaris({
        namespaceId: selectedNamespaceId,
        clusterId: cluster || clusterId,
        polarisData
      });
      if (addPolarisResult) {
        createToggle();
        triggerRefresh();
      }
      // return addPolarisResult;
      // if (addPolarisResult) {
      //
      // }
    }
    addPolaris();
  };

  /**
   * 对父组件暴露接口
   */
  useImperativeHandle(ref, () => ({
    // 在使用 ref 时自定义暴露给父组件的实例值
    create: () => {
      return handleSubmit(onSubmit)();
    }
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Form>
        <Form.Item
          required
          label={t('规则名称')}
          showStatusIcon={false}
          status={errors.ruleName ? 'error' : 'success'}
          message={errors.ruleName && errors.ruleName.message}
        >
          <Controller
            as={Input}
            name="ruleName"
            size="l"
            control={control}
            rules={{
              required: t('规则名称不能为空'),
            }}
          />
        </Form.Item>
      </Form>
      <hr />
      <Form.Title>北极星参数</Form.Title>
      <Form>
        <Form.Item
          required
          label={t('命名空间')}
          showStatusIcon={false}
          status={errors.polarisNamespace ? 'error' : 'success'}
          message={errors.polarisNamespace && errors.polarisNamespace.message}
        >
          <Controller
            as={
              <Select
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={polarisNamespaceList}
              />
            }
            name="polarisNamespace"
            control={control}
            rules={{ required: t('无选中命名空间') }}
          />
        </Form.Item>
        <Form.Item
          required
          label={t('服务名')}
          showStatusIcon={false}
          status={errors.serviceName ? 'error' : 'success'}
          message={errors.serviceName && errors.serviceName.message}
        >
          <Controller
            as={Input}
            name="serviceName"
            size="l"
            control={control}
            rules={{
              required: t('服务名称不能为空'),
              maxLength: {
                value: 128,
                message: t('服务名称不能超过128个字符')
              },
            }}
          />
        </Form.Item>
        <Form.Item
          required
          label={t('Token')}
          showStatusIcon={false}
          status={errors.token ? 'error' : 'success'}
          message={errors.token && errors.token.message}
        >
          <Controller
            as={Input}
            name="token"
            size="l"
            control={control}
            rules={{
                required: t('Token不能为空'),
              }}
          />
        </Form.Item>
        <Form.Item
          required
          label={t('权重')}
          showStatusIcon={false}
          status={errors.weight ? 'error' : 'success'}
          message={errors.weight && errors.weight.message}
        >
          <Controller
            as={<InputNumber step={1} min={0} max={100} />}
            name="weight"
            size="s"
            control={control}
            rules={{
              required: t('权重不能为空'),
            }}
          />
        </Form.Item>
        <Form.Item
          label={t('协议')}
          showStatusIcon={false}
          status={errors.protocol ? 'error' : 'success'}
          message={errors.protocol && errors.protocol.message}
        >
          <Controller
            as={Input}
            name="protocol"
            size="l"
            control={control}
          />
        </Form.Item>
        <Form.Item
          label={t('版本')}
          showStatusIcon={false}
          status={errors.version ? 'error' : 'success'}
          message={errors.version && errors.version.message}
        >
          <Controller
            as={Input}
            name="version"
            size="l"
            control={control}
          />
        </Form.Item>
        <Form.Item
          label={t('元数据')}
          showStatusIcon={false}
        >
          <Card bordered>
            <Card.Body>
              <Table
                compact
                verticalTop
                records={metadataFields}
                recordKey="id"
                columns={[
                  {
                    key: 'key',
                    header: 'Key',
                    render: (record, flag, index) => {
                      return (
                        <div className={errors.metadata && errors.metadata[index] && errors.metadata[index].key ? 'is-error' : ''}>
                          <Bubble content={errors.metadata && errors.metadata[index] && errors.metadata[index].key && errors.metadata[index].key.message}>
                            <Controller
                              as={Input}
                              name={`metadata[${index}].key`}
                              control={control}
                              rules={{
                                required: t('key不能为空'),
                              }}
                            />
                          </Bubble>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'value',
                    header: 'Value',
                    render: (record, flag, index) => {
                      return (
                        <div className={errors.metadata && errors.metadata[index] && errors.metadata[index].value ? 'is-error' : ''}>
                          <Bubble content={errors.metadata && errors.metadata[index] && errors.metadata[index].value && errors.metadata[index].value.message}>
                            <Controller
                              as={Input}
                              name={`metadata[${index}].value`}
                              control={control}
                              rules={{
                                required: t('value不能为空'),
                              }}
                            />
                          </Bubble>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'action',
                    header: t('操作'),
                    render: (record, flag, index) => (
                      <LinkButton
                        onClick={() => {
                          metadataRemove(index);
                        }}
                      >
                        <Trans>删除</Trans>
                      </LinkButton>
                    )
                  }
                ]}
              />
              <Button
                style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                type="weak"
                htmlType="button"
                onClick={() => {
                  metadataAppend({ key: '', value: '' });
                }}
              >
                新增一项
              </Button>
            </Card.Body>
          </Card>
        </Form.Item>
        <Form.Item
          required
          label={t('是否隔离')}
          showStatusIcon={false}
          status={errors.isolate ? 'error' : 'success'}
          message={errors.isolate && errors.isolate.message}
        >
          <Controller
            as={Switch}
            name="isolate"
            control={control}
          />
        </Form.Item>
        <Form.Item
          label={
            <span>
              <span style={{ marginRight: '5px' }}><Trans>健康状态</Trans></span>
              <Bubble
                content="健康状态表示的是注册实例时使用的初始状态，实例的实际状态会根据健康检查的结果发生变化，请登录 polaris.oa.com 查看"
              >
                <Icon type="info" />
              </Bubble>
            </span>
          }
          required
          showStatusIcon={false}
        >
          <Controller
            as={
              <Radio.Group>
                <Radio name="true">健康</Radio>
                <Radio name="false">异常</Radio>
              </Radio.Group>
              }
            name="healthy"
            control={control}
          />
        </Form.Item>
        <Form.Item
          required
          label={t('健康检查')}
          showStatusIcon={false}
          status={errors.enableHealthCheck ? 'error' : 'success'}
          message={errors.enableHealthCheck && errors.enableHealthCheck.message}
        >
          <Controller
            as={Switch}
            name="enableHealthCheck"
            control={control}
          />
        </Form.Item>
        {
          enableHealthCheck && (
          <>
            <Form.Item
              label={t('检查方式')}
              showStatusIcon={false}
              status={errors.healthCheckType ? 'error' : 'success'}
              message={errors.healthCheckType && errors.healthCheckType.message}
                >
              <Controller
                as={Input}
                name="healthCheckType"
                size="s"
                control={control}
                disabled={true}
                defaultValue={t('上报心跳')}
              />
            </Form.Item>
            <Form.Item
              label={t('TTL')}
              showStatusIcon={false}
              status={errors.healthCheckTTL ? 'error' : 'success'}
              message={errors.healthCheckTTL && errors.healthCheckTTL.message}
            >
              <Controller
                as={<InputNumber step={1} min={1} />}
                name="healthCheckTTL"
                size="s"
                control={control}
              />
            </Form.Item>
          </>
          )
        }
      </Form>
      <hr />
      <Form.Title>容器参数</Form.Title>
      <Form>
        <Form.Item
          required={isPlatform ? true : false}
          label={t('集群')}
          showStatusIcon={false}
          style={isPlatform ? {} : { display: 'none' }}
          status={errors.cluster ? 'error' : 'success'}
          message={errors.cluster && errors.cluster.message}
            >
          <Controller
            as={
              <Select
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={clusterList}
              />
                  }
            name="cluster"
            control={control}
            defaultValue={clusterId}
            rules={isPlatform ? { required: t('无选中集群') } : {}}
          />
        </Form.Item>

        <Form.Item
          required={isPlatform ? false : true}
          label={t('业务')}
          style={isPlatform ? { display: 'none' } : {}}
          showStatusIcon={false}
          status={errors.project ? 'error' : 'success'}
          message={errors.project && errors.project.message}
              >
          <Controller
            as={
              <Select
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={projectList}
              />
                }
            name="project"
            control={control}
            defaultValue={projectId}
            rules={isPlatform ? {} : { required: t('无选中业务') }}
          />
        </Form.Item>
        <Form.Item
          required
          label={t('命名空间')}
          showStatusIcon={false}
          status={errors.namespace ? 'error' : 'success'}
          message={errors.namespace && errors.namespace.message}
        >
          <Controller
            as={
              <Select
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={theNamespaceList}
                groups={isPlatform ? undefined : groups}
              />
            }
            name="namespace"
            control={control}
            defaultValue={isPlatform ? namespaceId : `${clusterId}-${namespaceId}`}
            rules={{ required: t('无选中命名空间') }}
          />
        </Form.Item>
        <Form.Item
          label={t('选择 Pod')}
          required
          showStatusIcon={false}
        >
          <Controller
            as={
              <Radio.Group>
                <Radio name="byLabel">按 Label</Radio>
                <Radio name="byName">按 Pod 名</Radio>
              </Radio.Group>
            }
            name="podChoice"
            control={control}
          />
        </Form.Item>
        {podChoice === 'byLabel' ? (
          <Form.Item>
            <Card bordered>
              <Card.Body>
                <Text style={{ fontSize: '14px' }}><Trans>selector:</Trans></Text>
                <Card bordered>
                  <Card.Body>
                    <>
                      <Form.Item
                        label={t('资源类型')}
                        showStatusIcon={false}
                        status={errors.resourceType ? 'error' : 'success'}
                        message={errors.resourceType && errors.resourceType.message}
                      >
                        <Controller
                          as={
                            <Radio.Group>
                              <Radio name="deployments">Deployment</Radio>
                              <Radio name="statefulsets">Statefulset</Radio>
                              <Radio name="tapps">TAPP</Radio>
                            </Radio.Group>
                          }
                          name="resourceType"
                          control={control}
                          defalutValue="deployment"
                        />
                      </Form.Item>
                      <Form.Item
                        label={t('资源列表')}
                        required
                        showStatusIcon={false}
                        status={errors.resource ? 'error' : 'success'}
                        message={errors.resource && errors.resource.message}
                      >
                        <Controller
                          as={
                            <Select
                              searchable
                              boxSizeSync
                              type="simulate"
                              appearence="button"
                              size="l"
                              options={workloadList}
                            />
                          }
                          name="resource"
                          control={control}
                          rules={{ required: t('资源不能为空') }}
                        />
                      </Form.Item>
                      <Form.Item label="Labels">
                        <Form.Text>
                          <List>
                            {Object.keys(labels).map(item => (
                              <List.Item key={item}>{`${item} : ${labels[item]}`}</List.Item>
                            ))}
                          </List>
                        </Form.Text>
                      </Form.Item>
                    </>
                  </Card.Body>
                </Card>
                <br />
                <Text style={{ fontSize: '14px' }}><Trans>排除 Pod:</Trans></Text>
                <Card bordered>
                  <Card.Body>
                    <Table
                      compact
                      verticalTop
                      records={excludePodFields}
                      recordKey="id"
                      columns={[
                          {
                            key: 'name',
                            header: '名称',
                            render: (record, flag, index) => {
                              return (
                                <div className={errors.excludePodNames && errors.excludePodNames[index] && errors.excludePodNames[index].name ? 'is-error' : ''}>
                                  <Bubble content={errors.excludePodNames && errors.excludePodNames[index] && errors.excludePodNames[index].name && errors.excludePodNames[index].name.message}>
                                    <Controller
                                      as={Input}
                                      name={`excludePodNames[${index}].name`}
                                      control={control}
                                      rules={{
                                        required: t('名称不能为空'),
                                      }}
                                    />
                                  </Bubble>
                                </div>
                              );
                            }
                          },
                          {
                            key: 'action',
                            header: t('操作'),
                            render: (record, flag, index) => (
                              <LinkButton
                                onClick={() => {
                                  excludePodRemove(index);
                                }}
                              >
                                <Trans>删除</Trans>
                              </LinkButton>
                            )
                          }
                        ]}
                    />
                    <Button
                      style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                      type="weak"
                      htmlType="button"
                      onClick={() => {
                        excludePodAppend({ name: '' });
                      }}
                    >
                      新增一项
                    </Button>
                  </Card.Body>
                </Card>
                {/*<SelectorAdaptor*/}
                {/*  name={`${name}.selector`}*/}
                {/*  label="selector"*/}
                {/*  clusterName={clusterName}*/}
                {/*  namespace={namespace}*/}
                {/*/>*/}

                {/*<NamesAdaptor name={`${name}.except`} label="排除 Pod" />*/}
              </Card.Body>
            </Card>
          </Form.Item>
        ) : (
          <Form.Item>
            <Card bordered>
              <Card.Body>
                <Table
                  compact
                  verticalTop
                  records={includePodFields}
                  recordKey="id"
                  columns={[
                    {
                      key: 'name',
                      header: '名称',
                      render: (record, flag, index) => {
                        return (
                          <div className={errors.includePodNames && errors.includePodNames[index] && errors.includePodNames[index].name ? 'is-error' : ''}>
                            <Bubble content={errors.includePodNames && errors.includePodNames[index] && errors.includePodNames[index].name && errors.includePodNames[index].name.message}>
                              <Controller
                                as={Input}
                                name={`includePodNames[${index}].name`}
                                control={control}
                                rules={{
                                  required: t('名称不能为空'),
                                }}
                              />
                            </Bubble>
                          </div>
                        );
                      }
                    },
                    {
                      key: 'action',
                      header: t('操作'),
                      render: (record, flag, index) => {
                        if (includePodFields.length > 1) {
                          return (
                            <LinkButton
                              onClick={() => {
                                  includePodRemove(index);
                                }}
                            >
                              <Trans>删除</Trans>
                            </LinkButton>
                          );
                        }
                      }
                    }
                  ]}
                />
                <Button
                  style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                  type="weak"
                  htmlType="button"
                  onClick={() => {
                      includePodAppend({ name: '' });
                    }}
                >
                  新增一项
                </Button>
              </Card.Body>
            </Card>
          </Form.Item>
        )}
        <Form.Item label={t('Pod端口')} required>
          <Card bordered>
            <Card.Body>
              <Table
                compact
                verticalTop
                records={portsFields}
                recordKey="id"
                columns={[
                  {
                    key: 'protocol',
                    header: '协议',
                    render: (record, flag, index) => {
                      return (
                        <div className={errors.ports && errors.ports[index] && errors.ports[index].protocol ? 'is-error' : ''}>
                          <Bubble content={errors.ports && errors.ports[index] && errors.ports[index].protocol && errors.ports[index].protocol.message}>
                            <Controller
                              as={
                                <Select
                                  boxSizeSync
                                  type="simulate"
                                  appearence="button"
                                  size="m"
                                  options={[
                                    {
                                      text: 'TCP',
                                      value: 'TCP'
                                    },
                                    {
                                      text: 'UDP',
                                      value: 'UDP'
                                    }
                                  ]}
                                />
                              }
                              name={`ports[${index}].protocol`}
                              control={control}
                              defaultValue={record.protocol}
                            />
                          </Bubble>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'port',
                    header: '端口',
                    render: (record, flag, index) => {
                      return (
                        <div className={errors.ports && errors.ports[index] && errors.ports[index].port ? 'is-error' : ''}>
                          <Bubble content={errors.ports && errors.ports[index] && errors.ports[index].port && errors.ports[index].port.message}>
                            <Controller
                              as={
                                <InputNumber
                                  step={1}
                                  min={1}
                                  max={65535}
                                />
                              }
                              name={`ports[${index}].port`}
                              control={control}
                              defaultValue={record.port}
                              rules={{
                                required: t('port不能为空'),
                              }}
                            />
                          </Bubble>
                        </div>
                      );
                    }
                  },
                  {
                    key: 'action',
                    header: t('操作'),
                    render: (record, flag, index) => {
                      if (portsFields.length > 1) {
                        return (
                          <LinkButton
                            onClick={() => {
                                portsRemove(index);
                              }}
                            >
                            <Trans>删除</Trans>
                          </LinkButton>
                        );
                      }
                    }
                  }
                ]}
              />
              <Button
                style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                type="weak"
                htmlType="button"
                onClick={() => {
                  portsAppend({ protocol: 'TCP', port: null });
                }}
              >
                新增一项
              </Button>
            </Card.Body>
          </Card>
        </Form.Item>
      </Form>
      {
        isFormBottomButtonShow && (
          <Form.Action style={{ textAlign: 'center' }}>
            <Button htmlType="submit" type="primary"><Trans>保存</Trans></Button>
            <Button htmlType="button" onClick={() => createToggle()}><Trans>取消</Trans></Button>
          </Form.Action>
        )
      }
    </form>
  );
};

// export default PolarisEditor;
const PolarisEditorWithMethodProvide = forwardRef(PolarisEditor);
export default PolarisEditorWithMethodProvide;
