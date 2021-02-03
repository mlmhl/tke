import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Card, Table, Bubble, Button, Input, Select, InputNumber, Text } from '@tea/component';
import { Controller, useFieldArray } from 'react-hook-form';
import { LinkButton, usePrevious } from '@src/modules/common';
import { isEmpty } from '@src/modules/common/utils';
import { insertCSS, uuid } from '@tencent/ff-redux/libs/qcloud-lib';
import Event from './event';
import { arrDiff } from './diff';

/**
 * 组件样式
 */
insertCSS(
    'table-form-item-css',
    `
      .table-form-item { table-layout: fixed; width: 100%; }
      .table-form-item .table-form-head { border-bottom: 1px solid #ddd; color: #888; }
      .table-form-item .table-form-head th { padding: 10px; }
      .table-form-item .table-form-body td { vertical-align: top; padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
      .table-form-item td .tea-input { max-width: 100%; }
    `
);

interface TableFormItem {
  name: string;
  control: any; // 外部传入的固定属性
  columns: any[]; // 每一列的信息
  errors?: any; // 错误信息
  value?: any; // 值，需要值联动或行元素个数联动的时候需要这个值，联动之外的情况不需要
  initialValue?: any; // 初始值
  setValue?: any; // 外部传入的固定属性
  recordKey?: string; // 可选项，不会影响功能，会影响性能
  minSize?: number; // 最小行数
  hideHeader?: boolean; // 头信息是否隐藏标示
}
interface Column {
  key: string;
  header: string;
  type: any; // table item 类型
  rules: any;
  defaultValue?: any;
  width?: string;
  size?: any; // 可以结合tea组件库再明确
  step?: number;
  min?: number;
  max?: number;
  options?: any[]; // 可以再完善
  showMap?: any;
  valueLinkages?: any;
  placeholder?: string;
  [props: string]: any;
}

export const TableItemType = {
  input: 'input',
  select: 'select',
  inputNumber: 'inputNumber'
};
// export const TableItemType = {
//   input: 'input',
//   select: Select,
//   inputNumber: InputNumber
// };

interface GetRowValueParamItem {
  changedKey: string;
  changedValue: string;
}

/**
 * 组件应该具备的能力：
 * 数据的管理能力，数据的校验能力（这个能力一期需要基于RHF） --》功能开发还是要基于RHF，所以可以使用useFieldArray管理数据
 *
 */
export const TableFormItem = React.memo((props: TableFormItem) => {
  const {
    name,
    initialValue,
    value: tableValues = {},
    control,
    setValue,
    recordKey,
    minSize = 0,
    hideHeader = false,
    columns = [],
    errors = {}
  } = props;
  const { fields, append, remove } = useFieldArray({
    control,
    name,
    // keyName: recordKey || 'id'
  });
  console.log('TableFormItemTest fields is:', tableValues, fields);

  /**
   * 提取必要的映射关系
   */
  const operationStyle = useMemo(() => ({
    height: '30px'
  }), []);
  const [columnsObj, setColumnsObj] = useState({});
  const [showMapObj, setShowMapObj] = useState({});
  const [defaultValues, setDefaultValues] = useState({});
  const [valueLinkagesMap, setValueLinkagesMap] = useState({});
  useEffect(() => {
    const _defaultValues = {}; // 默认值
    const _columnsObj = {};
    const _showMapObj = {}; // row中item有无的联动
    const _valueLinkagesMap = {}; // row中值的联动
    columns.forEach((column: Column) => {
      const {
        key,
        showMap,
        valueLinkages,
        defaultValue = undefined,
      } = column;
      _defaultValues[key] = defaultValue;
      _columnsObj[key] = column;
      if (showMap) {
        _showMapObj[key] = showMap;
      }
      if (valueLinkages) {
        _valueLinkagesMap[key] = valueLinkages;
      }
      setDefaultValues(_defaultValues);
      setColumnsObj(_columnsObj);
      setShowMapObj(_showMapObj);
      setValueLinkagesMap(_valueLinkagesMap);
    });
  }, []);

  /** 根据上边映射关系，获取某行中展示项的映射 */
  const getRowValue = useCallback((params: GetRowValueParamItem[]) => {
    const { changedKey, changedValue } = params[0];
    let appendValue = {};
    // 一个过滤条件好说，多个的话要求交集
    // const keys = Object.keys(showMapObj);
    // const key = keys[0];
    // const value = changedValue || columnsObj[changedKey].defaultValue;
    const showItems = showMapObj[changedKey][changedValue]; // 这里可能有问题，下边append执行后这里可能会出现metadata数据延迟？
    appendValue[changedKey] = changedValue;
    showItems.forEach(showItemKey => {
      appendValue[showItemKey] = columnsObj[showItemKey].defaultValue;
    });
    return appendValue;
  }, [showMapObj, columnsObj]);

  /** 组织_columns对象 */
  const _columns = columns.map((column: Column) => {
    const {
      key,
      header,
      type,
      rules,
      size,
      options,
      showMap,
      valueLinkages,
      step,
      min,
      max,
      defaultValue = undefined,
      placeholder = ''
    } = column;

    let _render;
    switch (type) {
      case TableItemType.select:
        _render = (
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
            size={size}
            options={options}
          />
        );
        break;
      case TableItemType.inputNumber:
        _render = (
            { onChange, onBlur, value, name, ref },
            { invalid, isTouched, isDirty }
        ) => (
          <InputNumber
            // onBlur={onBlur}
            onChange={onChange}
            value={value}
            step={step}
            min={min}
            max={max}
          />
        );
        break;
      default:
        _render = (
            { onChange, onBlur, value, name, ref },
            { invalid, isTouched, isDirty }
        ) => (
          <Input
            onBlur={onBlur}
            onChange={onChange}
            value={value}
          />
        );
    }
    const tableColumn =  {
      key,
      header,
      render: (record, value, index) => {
        return (
          <div className={errors[name] && errors[name][index] && errors[name][index][key] ? 'is-error' : ''}>
            <Controller
              render={_render}
              name={`${name}[${index}].${key}`}
              control={control}
              rules={rules || {}}
              defaultValue={defaultValue} // record[key] || value || defaultValue
              placeholder={placeholder}
            />
            <Text theme="danger" parent="div" reset>{errors[name] && errors[name][index] && errors[name][index][key] && errors[name][index][key].message}</Text>
          </div>
        );
      }
    };
    return tableColumn;
  });

  _columns.push({
    key: 'action',
    header: t('操作'),
    render: (record, flag, index) => {
      if (!minSize || fields.length > minSize) {
        return (
          <Button
            type="link"
            style={operationStyle}
            onClick={() => {
              remove(index);
            }}
          >
            <Trans>删除</Trans>
          </Button>
        );
      }
    }
  });

  /** table form值变更 或者 值联动映射变更时进行相关逻辑处理*/
  const preMetadata = usePrevious(tableValues);
  console.log('valueLinkagesMap is:', valueLinkagesMap, defaultValues, showMapObj, _columns);
  useEffect(() => {
    const valueLinkagesMapKeys = Object.keys(valueLinkagesMap);
    if (tableValues && tableValues.length && valueLinkagesMapKeys.length) {

      // 第一阶段只处理一个值的变更联动
      const key = valueLinkagesMapKeys[0];
      if ((preMetadata || []).length !== (tableValues || []).length) {
        Event.clean();
        tableValues.forEach((item, index) => {
          // 如果没有订阅则订阅，如果订阅了则检查值然后触发订阅。每次都重新绑定，保留上次的值，如果变动了触发订阅
          // length 发生变化不需要diff, 对象数组发生变化才需要diff
          Event.listen(`${name}[${index}].${key}`, params => {
            const { changedValue, defaultValues } = params;
            // const { key, value, port } = defaultValues;
            const linkagesMap = valueLinkagesMap[key][changedValue];
            if (linkagesMap) {
              const linkageKeys = Object.keys(linkagesMap);

              // 第一阶段只处理联动一个值
              const linkageKey = linkageKeys[0];
              setValue(`${name}[${index}].${linkageKey}`, linkagesMap[linkageKey]);
            }
          });
        });
      }
      const diffArr = arrDiff(tableValues, preMetadata || [], [key]);
      diffArr.forEach((diffItem, index) => {
        const changedValue = diffItem[key];
        if (changedValue) {
          Event.trigger(`${name}[${index}].${key}`, {
            changedValue,
            // defaultValues: {
            //   protocol: 'TCP',
            //   key: '',
            //   value: '',
            //   port: null
            // }
          });
        }
      });
    }
  }, [JSON.stringify(tableValues), valueLinkagesMap]);

  /**
   * 根据initial初始化数据
   */
  useEffect(() => {
    // 如果传了不为空的initialValue，走下边逻辑，否则取form初始化的值
    if (initialValue) {
      if (!isEmpty(initialValue)) {
        append(initialValue);
      } else {
        // 删除全部
        remove();
      }
    }
  }, [initialValue]);

  return (
    <Card bordered>
      <Card.Body>
        <table className="table-form-item">
          {
              (!Object.keys(showMapObj).length || hideHeader) && (
              <thead className="table-form-head">
                <tr>
                  {_columns.map((column, index) => {
                      return (
                        <th key={index}>{column.header}</th>
                      );
                    })
                    }
                </tr>
              </thead>
              )
            }
          <tbody className="table-form-body">
            {/*    {*/}
            {/*      // 正常展示*/}
            {/*      fields.map((field, fIndex) => {*/}
            {/*        return (*/}
            {/*          <tr key={field.recordKey || field.id}>*/}
            {/*            {*/}
            {/*              _columns.map((column, cIndex) => {*/}
            {/*                return (*/}
            {/*                  <td key={cIndex}>*/}
            {/*                    {*/}
            {/*                      column.render(field, '', fIndex)*/}
            {/*                    }*/}
            {/*                  </td>*/}
            {/*                );*/}
            {/*              })*/}
            {/*            }*/}
            {/*          </tr>*/}
            {/*        );*/}
            {/*      })*/}

            {/*      // 行元素可控*/}
            {/*      fields.map((field, fIndex) => {*/}
            {/*        const tableItemValue = tableValues && tableValues[fIndex] ? tableValues[fIndex] : field; // 这句话有问题*/}
            {/*        const showMapKeys = Object.keys(showMapObj);*/}
            {/*        const showItems = getRowValue({ value1: tableItemValue[showMapKeys[0]] });*/}
            {/*        // const fieldKeys = Object.keys(field);*/}
            {/*        const showColumns = [];*/}
            {/*        _columns.forEach((column, cIndex) => {*/}
            {/*          const columnKey = column.key;*/}
            {/*          if (Object.keys(showItems).indexOf(columnKey) !== -1 || columnKey === 'action') {*/}
            {/*            const width = columnKey === 'action' ? '' : _columnsObj[columnKey].width;*/}
            {/*            const showWdith = width ? { width } : {};*/}

            {/*            let value = '';*/}

            {/*            showColumns.push((*/}
            {/*              <td key={cIndex} style={showWdith}>*/}
            {/*                {*/}
            {/*                  column.render(field, value, fIndex)*/}
            {/*                }*/}
            {/*              </td>*/}
            {/*            ));*/}
            {/*          }*/}
            {/*        });*/}
            {/*        return (*/}
            {/*          <tr key={field.recordKey || field.id}>*/}
            {/*            {*/}
            {/*              showColumns*/}
            {/*            }*/}
            {/*          </tr>*/}
            {/*        );*/}
            {/*      })*/}
            {
              fields.map((field, fIndex) => {
                const tableItemValue = tableValues && tableValues[fIndex] ? tableValues[fIndex] : field; // 这句话有问题
                const showMapKeys = Object.keys(showMapObj);
                let showItems = defaultValues;
                if (showMapKeys.length) {
                  const changedKey = showMapKeys[0];
                  showItems = getRowValue([{ changedKey, changedValue: tableItemValue[changedKey] }]);
                }
                const showColumns = [];
                _columns.forEach((column, cIndex) => {
                  const columnKey = column.key;
                  if (Object.keys(showItems).indexOf(columnKey) !== -1 || columnKey === 'action') {
                    const width = columnKey === 'action' ? '' : columnsObj[columnKey].width;
                    const showWidth = width ? { width } : {};

                    let value = '';

                    showColumns.push((
                      <td key={cIndex} style={showWidth}>
                        {
                            column.render(field, value, fIndex)
                          }
                      </td>
                    ));
                  }
                });
                return (
                  <tr key={field.recordKey || field.id}>
                    {
                        showColumns
                      }
                  </tr>
                );
              })
            }
          </tbody>
        </table>
        {/*<Table*/}
        {/*  compact*/}
        {/*  verticalTop*/}
        {/*  records={fields}*/}
        {/*  recordKey={recordKey || 'id'}*/}
        {/*  columns={_columns}*/}
        {/*  hideHeader={hideHeader}*/}
        {/*/>*/}
        <Button
          style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
          type="weak"
          htmlType="button"
          onClick={() => {
              /** showMap逻辑 */
              const showMapKeys = Object.keys(showMapObj);
              let appendValue = defaultValues;
              if (showMapKeys.length) {
                const changedKey = showMapKeys[0];
                appendValue = getRowValue([{ changedKey, changedValue: columnsObj[changedKey].defaultValue }]);
              }
              append(appendValue);
            }}
          >
          新增一项
        </Button>
      </Card.Body>
    </Card>
  );
});
