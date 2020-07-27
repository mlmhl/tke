/**
 * 服务器组详情页 - YAML
 */
import React from 'react';
import {
  Button,
  Card,
  Form,
  Select,
  Table,
  Text,
} from '@tencent/tea-component';

import { getRuleYamlContent } from '../../../services/api';
import { BackendsGroupInfo } from './index';
import { YamlEditorPanel } from '@src/modules/cluster/components/resource/YamlEditorPanel';

const { isEqual, isEmpty, pick } = require('lodash');
const { sortable, filterable, scrollable, radioable, injectable } = Table.addons;

// 对象选择
const sourceOptions = [
  { text: '负载均衡', value: 'lbcf' },
  { text: '后端记录', value: 'lbcf_br' },
];

interface Project {
  id: string;
  name: string;
}

interface Options {
  text: string;

  value: string;
}

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

interface StateTypes {
  clusterName: string; // 命名空间对应的集群

  namespace: string;

  name: string;

  backendsGroupInfo: BackendsGroupInfo;

  ruleName: string;

  ruleList: Options[];

  source: string;

  yamlContent: string;
}

class YamlPanel extends React.Component<PropTypes, StateTypes> {
  state = {
    isPlatform: this.props.context && this.props.context === 'platform',
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    name: this.props.name, // 服务器组名称
    backendsGroupInfo: this.props.backendsGroupInfo,

    source: '',
    ruleName: '',
    ruleList: [],
    yamlContent: '',
  };

  /**
   * 切换"对象选择"
   * @param source
   */
  handleSourceChanged = async source => {
    let { backendsGroupInfo } = this.state;
    let options;
    if (source === 'lbcf') {
      options = backendsGroupInfo['spec']['loadBalancers'].map(item => ({ text: item, value: item }));
    }
    this.setState({ source, ruleList: options });
  };

  getContent = async (clusterName, namespace, ruleName) => {
    let yamlContent = await getRuleYamlContent(clusterName, namespace, ruleName);
    this.setState({ yamlContent });
  };

  /**
   * 增加一个刷新图标按钮用来刷新列表数据
   * TODO: 把操作区做成一个小的表单处理
   */
  reloadContent = () => {
    let { clusterName, namespace, ruleName } = this.state;
    if (clusterName && namespace && ruleName) {
      this.getContent(clusterName, namespace, ruleName);
    }
  };

  /**
   * 切换命名空间的时候获取规则列表
   * @param namespace
   */
  handleRuleChanged = ruleName => {
    let { clusterName, namespace } = this.state;
    this.setState({ ruleName }, () => {
      this.getContent(clusterName, namespace, ruleName);
    });
  };

  render = () => {
    let { source, ruleName, ruleList, yamlContent } = this.state;

    return (
      <Card>
        <Card.Body
          title="YAML"
        >
          <Form layout="inline">
            <Form.Item label={'对象选择'}>
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
              <Button icon="refresh" onClick={this.reloadContent} />
            </Form.Item>
          </Form>
          <YamlEditorPanel config={yamlContent} readOnly={true} isNeedRefreshContent />
        </Card.Body>
      </Card>
    );
  };
}

export { YamlPanel };
