/**
 * 业务侧&平台侧，namespace 及 workload 的创建及修改的 CMDB 部分，
 */
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { bindActionCreators, insertCSS, uuid } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Switch, Form, Select, SelectMultiple, Input } from '@tencent/tea-component';

import {
  fetchDepartmentList,
  fetchBsiPath1List,
  fetchBsiPath2List,
  fetchBsiPath3List,
  fetchUserList,
  getLoginUserInfo
} from '../../../../WebAPI/CMDBPartAPI';
const { useState, useEffect, useRef, useImperativeHandle } = React;

insertCSS(
  'CMDBInfoComponentCss',
  `
    .CMDB-creat-section .tea-form .tea-form__controls--text {
      padding-top: 0;
    }
    .CMDB-creat-section .bsi-path {
      margin-left: 5px;
    }
    .CMDB-creat-section .CMDB-modify-content {
      margin-top: 10px;
    }
  `
);
declare const WEBPACK_CONFIG_SHARED_CLUSTER: boolean;
export interface DefaultBusinessInfo {
  cmdb?: boolean;
  department?: string;
  bsiPath1?: number;
  bsiPath2?: number;
  bsiPath3?: number;
  operator?: string;
  bakOperator?: string[];
  bsiPath?: string;
  bsiPathIds?: string;
  all?: boolean;
}

export const CmdbInfo = (
  props: { defaultBusinessInfo?: any; hasPod?: boolean; isModify?: boolean; disabled?: boolean; },
  ref
) => {
  const { register, watch, handleSubmit, reset, control, setValue, getValues, triggerValidation, errors } = useForm({
    mode: 'onBlur',
    defaultValues: {

    }
  });

  const [departmentList, setDepartmentList] = useState([]);
  const [bsiPath1List, setBsiPath1List] = useState([]);
  const [bsiPath2List, setBsiPath2List] = useState([]);
  const [bsiPath3List, setBsiPath3List] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loginUserInfo, setLoginUserInfo] = useState(null);

  /**
   * 如果有默认值，用默认值进行初始化
   */
  const { defaultBusinessInfo, hasPod, isModify, disabled = false } = props;
  useEffect(() => {
    if (defaultBusinessInfo) {
      reset(defaultBusinessInfo);
    }
  }, [reset, defaultBusinessInfo]);

  /**
   * 获取组件form.item需要的下拉list初始数据
   */
  useEffect(() => {
    // 初次请求 部门&业务列表 等数据
    async function fetchData() {
      const departmentListData = await fetchDepartmentList();
      setDepartmentList(departmentListData);
    }
    fetchData();

    fetchUserList().then(result => {
      setUserList(result);
    });
    getLoginUserInfo().then(result => {
      setLoginUserInfo(result);
    });
  }, []);

  /**
   * 相关数据发生变更时，做进一步处理
   */
  const { cmdb, department: selectedDepartment, bsiPath1: selectedBsiPath1, bsiPath2: selectedBsiPath2 } = watch();
  useEffect(() => {
    if (loginUserInfo && cmdb) {
      setValue('operator', loginUserInfo.name);
    }
  }, [loginUserInfo, cmdb]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchBsiPath1List({ dept_name: selectedDepartment ? String(selectedDepartment) : '' }).then(result => {
        setBsiPath1List(result);
        if (!result.length) {
          setBsiPath2List([]);
          setBsiPath3List([]);
          setValue('bsiPath1', undefined);
          setValue('bsiPath2', undefined);
          setValue('bsiPath3', undefined);
        }
      });
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedBsiPath1) {
      fetchBsiPath2List({ bs1_name_id: selectedBsiPath1 ? Number(selectedBsiPath1) : undefined }).then(result => {
        setBsiPath2List(result);
        if (!result.length) {
          setBsiPath3List([]);
          setValue('bsiPath2', undefined);
          setValue('bsiPath3', undefined);
        }
      });
    }
  }, [selectedBsiPath1]);

  useEffect(() => {
    if (selectedBsiPath2) {
      fetchBsiPath3List({ bs2_name_id: selectedBsiPath2 ? Number(selectedBsiPath2) : undefined }).then(result => {
        setBsiPath3List(result);
      });
    }
  }, [selectedBsiPath2]);

  /**
   * 对父组件暴露接口
   */
  useImperativeHandle(ref, () => ({
    // 在使用 ref 时自定义暴露给父组件的实例值
    getCMDBData: () => {
      const CMDBData = getValues({ nest: true });
      const { bsiPath1, bsiPath2, bsiPath3, department } = CMDBData;
      let bsiPath1Name: string = '';
      let bsiPath2Name: string = '';
      let bsiPath3Name: string = '';
      let departmentId: number = null;
      departmentList.forEach(item => {
        if (item.value === department) {
          departmentId = item.Id;
        }
      });
      bsiPath1List.forEach(item => {
        if (item.value === bsiPath1) {
          bsiPath1Name = item.text;
        }
      });
      bsiPath2List.forEach(item => {
        if (item.value === bsiPath2) {
          bsiPath2Name = item.text;
        }
      });
      bsiPath3List.forEach(item => {
        if (item.value === bsiPath3) {
          bsiPath3Name = item.text;
        }
      });
      const bsiPath = bsiPath1Name ? bsiPath1Name + ' - ' + bsiPath2Name + ' - ' + bsiPath3Name : '';
      const bsiPathIds = bsiPath1 ? bsiPath1 + ' - ' + bsiPath2 + ' - ' + bsiPath3 : '';
      return { ...CMDBData, bsiPath, bsiPathIds, departmentId };
    },
    triggerValidation
  }));

  return (
    <section className="CMDB-creat-section">
      <Controller
        as={
          <Switch defaultValue={Boolean(isModify && defaultBusinessInfo)} value={cmdb && !disabled} disabled={disabled}>
            <Trans>CMDB录入</Trans>
          </Switch>
        }
        name="cmdb"
        control={control}
        className="CMDB-modify-control"
      />
      {cmdb && !disabled && (
        <div className="CMDB-modify-content">
          <Form>
            {
              (!WEBPACK_CONFIG_SHARED_CLUSTER || WEBPACK_CONFIG_IS_PLATFORM) && (
                <>
                  <Form.Item label={t('部门')} showStatusIcon={false}>
                    <Controller
                      as={
                        <Select
                          searchable
                          boxSizeSync
                          size="m"
                          type="simulate"
                          appearence="button"
                          options={departmentList}
                        />
                      }
                      name="department"
                      control={control}
                    />
                  </Form.Item>
                  <Form.Item label="业务" showStatusIcon={false}>
                    <Controller
                      as={
                        <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath1List} />
                      }
                      name="bsiPath1"
                      control={control}
                    />

                    <Controller
                      as={
                        <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath2List} />
                      }
                      name="bsiPath2"
                      control={control}
                      className="bsi-path"
                    />

                    <Controller
                      as={
                        <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath3List} />
                      }
                      name="bsiPath3"
                      control={control}
                      className="bsi-path"
                    />
                  </Form.Item>
                </>
              )
            }

            <Form.Item label="负责人" required showStatusIcon={false}>
              <Controller
                as={<Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={userList} />}
                name="operator"
                control={control}
              />
            </Form.Item>
            <Form.Item label="备份负责人" showStatusIcon={false}>
              <Controller
                as={<SelectMultiple staging={false} searchable size="m" appearence="button" options={userList} />}
                name="bakOperator"
                control={control}
              />
            </Form.Item>
            {hasPod && (!WEBPACK_CONFIG_SHARED_CLUSTER || WEBPACK_CONFIG_IS_PLATFORM) && (
              <Form.Item label="自动同步所有pod">
                <Controller
                  as={<Switch defaultValue={defaultBusinessInfo && defaultBusinessInfo.all ? true : false} />}
                  name="all"
                  control={control}
                />
              </Form.Item>
            )}
          </Form>
        </div>
      )}
    </section>
  );
};
