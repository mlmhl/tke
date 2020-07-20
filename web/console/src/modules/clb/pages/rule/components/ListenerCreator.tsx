/**
 * 新建监听器
 */
import React from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Button, Card, Form, Input, Select, Table } from '@tencent/tea-component';
import { Form as FinalForm } from 'react-final-form';
import setFieldData from 'final-form-set-field-data';

import { ListenerType } from '../RuleEditor';
import { generateNewPort } from '../../../services/api';
import AutoSave from '@src/modules/clb/components/AutoSave';

const { isEqual, isEmpty } = require('lodash');

// function getStatus(meta, validating) {
//   if (meta.active && validating) {
//     return 'validating';
//   }
//   if (!meta.touched) {
//     return null;
//   }
//   return meta.error ? 'error' : 'success';
// }

interface PropTypes {
  // clusterName: string; // 集群名称

  value?: ListenerType; // value 属性，和 onChange 对应的

  onChange?: (value) => void;
}

interface StateTypes {
  data?: ListenerType;
}

/**
 * 网络协议 - 下拉选择框的数据源
 */
const ProtocolList = [
  { text: 'HTTP', value: 'http' },
  { text: 'TCP', value: 'tcp' },
  { text: 'UDP', value: 'udp' },
];

class ListenerCreator extends React.Component<PropTypes, StateTypes> {
  state = {
    data: this.props.value,
  };

  componentWillReceiveProps(nextProps, nextContext) {
    const { data } = this.state;
    const { value } = nextProps;
    console.log('componentWillReceiveProps@ListenerCreator');

    if (!isEqual(data, value)) {
      console.log('rerender@ListenerCreator');
      this.setState({ data: value });
    }
  }
  /**
   * 分配随机端口
   */
  handleGeneratePort = () => {
    //
  };

  handleFieldChanged = fieldName => {
    return value => {
      let { onChange } = this.props;
      console.log('fieldName = ', fieldName, ', value = ', value);
      let { data } = this.state;
      let dataNew = Object.assign(data, { [fieldName]: value });
      console.log('dataNew = ', dataNew);
      this.setState({ data: dataNew }, () => {
        if (onChange) {
          onChange(dataNew);
        }
      });
    };
  };

  render() {
    console.log('render@ListenerCreator');
    let { onChange } = this.props;
    let { data } = this.state;
    let { protocol = '', port = '', host = '', path = '' } = data;

    const save = form => {
      return values => {
        console.log('values@ListenerCreator = ', values);
        console.log('form.getState() = ', form.getState());
        // if (onChange) {
        //   onChange(form.getState());
        // }
      };
    };

    const onFormChange = formState => {
      let { onChange } = this.props;
      let { data } = this.state;
      let { protocol = '', port = '', host = '', path = '' } = data;
      console.log('formState@ListenerCreator = ', formState);
      if (onChange) {
        // onChange({ values: formState.values, valid: formState.valid });
        onChange(formState.values);
      }
    };

    const validate = async ({ clbId, scope }) => {
      if (!clbId) {
        return t('请选择一个实例');
      }
    };

    return (
      <Form>
        <Form.Item label={t('监听器端口')} required status={'success'} message={''}>
          <Select
            value={protocol}
            onChange={this.handleFieldChanged('protocol')}
            type="simulate"
            appearence="button"
            size="m"
            placeholder={t('请选择网络协议')}
            options={ProtocolList}
          />
          <Input value={port} onChange={this.handleFieldChanged('port')} />
          <Button type="weak" onClick={this.handleGeneratePort}>
            分配随机端口
          </Button>
        </Form.Item>
        <Form.Item label={t('主机（host）')} required status={'success'} message={''}>
          <Input value={host} onChange={this.handleFieldChanged('host')} />
        </Form.Item>
        <Form.Item label={t('路径（path）')} required status={'success'} message={''}>
          <Input value={path} onChange={this.handleFieldChanged('path')} />
        </Form.Item>
      </Form>
    );
  }
}

export { ListenerCreator };
