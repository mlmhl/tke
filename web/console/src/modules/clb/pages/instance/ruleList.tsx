/**
 * CLB实例使用情况
 * 规则列表
 */
import React from 'react';
import { Button, Card, ContentView, Drawer, Form, Justify, Select, Table } from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { getAllClusters, getRulesByCluster } from '../../services/api';
import { RuleDetail } from '../rule/detail';

const { at, findKey, get, has, pick, mapKeys, max, stubString } = require('lodash');
const { Body, Header } = ContentView;

const convert = item => ({ ...item });

interface Project {
  id: string;
  name: string;
}

interface PropTypes {
  projects: Project[];
}

export class RuleList extends React.Component<PropTypes> {
  state = {
    clusterName: '',
    clusters: [],
    ruleList: [],
    detailVisible: false,
    selectedItem: {
      name: '',
      namespace: '',
    },
  };

  componentDidMount() {
    this.getClusterList();
  }

  showDetail = visible => {
    this.setState({ detailVisible: visible });
  };

  getClusterList = async () => {
    let clusters = await getAllClusters();
    this.setState({ clusters });
    // 缓存处理
    let selectedClusterName = window.localStorage.getItem('selectedClusterName');
    if (clusters.map(item => item.name).includes(selectedClusterName)) {
      this.handleClusterChanged(selectedClusterName);
    }
  };

  /**
   * 获取列表页数据并进行数据加工
   * @param clusterName
   */
  getList = async clusterName => {
    let rules = await getRulesByCluster(clusterName);
    let ruleList = rules.map(item => convert(item));
    this.setState({ ruleList });
  };

  /**
   * 切换集群的时候更新规则列表
   * @param clusterName 集群名称
   */
  handleClusterChanged = async clusterName => {
    this.setState({ clusterName }, () => {
      this.getList(clusterName);
      // 缓存选择的集群
      window.localStorage.setItem('selectedClusterName', clusterName);
    });
  };

  handleViewItem = item => {
    return e => {
      let { name } = item;
      this.setState({ selectedItem: item, detailVisible: true });
    };
  };

  render() {
    let { clusterName, clusters, ruleList, detailVisible, selectedItem } = this.state;
    let { projects } = this.props;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));

    return (
      <Card>
        <Card.Body>
          <Table.ActionPanel>
            <Justify
              right={
                <Form layout="inline">
                  <Form.Item align="middle" label="集群">
                    <Select
                      searchable
                      boxSizeSync
                      size="m"
                      type="simulate"
                      appearence="button"
                      options={clusterList}
                      value={clusterName}
                      onChange={value => this.handleClusterChanged(value)}
                    />
                    <Button
                      icon="refresh"
                      onClick={() => {
                        let { clusterName } = this.state;
                        if (clusterName) {
                          this.getList(clusterName);
                        }
                      }}
                    />
                  </Form.Item>
                </Form>
              }
            />
          </Table.ActionPanel>
          <Table
            verticalTop
            disableTextOverflow={true}
            records={ruleList}
            recordKey="name"
            columns={[
              {
                key: 'name',
                header: '规则名称',
                render: rule => (
                  <Button type="link" onClick={this.handleViewItem(rule)}>
                    {rule.name}
                  </Button>
                ),
              },
              {
                key: 'vip',
                header: 'VIP',
              },
              {
                key: 'type',
                header: '网络类型',
                align: 'center',
                render: rule => <p>{rule.type}</p>,
              },
              {
                key: 'port',
                header: '端口',
                width: 100,
                render: rule => (
                  <p>
                    {rule.protocol}:{rule.port}
                  </p>
                ),
              },
              {
                key: 'host',
                header: 'Host',
              },
              {
                key: 'path',
                header: 'Path',
              },
              {
                key: 'namespace',
                header: '命名空间',
              },
            ]}
            addons={[
              autotip({
                emptyText: '暂无数据',
              }),
            ]}
          />
          <Drawer
            visible={detailVisible}
            title="CLB规则详情"
            onClose={() => this.showDetail(false)}
            size="l"
            footer={
              <Button type="primary" onClick={() => this.showDetail(false)}>
                确定
              </Button>
            }
          >
            <RuleDetail clusterName={clusterName} namespace={selectedItem.namespace} ruleName={selectedItem.name} />
          </Drawer>
        </Card.Body>
      </Card>
    );
  }
}
