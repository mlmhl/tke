/**
 * 规则事件
 */
import React from 'react';
import { Bubble, Button, Card, Icon, Form, Justify, Table, Text } from '@tencent/tea-component';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';

import { getEventListByBackends } from '../../../services/api';
import { dateFormatter } from '@helper';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

interface ServerType {
  id: string;

  addr: string; // json string: { ip: '', port: 80 }

  status: string;
}

interface PropTypes {
  clusterName: string; // 集群名称

  namespace: string;

  serverId: string;
}

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  serverId: string;

  events: any[];
}

// const convert = event => {
//   let {
//     metadata: { name, namespace, uid, creationTimestamp },
//     involvedObject: { kind },
//     reason,
//     message,
//     firstTimestamp,
//     lastTimestamp,
//     count,
//     type,
//   } = event;
//
//   let data = {
//     name, // 事件名称，例如tfan-rule.1623a7a45afdd9e5
//     namespace,
//     uid,
//     creationTimestamp,
//     kind,
//     reason,
//     message,
//     firstTimestamp,
//     lastTimestamp,
//     count,
//     type,
//   };
//   return data;
// };

class EventList extends React.Component<PropTypes, StateTypes> {
  state = {
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    serverId: this.props.serverId,
    events: [],
  };

  componentDidMount() {
    this.loadData();
  }

  // componentWillReceiveProps(nextProps, nextContext) {
  //   const { clusterName, namespace, serverId } = this.state;
  //
  //   if (!isEqual(nextProps.clusterName, clusterName) || !isEqual(nextProps.namespace, namespace) || !isEqual(nextProps.serverId, serverId)) {
  //     this.setState({ clusterName: nextProps.clusterName, namespace: nextProps.namespace, serverId: nextProps.serverId }, () => {
  //       if (nextProps.clusterName && nextProps.namespace && nextProps.serverId) {
  //         this.loadData();
  //       }
  //     });
  //   }
  // }

  loadData = () => {
    let { clusterName, namespace, serverId } = this.state;
    this.getList(clusterName, namespace, serverId);
  };

  /**
   * 获取服务器事件列表
   * @param clusterName
   * @param namespace
   * @param name
   */
  getList = async (clusterName, namespace, serverId) => {
    let events = await getEventListByBackends(clusterName, namespace, serverId);
    this.setState({ events });
  };

  /**
   * 增加一个刷新图标按钮用来刷新列表数据
   */
  reloadList = () => {
    let { clusterName, namespace, serverId } = this.state;
    if (clusterName && namespace && serverId) {
      this.setState({ events: [] }, () => {
        this.getList(clusterName, namespace, serverId);
      });
    }
  };

  render = () => {
    let { clusterName, namespace, serverId, events } = this.state;
    // let eventList = events.map(item => convert(item));
    let eventList = events.map(item => item);

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
      // {
      //   key: 'kind',
      //   header: '资源类型',
      // },
      // {
      //   key: 'name',
      //   header: '资源名称',
      // },
      {
        key: 'reason',
        header: '内容',
        render: record => (
          <>
            <Text theme="text">{record.reason}</Text>
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
