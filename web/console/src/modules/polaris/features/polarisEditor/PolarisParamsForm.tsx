import React, { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Select,
  Form,
  Input,
  InputNumber,
  Switch,
  Radio,
  Bubble,
  Icon,
} from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { TableFormItem, TableItemType } from '@src/modules/polaris/common/components/tableFormItem/TableFormItem';

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

interface PolarisFormModal {
  value?: any;
  onChange: any;
}

const PolarisParamsForm = React.memo((params: PolarisFormModal) => {
  const {
    value,
    onChange
  } = params;

  // defaultValues可以根据父传过来的value做一些数据处理
  const defaultValues = {
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
  }>({
    mode: 'onTouched',
    shouldUnregister: false,
    defaultValues
  });

  /** 可以使用hooks库，忽略了首次渲染，只在依赖项更新时运行 */
  useEffect(() => {
    reset(defaultValues);
  }, [JSON.stringify(defaultValues)]);

  const { enableHealthCheck, metadata } = watch();

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

  /** 有值变更时调用传过来的onChange */
  const formValues = getValues();
  useEffect(() => {
    console.log('PolarisParamsFrom values; ', formValues, errors);
    onChange({ ...formValues, trigger });
  }, [JSON.stringify(formValues)]);

  return (
    <Form>
      <Form.Item
        required
        label={t('命名空间')}
        showStatusIcon={false}
        status={_getStatus(errors.polarisNamespace)}
        message={_getMessage(errors.polarisNamespace)}
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
              boxSizeSync
              type="simulate"
              appearence="button"
              size="l"
              options={polarisNamespaceList}
            />
          )}
          name="polarisNamespace"
          control={control}
          rules={{
            required: t('无选中命名空间')
          }}
        />
      </Form.Item>
      <Form.Item
        required
        label={t('服务名')}
        showStatusIcon={false}
        status={_getStatus(errors.serviceName)}
        message={_getMessage(errors.serviceName)}
      >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Input
                onBlur={onBlur}
                onChange={onChange}
                value={value}
                size="l"
              />
          )}
          name="serviceName"
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
        status={_getStatus(errors.token)}
        message={_getMessage(errors.token)}
      >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Input
                onBlur={onBlur}
                onChange={onChange}
                value={value}
                size="l"
              />
            )}
          name="token"
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
        status={_getStatus(errors.weight)}
        message={_getMessage(errors.weight)}
      >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <InputNumber
                // onBlur={onBlur}
                onChange={onChange}
                value={value}
                step={1}
                min={0}
                max={10000}
                // size="s"
              />
            )}
          // as={<InputNumber step={1} min={0} max={10000} />}
          name="weight"
          control={control}
          rules={{
            required: t('权重不能为空'),
          }}
        />
      </Form.Item>
      <Form.Item
        label={t('协议')}
        showStatusIcon={false}
        status={_getStatus(errors.protocol)}
        message={_getMessage(errors.protocol)}
        >
        <Controller
          render={(
              { onChange, onBlur, value, name, ref },
              { invalid, isTouched, isDirty }
          ) => (
            <Input
              onBlur={onBlur}
              onChange={onChange}
              value={value}
              size="l"
            />
          )}
          name="protocol"
          control={control}
        />
      </Form.Item>
      <Form.Item
        label={t('版本')}
        showStatusIcon={false}
        status={_getStatus(errors.version)}
        message={_getMessage(errors.version)}
      >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Input
                onBlur={onBlur}
                onChange={onChange}
                value={value}
                size="l"
              />
            )}
          name="version"
          control={control}
        />
      </Form.Item>
      <Form.Item
        label={t('元数据')}
        showStatusIcon={false}
      >
        <TableFormItem
          name="metadata"
          control={control}
          errors={errors}
          value={metadata}
          columns={[{
              key: 'key',
              header: 'Key',
              type: TableItemType.input,
              defaultValue: '',
              rules: {
                required: t('key不能为空'),
              },
            },
            {
              key: 'value',
              header: 'Value',
              type: TableItemType.input,
              defaultValue: '',
              rules: {
                required: t('value不能为空'),
              }
            }]
          }
        />
      </Form.Item>
      <Form.Item
        required
        label={t('是否隔离')}
        showStatusIcon={false}
        status={_getStatus(errors.isolate)}
        message={_getMessage(errors.isolate)}
        >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Switch
                onBlur={onBlur}
                onChange={onChange}
                value={value}
              />
            )}
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
          render={(
              { onChange, onBlur, value, name, ref },
              { invalid, isTouched, isDirty }
          ) => (
            <Radio.Group
              // onBlur={onBlur}
              onChange={onChange}
              value={value}
            >
              <Radio name="true">健康</Radio>
              <Radio name="false">异常</Radio>
            </Radio.Group>
          )}
          name="healthy"
          control={control}
        />
      </Form.Item>
      <Form.Item
        required
        label={t('健康检查')}
        showStatusIcon={false}
        status={_getStatus(errors.enableHealthCheck)}
        message={_getMessage(errors.enableHealthCheck)}
      >
        <Controller
          render={(
                { onChange, onBlur, value, name, ref },
                { invalid, isTouched, isDirty }
            ) => (
              <Switch
                onBlur={onBlur}
                onChange={onChange}
                value={value}
              />
            )}
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
              status={_getStatus(errors.healthCheckType)}
              message={_getMessage(errors.healthCheckType)}
            >
              <Controller
                render={(
                      { onChange, onBlur, value, name, ref },
                      { invalid, isTouched, isDirty }
                  ) => (
                    <Input
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      size="s"
                      disabled={true}
                      defaultValue={t('上报心跳')}
                    />
                  )}
                name="healthCheckType"
                control={control}
              />
            </Form.Item>
            <Form.Item
              label={t('TTL')}
              showStatusIcon={false}
              status={_getStatus(errors.healthCheckTTL)}
              message={_getMessage(errors.healthCheckTTL)}
            >
              <Controller
                render={(
                      { onChange, onBlur, value, name, ref },
                      { invalid, isTouched, isDirty }
                  ) => (
                    <InputNumber
                      // onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      step={1}
                      min={1}
                      // size="s"
                    />
                  )}
                name="healthCheckTTL"
                control={control}
              />
            </Form.Item>
          </>
          )
        }
    </Form>
  );
});

function _getStatus(value) {
  return value ? 'error' : 'success';
}
function _getMessage(value) {
  return value && value.message;
}

export default PolarisParamsForm;
