/**
 * 业务侧&平台侧，namespace 及 workload 的创建及修改的 CMDB 部分，
 */
import React, { useState, useEffect, useMemo, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { bindActionCreators, insertCSS, uuid } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Switch, Form, Select } from '@tencent/tea-component';
import { isEmpty } from '@src/modules/common/utils';
import {
  fetchBsiPath3List,
} from '../../../../WebAPI/CMDBPartAPI';
export interface InitialData {
  department: string;
  business1: string;
  business2: string;
  business2Id: string;
  selectedModuleId?: number;
}
export interface SharedClusterCmdbData {
  moduleName: string;
  moduleId: string;
}
export const SharedClusterCmdbInfo = (
    props: {
      defaultBusinessInfo?: any;
      business2Id?: string;
      isModify?: boolean;
      initialData: InitialData;
    },
    ref
) => {
  const { isModify, defaultBusinessInfo, initialData } = props;
  const {
    department,
    business1,
    business2,
    business2Id,
    selectedModuleId
  } = initialData;

  const { register, watch, handleSubmit, reset, control, setValue, getValues, triggerValidation, errors } = useForm({
    mode: 'onBlur',
    defaultValues: {
      bsiPath3: selectedModuleId
    }
  });
  const [bsiPath3List, setBsiPath3List] = useState([]);

  useEffect(() => {
    if (business2Id) {
      fetchBsiPath3List({ bs2_name_id: business2Id ? Number(business2Id) : undefined }).then(result => {
        setBsiPath3List(result);
      });
    }
  }, [business2Id]);

  /**
   * 对父组件暴露接口
   */
  useImperativeHandle(ref, () => ({
    // 在使用 ref 时自定义暴露给父组件的实例值
    getSharedClusterCmdbData: () => {
      const CMDBData = getValues({ nest: true });
      const { bsiPath3 } = CMDBData;
      let bsiPath3Name: string = '';
      bsiPath3List.forEach(item => {
        if (item.value === bsiPath3) {
          bsiPath3Name = item.text;
        }
      });
      return {
        moduleName: bsiPath3Name,
        moduleId: bsiPath3
      };
    },
    triggerValidation
  }));

  const style = { marginTop: '6px' };
  return (
    <section className="CMDB-creat-section">
      <Form>
        <Form.Item label={t('部门')}>
          <Form.Text style={style}>{department}</Form.Text>
        </Form.Item>
        <Form.Item label={t('一级业务')}>
          <Form.Text style={style}>{business1}</Form.Text>
        </Form.Item>
        <Form.Item label={t('二级业务')}>
          <Form.Text style={style}>{business2}</Form.Text>
        </Form.Item>
        <Form.Item label={t('业务模块')}>
          <Controller
            as={
              <Select
                searchable
                boxSizeSync
                size="m"
                type="simulate"
                appearence="button"
                options={bsiPath3List}
              />
            }
            name="bsiPath3"
            control={control}
          />
        </Form.Item>
      </Form>
    </section>
  );
};
