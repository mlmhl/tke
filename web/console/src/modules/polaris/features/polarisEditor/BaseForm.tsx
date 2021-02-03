import React, { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Form,
  Input,
} from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

interface BaseFormModal {
  value?: any;
  onChange: any;
}
const BaseForm = React.memo((params: BaseFormModal) => {
  const {
    value = {
      ruleName: ''
    },
    onChange
  } = params;

  const defaultValues = value;
  const {
    watch,
    control,
    getValues,
    reset,
    errors,
    setValue,
    trigger
  } = useForm({
    defaultValues: defaultValues,
    mode: 'onTouched',
    shouldUnregister: false
  });

  /** 可以使用hooks库，忽略了首次渲染，只在依赖项更新时运行 */
  useEffect(() => {
    reset(defaultValues);
  }, [JSON.stringify(defaultValues)]);

  const formValues = getValues();
  useEffect(() => {
    console.log('BaseForm values; ', formValues, errors);
    onChange({ ...formValues, trigger });
  }, [JSON.stringify(formValues)]);

  // size 放在外边可以吗？
  return (
    <Form>
      <Form.Item
        required
        label={t('规则名称')}
        showStatusIcon={false}
        status={errors.ruleName ? 'error' : 'success'}
        message={errors.ruleName && errors.ruleName.message}
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
          name="ruleName"
          control={control}
          rules={{
            required: t('规则名称不能为空')
          }}
        />
      </Form.Item>
    </Form>
  );
});

export default BaseForm;
