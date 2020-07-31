/**
 * 服务器组详情 - 事件
 */
import React from 'react';
import { Bubble, Button, Card, Form, Justify, Select, Switch, Table, Text } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { getEventListByRule } from '../../../services/api';
import { BackendsGroupInfo } from './index';
import { dateFormatter } from '@helper';
import { Clip } from '@src/modules/common';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

// 对象选择
const sourceOptions = [
  { text: '负载均衡', value: 'lbcf' },
  { text: '后端记录', value: 'lbcf_br' },
];

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  name: string;

  context: string; // 业务侧/平台侧

  backendsGroupInfo: BackendsGroupInfo;
}

interface Cluster {
  name: string;

  displayName: string;

  phase: string;
}

interface Options {
  text: string;

  value: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  timingReload: boolean; // 定时刷新列表

  ruleName: string;

  ruleList: Options[];

  events: any[];

  source: string;
}

const convert = event => {
  let {
    metadata: { name, namespace, uid, creationTimestamp },
    involvedObject: { kind },
    reason,
    message,
    firstTimestamp,
    lastTimestamp,
    count,
    type,
  } = event;

  let data = {
    name, // 事件名称，例如tfan-rule.1623a7a45afdd9e5
    namespace,
    uid,
    creationTimestamp,
    kind,
    reason,
    message,
    firstTimestamp,
    lastTimestamp,
    count,
    type,
  };
  return data;
};

class EventsPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,

    source: '',
    ruleName: '',
    ruleList: [],
    timingReload: false,
    events: [],
  };

  componentDidMount() {
    // this.loadData();
  }

  // componentWillReceiveProps(nextProps, nextContext) {
  //   const { clusterName, namespace, name } = this.state;
  //
  //   if (!isEqual(nextProps.clusterName, clusterName) || !isEqual(nextProps.namespace, namespace) || !isEqual(nextProps.name, name)) {
  //     this.setState({ clusterName: nextProps.clusterName, namespace: nextProps.namespace, name: nextProps.name }, () => {
  //       if (nextProps.clusterName && nextProps.namespace && nextProps.name) {
  //         this.loadData();
  //       }
  //     });
  //   }
  // }

  /**
   * 切换"对象选择"
   * @param source
   */
  handleSourceChanged = async source => {
    let { backendsGroupInfo } = this.state;
    let options;
    if (source === 'lbcf') {
      // 要处理loadBalancers不存在的情况
      options = (backendsGroupInfo['spec']['loadBalancers'] || []).map(item => ({ text: item, value: item }));
    }
    this.setState({ source, ruleList: options });
  };

  getList = async (clusterName, namespace, ruleName) => {
    let events = await getEventListByRule(clusterName, namespace, ruleName);
    this.setState({ events });
  };

  /**
   * 增加一个刷新图标按钮用来刷新列表数据
   */
  reloadList = () => {
    let { clusterName, namespace, ruleName } = this.state;
    if (clusterName && namespace && ruleName) {
      this.getList(clusterName, namespace, ruleName);
    }
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleRuleChanged = ruleName => {
    let { clusterName, namespace } = this.state;
    this.setState({ ruleName }, () => {
      this.getList(clusterName, namespace, ruleName);
    });
  };

  handleReloadSwitch = value => {};

  render = () => {
    let { source, ruleName, ruleList, timingReload, events } = this.state;
    let eventList = events.map(item => convert(item));

    /** 处理时间 */
    const reduceTime = (time: string) => {
      let [first, second] = dateFormatter(new Date(time), 'YYYY-MM-DD HH:mm:ss').split(' ');

      return (
        <React.Fragment>
          <Text>{`${first} ${second}`}</Text>
        </React.Fragment>
      );
    };

    const columns = [
      {
        key: 'firstTimestamp',
        header: '首次出现时间',
        render: record => reduceTime(record.firstTimestamp),
      },
      {
        key: 'lastTimestamp',
        header: '最后出现时间',
        render: record => reduceTime(record.lastTimestamp),
      },
      {
        key: 'type',
        header: '级别',
        render: record => <Text theme={record.type === 'Warning' ? 'warning' : 'text'}>{record.type}</Text>,
      },
      {
        key: 'kind',
        header: '资源类型',
      },
      {
        key: 'name',
        header: '资源名称',
        render: record => (
          <div>
            <span id={'eventName' + record.uid} title={record.name} className="text-overflow m-width">
              {record.name}
            </span>
            <Clip target={'#eventName' + record.uid} />
          </div>
        ),
      },
      {
        key: 'reason',
        header: '内容',
        render: record => (
          <Text theme="text" tooltip={record.message}>
            {record.reason}
          </Text>
        ),
      },
      {
        key: 'count',
        header: '出现次数',
      },
    ];

    return (
      <div>
        <Table.ActionPanel>
          <Justify
            left={
              <Form layout="inline">
                <Form.Item label="对象选择">
                  <Select
                    boxSizeSync
                    size="m"
                    type="simulate"
                    appearence="button"
                    options={sourceOptions}
                    value={source}
                    onChange={value => this.handleSourceChanged(value)}
                  />
                </Form.Item>
                <Form.Item>
                  <Select
                    searchable
                    boxSizeSync
                    size="m"
                    type="simulate"
                    appearence="button"
                    options={ruleList}
                    value={ruleName}
                    onChange={value => this.handleRuleChanged(value)}
                  />
                </Form.Item>
                <Form.Item>
                  <Button icon="refresh" onClick={this.reloadList} />
                </Form.Item>
              </Form>
            }
          />
        </Table.ActionPanel>
        <Table
          verticalTop
          records={eventList}
          recordKey="uid"
          columns={columns}
          addons={[
            autotip({
              emptyText: '暂无数据',
            }),
          ]}
        />
      </div>
    );
  };
}

export { EventsPanel };
