/**
 * 监听器列表
 */
import React from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Button, Card, Form, Input, Select, Table } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { getAvailableListeners } from '../../../services/api';

const { isEqual } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

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

  value?: any; // value 属性，和 onChange 对应的

  onChange?: (value) => void;

  clusterName: string;

  clbId: string;
}

interface StateTypes {
  data?: any;

  listenerList: any[];

  clusterName: string;

  clbId: string;

  selectedListener: string;
}

class ListenerList extends React.Component<PropTypes, StateTypes> {
  state = {
    clusterName: '',
    clbId: '',
    data: this.props.value,
    listenerList: [],
    selectedListener: '',
  };

  componentDidMount(): void {
    this.loadData();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const { data } = this.state;
    const { clusterName, clbId, value } = nextProps;

    if (!isEqual(data, value)) {
      this.setState({ data: value });
    }
    if (clusterName !== this.props.clusterName || clbId !== this.props.clbId) {
      this.setState({ clusterName, clbId }, () => {
        this.loadData();
      });
    }
  }

  loadData = () => {
    this.getListenerList();
  }

  /**
   * 获取现有监听器列表
   */
  getListenerList = async () => {
    let { clusterName, clbId } = this.state;
    let list = await getAvailableListeners(clusterName, clbId);
    this.setState({ listenerList: list });
  };

  handleFieldChange = value => {
    //
  }

  render = () => {
    let { onChange } = this.props;
    let { data, listenerList, selectedListener } = this.state;
    let { protocol = '', port = '', host = '', path = '' } = data;

    const save = form => {
      return values => {
        console.log('values = ', values);
        console.log('form.getState() = ', form.getState());
        // if (onChange) {
        //   onChange(form.getState());
        // }
      };
    };

    const onFormChange = formState => {
      let { onChange } = this.props;
      let { data } = this.state;
      let { clbId, scope } = data;
      console.log('formState = ', formState);
      if (onChange) {
        onChange({ values: formState.values, valid: formState.valid });
      }
    };

    const validate = async ({ clbId, scope }) => {
      if (!clbId) {
        return t('请选择一个实例');
      }
      // if (!/(?!^[._-].*)(?!.*[._-]$)(?!.*[._-]{2,}.*)(?=^[0-9a-z._-]{2,26}$)[0-9a-z._-]+/.test(repo_name)) {
      //   return t('长度2-26个字符，只能包含小写字母、数字及分隔符("."、"_"、"-")，且不能以分隔符开头、结尾或连续');
      // }
      // let response = await WebAPI.fetchRepositoryList(
      //   {},
      //   {
      //     exact_query: `${project_name}/${repo_name}`,
      //   }
      // );
      // if (response.records.length) {
      //   return t('名称重复');
      // }
    };

    return (
      <Card>
        <Table
          verticalTop
          records={listenerList}
          recordKey="ListenerName"
          columns={[
            {
              key: 'ListenerName',
              header: '监听器名称',
              render: ({ ListenerName }) => (
                <p>{ListenerName}</p>
              ),
            },
            {
              key: 'Protocol',
              header: 'Protocol',
            },
            {
              key: 'Port',
              header: 'Port',
            },
            {
              key: 'Domain',
              header: 'Host',
            },
            {
              key: 'Url',
              header: 'Path',
            },
          ]}
          addons={[
            autotip({
              // isLoading: loading,
              // isError: Boolean(error),
              // isFound: Boolean(keyword),
              // onClear: () => setKeyword(""),
              // onRetry: load,
              // foundKeyword: keyword,
              emptyText: '暂无数据',
            }),
            radioable({
              value: selectedListener, // 取的是 recordKey 字段的值
              rowSelect: true,
              onChange: (value, context) => {
                console.log(value, context);
                // setSelected(value);
                onChange(value);
                this.setState({ selectedListener: value });
              },
              // render: (element, { disabled }) => {
              //   return disabled ? <Icon type="loading" /> : element;
              // },
            }),
          ]}
        />
      </Card>
    );
  };
}

export { ListenerList };
