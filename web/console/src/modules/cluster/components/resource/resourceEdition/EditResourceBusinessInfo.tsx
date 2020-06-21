import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { bindActionCreators, insertCSS, uuid } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Switch, Form, Select, SelectMultiple, Button, Bubble, Input } from '@tencent/tea-component';

import {
  fetchDepartmentList,
  fetchBsiPath1List,
  fetchBsiPath2List,
  fetchBsiPath3List,
  fetchUserList,
  getLoginUserInfo,
} from '../../../WebAPI/CMDBPartAPI';
const { useState, useEffect, useRef, useImperativeHandle } = React;

insertCSS(
  'CMDBInfoComponentCss',
  `
    .CMDB-creat-section .tea-form .tea-form__controls--text{
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
export const EditResourceBusinessInfo = (props, ref) => {
  const { register, watch, handleSubmit, reset, control, setValue, getValues, triggerValidation, errors } = useForm({
    mode: 'onBlur',
  });
  const [departmentList, setDepartmentList] = useState([]);
  const [bsiPath1List, setBsiPath1List] = useState([]);
  const [bsiPath2List, setBsiPath2List] = useState([]);
  const [bsiPath3List, setBsiPath3List] = useState([]);
  const [useList, setUserList] = useState([]);
  const [loginUserInfo, setLoginUserInfo] = useState(null);
  const [didMounted, setDidMounted] = useState(false);

  const { cmdb, department: selectedDepartment, bsiPath1: selectedBsiPath1, bsiPath2: selectedBsiPath2 } = watch();

  useEffect(() => {
    // 初次请求 部门&业务列表 等数据
    async function fetchData() {
      const departmentListData = await fetchDepartmentList();
      setDepartmentList(departmentListData);
      if (departmentListData.length) {
        const bsiPath1ListData = await fetchBsiPath1List({ dept_name: departmentListData[0].value });
        setBsiPath1List(bsiPath1ListData);
        if (bsiPath1ListData.length) {
          const bsiPath2ListData = await fetchBsiPath2List({ bs1_name_id: bsiPath1ListData[0].value });
          setBsiPath2List(bsiPath2ListData);
          if (bsiPath2ListData.length) {
            const bsiPath3ListData = await fetchBsiPath3List({ bs2_name_id: bsiPath2ListData[0].value });
            setBsiPath3List(bsiPath3ListData);
          }
        }
      }
    }
    fetchData();

    fetchUserList().then((result) => {
      setUserList(result);
    });
    getLoginUserInfo().then((result) => {
      setLoginUserInfo(result);
    });
  }, []);

  /**
   * CMDB模块是展示状态，每当各个列表数据变更，默认初始化为列表数据第一条数据
   */
  useEffect(() => {
    if (cmdb) {
      const length = departmentList.length;
      if (length) {
        setValue('department', departmentList[0].value);
      } else {
        setValue('department', undefined);
      }
      triggerValidation('department');
    }
  }, [departmentList, cmdb]);

  useEffect(() => {
    if (cmdb) {
      const length = bsiPath1List.length;
      if (length) {
        setValue('bsiPath1', bsiPath1List[0].value);
      } else {
        setValue('bsiPath1', undefined);
      }
      triggerValidation('bsiPath1');
    }
  }, [bsiPath1List, cmdb]);

  useEffect(() => {
    if (cmdb) {
      const length = bsiPath2List.length;
      if (length) {
        setValue('bsiPath2', bsiPath2List[0].value);
      } else {
        setValue('bsiPath2', undefined);
      }
      triggerValidation('bsiPath2');
    }
  }, [bsiPath2List, cmdb]);

  useEffect(() => {
    if (cmdb) {
      const length = bsiPath3List.length;
      if (length) {
        setValue('bsiPath3', bsiPath3List[0].value);
      } else {
        setValue('bsiPath3', undefined);
      }
      triggerValidation('bsiPath3');
    }
  }, [bsiPath3List, cmdb]);

  useEffect(() => {
    if (loginUserInfo && cmdb) {
      setValue('operator', loginUserInfo.name);
    }
  }, [loginUserInfo, cmdb]);

  /**
   * CMDB模块是展示状态，列表数据请求完，必要的默认值填充后，算是didMount阶段执行完了，设置下标识
   * selectedBsiPath1 && selectedBsiPath2 && selectedBsiPath3这三个值可能为空，所以没放在条件中
   */
  useEffect(() => {
    if (cmdb && !didMounted && selectedDepartment) {
      setDidMounted(true);
    }
  }, [cmdb, didMounted, selectedDepartment]);

  /**
   * 以下都为didUpdate的执行逻辑
   */
  useEffect(() => {
    if (selectedDepartment && didMounted) {
      fetchBsiPath1List({ dept_name: selectedDepartment }).then((result) => {
        setBsiPath1List(result);
      });
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedBsiPath1 && didMounted) {
      fetchBsiPath2List({ bs1_name_id: selectedBsiPath1 }).then((result) => {
        setBsiPath2List(result);
      });
    }
  }, [selectedBsiPath1]);

  useEffect(() => {
    if (selectedBsiPath2 && didMounted) {
      fetchBsiPath3List({ bs2_name_id: selectedBsiPath2 }).then((result) => {
        setBsiPath3List(result);
      });
    }
  }, [selectedBsiPath2]);

  useImperativeHandle(ref, () => ({
    // 在使用 ref 时自定义暴露给父组件的实例值
    getCMDBData: () => {
      const CMDBData = getValues({ nest: true });
      const { bsiPath1, bsiPath2, bsiPath3, department } = CMDBData;
      let bsiPath1Name: string = '';
      let bsiPath2Name: string = '';
      let bsiPath3Name: string = '';
      let departmentId: number = null;
      departmentList.forEach((item) => {
        if (item.value === department) {
          departmentId = item.Id;
        }
      });
      bsiPath1List.forEach((item) => {
        if (item.value === bsiPath1) {
          bsiPath1Name = item.text;
        }
      });
      bsiPath2List.forEach((item) => {
        if (item.value === bsiPath2) {
          bsiPath2Name = item.text;
        }
      });
      bsiPath3List.forEach((item) => {
        if (item.value === bsiPath3) {
          bsiPath3Name = item.text;
        }
      });
      const bsiPath = bsiPath1Name + ' - ' + bsiPath2Name + ' - ' + bsiPath3Name;
      return { ...CMDBData, bsiPath, departmentId };
    },
    triggerValidation,
  }));

  return (
    <section className="CMDB-creat-section">
      <Controller
        as={
          <Switch>
            <Trans>CMDB录入</Trans>
          </Switch>
        }
        name="cmdb"
        control={control}
        className="CMDB-modify-control"
      />
      {cmdb && (
        <form className="CMDB-modify-content">
          <Form>
            <Form.Item
              label={t('部门')}
              required
              showStatusIcon={false}
              status={errors.department ? 'error' : 'success'}
              message={errors.department && errors.department.message}
            >
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
                rules={{ required: t('请选择部门') }}
              />
            </Form.Item>

            <Form.Item
              label="业务"
              required
              showStatusIcon={false}
              status={errors.bsiPath1 || errors.bsiPath2 || errors.bsiPath3 ? 'error' : 'success'}
              message={
                (errors.bsiPath1 && errors.bsiPath1.message) ||
                (errors.bsiPath2 && errors.bsiPath2.message) ||
                (errors.bsiPath3 && errors.bsiPath3.message)
              }
            >
              <Controller
                as={
                  <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath1List} />
                }
                name="bsiPath1"
                control={control}
                rules={{ required: t('请选择一级业务') }}
              />

              <Controller
                as={
                  <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath2List} />
                }
                name="bsiPath2"
                control={control}
                className="bsi-path"
                rules={{ required: t('请选择二级业务') }}
              />

              <Controller
                as={
                  <Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={bsiPath3List} />
                }
                name="bsiPath3"
                control={control}
                className="bsi-path"
                rules={{ required: t('请选择三级业务') }}
              />
            </Form.Item>
            <Form.Item
              label="负责人"
              required
              showStatusIcon={false}
              status={errors.operator ? 'error' : 'success'}
              message={errors.operator && errors.operator.message}
            >
              <Controller
                as={<Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={useList} />}
                name="operator"
                control={control}
                rules={{ required: '请选择负责人' }}
              />
            </Form.Item>
            <Form.Item label="备份负责人">
              <Controller
                as={<SelectMultiple staging={false} searchable size="m" appearence="button" options={useList} />}
                name="bakOperator"
                control={control}
              />
            </Form.Item>
          </Form>
        </form>
      )}
    </section>
  );
};
