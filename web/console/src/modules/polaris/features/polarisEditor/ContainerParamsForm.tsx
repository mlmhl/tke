import React, { useState, useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Card,
  Bubble,
  Icon,
  Select,
  Text,
  Form,
  Radio,
  List,
} from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { TableFormItem, TableItemType } from '@src/modules/polaris/common/components/tableFormItem/TableFormItem';
import { useNamespaces, useWorkloads } from '@src/modules/polaris/common/hooks';
import { isEmpty } from '@src/modules/common';

interface ContainerFormModal {
  value?: any; // 可以补上类型
  onChange: any;
}
const ContainerParamsForm = React.memo((params: ContainerFormModal) => {
  const {
    value,
    onChange
  } = params;

  const {
    isPlatform,
    clusterId,
    projectId,
    namespaceId,
    clusterSelectOptions,
    projectSelectOptions
  } = value;

  const defaultValues = {
    cluster: clusterId,
    project: projectId,
    namespace: isPlatform ? namespaceId : `${clusterId}-${namespaceId}`,
    podChoice: 'byLabel',
    resourceType: 'deployments',
    resource: '',
    excludePodNames: [],
    includePodNames: [],
    ports: [{ protocol: 'TCP', port: null }],
  };
  const {
    watch,
    control,
    getValues,
    reset,
    errors,
    setValue,
    trigger
  } = useForm<{
    cluster?: string;
    project?: string;
    namespace: string;
    podChoice: string;
    resourceType: string;
    resource: string;
    excludePodNames?: any;
    includePodNames?: any;
    ports: any;
  }>({
    mode: 'onTouched',
    shouldUnregister: false,
    defaultValues
  });

  /** 可以使用hooks库，忽略了首次渲染，只在依赖项更新时运行 */
  useEffect(() => {
    reset(defaultValues);
  }, [JSON.stringify(defaultValues)]);

  const { cluster, project, podChoice, resourceType, namespace, resource } = watch();

  const { namespacesById, namespaceSelectOptions, namespaceGroups } = useNamespaces({
    clusterId: cluster,
    projectId: project
  });

  /**
   * 设置选择namespace的id
   */
  const [selectedNamespaceId, setSelectedNamespaceId] = useState('');
  useEffect(() => {
    if (isPlatform) {
      setSelectedNamespaceId(namespace);
    } else if (!isEmpty(namespacesById)) {
      const { spec = {}} = namespacesById[namespace] || {};
      const { clusterName: clusterId, namespace: namespaceId } = spec;
      setSelectedNamespaceId(namespaceId);
      setValue('cluster', clusterId);
    }
  }, [namespace, namespacesById]);

  /**
   * 选择 Pod后，进行相关数据设置
   */
  const [includePods, setIncludePods] = useState();
  useEffect(() => {
    if (podChoice === 'byLabel') {
      // 删除全部
      setIncludePods([]);
    } else {
      setIncludePods({ name: '' });
    }
  }, [podChoice]);

  /**
   * 处理 容器参数 中按Label 中的selector部分
   */
  const [labels, setLabels] = useState({});

  const workloads = useWorkloads({ type: resourceType, clusterName: cluster, namespace: selectedNamespaceId });
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

  /** 有值变更时调用传过来的onChange */
  const formValues = getValues();
  useEffect(() => {
    console.log('ContainerParamsForm values; ', formValues, errors);
    onChange({ ...formValues, trigger, labels, selectedNamespaceId });
  }, [JSON.stringify(formValues)]);

  return (
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
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Select
                // onBlur={onBlur}
                onChange={onChange}
                value={value}
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={clusterSelectOptions}
                defaultValue={clusterId}
              />
            )}
          name="cluster"
          control={control}
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
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Select
                // onBlur={onBlur}
                onChange={onChange}
                value={value}
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={projectSelectOptions}
                defaultValue={projectId}
              />
            )}
          name="project"
          control={control}
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
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Select
                // onBlur={onBlur}
                onChange={onChange}
                value={value}
                searchable
                boxSizeSync
                type="simulate"
                appearence="button"
                size="l"
                options={namespaceSelectOptions}
                groups={isPlatform ? undefined : namespaceGroups}
                defaultValue={isPlatform ? namespaceId : `${clusterId}-${namespaceId}`}
              />
            )}
          name="namespace"
          control={control}
          rules={{ required: t('无选中命名空间') }}
        />
      </Form.Item>
      <Form.Item
        label={
          <span>
            <span style={{ marginRight: '5px' }}><Trans>选择Pod</Trans></span>
            <Bubble
              content="我们会根据您选择的Workload自动分析出Pod上的标签"
            >
              <Icon type="info" />
            </Bubble>
          </span>
        }
        required
        showStatusIcon={false}
      >
        <Card bordered>
          <Card.Body>
            <Form.Item
              label={t('资源类型')}
              showStatusIcon={false}
              status={errors.resourceType ? 'error' : 'success'}
              message={errors.resourceType && errors.resourceType.message}
            >
              <Controller
                render={(
                    { onChange, onBlur, value, name, ref },
                    { invalid, isTouched, isDirty }
                ) => (
                  <Radio.Group
                    // onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    // defalutValue="deployment"
                  >
                    <Radio name="deployments">Deployment</Radio>
                    <Radio name="statefulsets">Statefulset</Radio>
                    <Radio name="tapps">TAPP</Radio>
                  </Radio.Group>
                )}
                name="resourceType"
                control={control}
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
                render={(
                    { onChange, onBlur, value, name, ref },
                    { invalid, isTouched, isDirty }
                ) => (
                  <Select
                    // onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    searchable
                    boxSizeSync
                    type="simulate"
                    appearence="button"
                    size="l"
                    options={workloadList}
                  />
                )}
                name="resource"
                control={control}
                rules={{ required: t('资源不能为空') }}
              />
            </Form.Item>
            <Form.Item label="Pod标签">
              <Form.Text>
                <List>
                  {Object.keys(labels).map(item => (
                    <List.Item key={item}>{`${item} : ${labels[item]}`}</List.Item>
                  ))}
                </List>
              </Form.Text>
            </Form.Item>
          </Card.Body>
        </Card>
      </Form.Item>
      <Form.Item
        label={
          <span>
            <span style={{ marginRight: '5px' }}><Trans>容器内端口</Trans></span>
            <Bubble
              content="如果在容器网络模式中选择了随机端口映射，则我们会在后台将容器内端口自动转换成母机上的随机端口，最终注册到北极星的是母机IP和端口。如果网络模式未选择随机端口映射或选择了ENI IP，则最终注册的是容器IP和端口"
            >
              <Icon type="info" />
            </Bubble>
          </span>
        }
        required
      >
        <TableFormItem
          name="ports"
          control={control}
          errors={errors}
          minSize={1}
          columns={[{
            key: 'protocol',
            header: '协议',
            type: TableItemType.select,
            defaultValue: 'TCP',
            size: 'm',
            options: [
              {
                text: 'TCP',
                value: 'TCP'
              },
              {
                text: 'UDP',
                value: 'UDP'
              }
            ]
          },
            {
              key: 'port',
              header: '端口',
              type: TableItemType.inputNumber,
              defaultValue: null,
              step: 1,
              min: 1,
              max: 65535,
              rules: {
                required: 'port不能为空',
              }
            }]}
        />
      </Form.Item>
    </Form>
  );
});

export default ContainerParamsForm;
