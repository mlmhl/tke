/**
 * 规则事件
 */
import React from 'react';
import { Bubble, Button, Card, Icon, Form, Justify, Table, Text } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { Clip } from '@src/modules/common';

import { getEventListByRule } from '../../services/api';
import { dateFormatter } from '@helper';
import { cluster } from '@config/resource/k8sConfig';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  ruleName: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  ruleName: string;

  events: any[];
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

class EventList extends React.Component<PropTypes, StateTypes> {
  state = {
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    ruleName: this.props.ruleName, // 直接把ruleName传进来
    events: [],
  };

  componentDidMount() {
    this.loadData();
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

  loadData = () => {
    let { clusterName, namespace, ruleName } = this.state;
    this.getList(clusterName, namespace, ruleName);
  };

  /**
   * 获取事件列表
   * @param clusterName
   * @param namespace
   * @param ruleName
   */
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

  render = () => {
    let { clusterName, namespace, ruleName, events } = this.state;
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
        // render: record => (
        //   <div>
        //     <span id={'eventName' + record.uid} title={record.name} className="text-overflow m-width">
        //       {record.name}
        //     </span>
        //     <Clip target={'#eventName' + record.uid} />
        //   </div>
        // ),
      },
      {
        key: 'reason',
        header: '内容',
        render: record => (
          <>
            <Text theme="text">
              {record.reason}
            </Text>
            <Bubble content={record.message}>
              <Icon type="info" />
            </Bubble>
          </>
        ),
      },
      {
        key: 'count',
        header: '出现次数',
      },
    ];

    return (
      <Card>
        <Card.Body operation={<Button icon="refresh" onClick={this.reloadList} />}>
          <Table
            verticalTop
            disableTextOverflow={true}
            records={eventList}
            recordKey="uid"
            columns={columns}
            addons={[
              autotip({
                emptyText: '暂无数据',
              }),
            ]}
          />
        </Card.Body>
      </Card>
    );
  };
}

export { EventList };
