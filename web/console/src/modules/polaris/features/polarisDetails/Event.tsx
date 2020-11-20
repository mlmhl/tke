/**
 * 规则事件
 */
import React, { useCallback } from 'react';
import { Bubble, Card, Icon, Table, Text } from '@tencent/tea-component';

import { dateFormatter } from '@helper';
const { autotip } = Table.addons;

interface Event {
  eventList: any[];
}

const Event = React.memo((props: Event) => {
  const { eventList } = props;

  /** 处理时间 */
  const reduceTime = useCallback((time: string) => {
    let [first, second] = dateFormatter(new Date(time), 'YYYY-MM-DD HH:mm:ss').split(' ');

    return (
      <React.Fragment>
        <Text>{`${first} ${second}`}</Text>
      </React.Fragment>
    );
  }, []);

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
      <Card.Body>
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
});

export default Event;
