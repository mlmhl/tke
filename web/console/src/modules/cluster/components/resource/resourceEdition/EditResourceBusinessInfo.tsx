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

  const { cmdb, department: selectedDepartment, bsiPath1: selectedBsiPath1, bsiPath2: selectedBsiPath2 } = watch();

  useEffect(() => {
    // 初次请求 部门&业务列表 等数据
    async function fetchData() {
      const departmentListData = await fetchDepartmentList();
      setDepartmentList(departmentListData);
    }
    fetchData();

    fetchUserList().then((result) => {
      setUserList(result);
    });
    getLoginUserInfo().then((result) => {
      setLoginUserInfo(result);
    });
  }, []);

  useEffect(() => {
    if (loginUserInfo && cmdb) {
      setValue('operator', loginUserInfo.name);
    }
  }, [loginUserInfo, cmdb]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchBsiPath1List({ dept_name: selectedDepartment }).then((result) => {
        console.log('fetchBsiPath1List result: ', result);
        setBsiPath1List(result);
        if (!result.length) {
          setBsiPath2List([]);
          setBsiPath3List([]);
        }
      });
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedBsiPath1) {
      fetchBsiPath2List({ bs1_name_id: selectedBsiPath1 }).then((result) => {
        setBsiPath2List(result);
        if (!result.length) {
          setBsiPath3List([]);
        }
      });
    }
  }, [selectedBsiPath1]);

  useEffect(() => {
    if (selectedBsiPath2) {
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
      const bsiPath = bsiPath1Name ? bsiPath1Name + ' - ' + bsiPath2Name + ' - ' + bsiPath3Name : '';
      return { ...CMDBData, bsiPath, departmentId };
    },
    // triggerValidation,
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
              showStatusIcon={false}
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
              />
            </Form.Item>

            <Form.Item
              label="业务"
              showStatusIcon={false}
            >
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
            <Form.Item
              label="负责人"
              showStatusIcon={false}
            >
              <Controller
                as={<Select searchable boxSizeSync size="m" type="simulate" appearence="button" options={useList} />}
                name="operator"
                control={control}
              />
            </Form.Item>
            <Form.Item
              label="备份负责人"
              showStatusIcon={false}
            >
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
