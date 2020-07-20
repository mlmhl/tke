import {
  Bubble,
  Card,
  CardBodyProps,
  CardProps,
  ContentView,
  Dropdown,
  Form,
  Icon,
  Justify,
  JustifyProps,
  Layout,
  List,
  Pagination,
  PaginationProps,
  Select,
  Table,
  TableColumn,
  TableProps,
  Text,
  Button,
  ExternalLink,
} from '@tencent/tea-component';
import {
  expandable,
  ExpandableAddonOptions,
  filterable,
  FilterableConfig,
  FilterOption,
  radioable,
  RadioableOptions,
  scrollable,
  ScrollableAddonOptions,
  selectable,
  SelectableOptions,
  sortable,
  SortBy,
  stylize,
  StylizeOption,
} from '@tencent/tea-component/lib/table/addons';
import { autotip } from '@tencent/tea-component/lib/table/addons/autotip';
import { StatusTip } from '@tencent/tea-component/lib/tips';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { getAllClusters, getRulesByCluster } from '../../services/api';
import React from 'react';

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
  };

  componentDidMount() {
    this.getClusterList();
  }

  getClusterList = async () => {
    let clusters = await getAllClusters();
    console.log('clusters@getClusterList = ', clusters);
    this.setState({ clusters });
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
    console.log('clusterName = ', clusterName);
    this.setState({ clusterName }, () => {
      this.getList(clusterName);
    });
  };

  render() {
    let { clusterName, clusters, ruleList } = this.state;
    let { projects } = this.props;
    let clusterList = clusters.map(({ name, displayName }) => ({
      value: name,
      text: `${displayName}(${name})`,
    }));
    console.log('clusterList = ', clusterList);

    return (
      <ContentView>
        <Header title={t('CLB实例')} />
        <Body>
          <Table.ActionPanel>
            <Justify
              left={
                <>
                  <Button type="primary">导入实例</Button>
                  <Button>禁用实例</Button>
                  <Button>删除实例</Button>
                </>
              }
              right={
                <Form layout="inline">
                  <Form.Item label={t('集群')}>
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
                  </Form.Item>
                </Form>
              }
            />
          </Table.ActionPanel>
          <Card>
            <Table
              verticalTop
              records={ruleList}
              recordKey="name"
              columns={[
                {
                  key: 'name',
                  header: '规则名称',
                  render: rule => (
                    <>
                      <p>
                        <a>{rule.name}</a>
                      </p>
                    </>
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
                  render: rule => (
                    <>
                      <p>{rule.type}</p>
                    </>
                  ),
                },
                {
                  key: 'port',
                  header: '端口',
                  width: 100,
                  render: rule => (
                    <>
                      <p>
                        {rule.protocol}:{rule.port}
                      </p>
                    </>
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
                  key: 'backendGroups',
                  header: '命名空间',
                  render: rule => (
                    <>
                      <p>{rule.backendGroups.map(item => item.namespace).join(', ')}</p>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Body>
      </ContentView>
    );
  }
}
