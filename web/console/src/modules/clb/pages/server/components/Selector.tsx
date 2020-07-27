/**
 * Pod 选择器的Selector
 */
import React from 'react';

import { Button, Card, Form, List, Modal, Radio, Select, Text } from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { getDeploymentsByNamespace, getStatefulsetsByNamespace } from '@src/modules/clb/services/api';

const { isEqual, stubArray, stubObject } = require('lodash');

interface Label {
  key: string;

  label: string;
}

interface WorkloadSummary {
  name: string;

  labels: Label[];
}

interface PropTypes {
  clusterName: string;

  namespace: string;

  value: [];

  onChange: (value) => void;
}

interface StateTypes {
  clusterName: string;

  namespace: string;

  type: string;

  deployments: WorkloadSummary[];

  statefulsets: WorkloadSummary[];

  selectedWorkload: string;

  labels: object;
}

export class Selector extends React.Component<PropTypes, StateTypes> {
  state = {
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    type: 'deployment', // 默认是 Deployment
    deployments: [],
    statefulsets: [],
    selectedWorkload: '', // 当前选中的workload名称
    labels: {},
  };

  componentDidMount() {
    let { clusterName, namespace } = this.state;
    if (clusterName && namespace) {
      this.loadData();
    }
  }

  componentWillReceiveProps(nextProps, nextContext) {
    let { clusterName, namespace } = this.state;
    if (!isEqual(clusterName, nextProps.clusterName) || !isEqual(namespace, nextProps.namespace)) {
      this.setState({ clusterName: nextProps.clusterName, namespace: nextProps.namespace }, () => {
        this.loadData();
      });
    }
  }

  loadData = () => {
    let { type, clusterName, namespace } = this.state;
    if (type === 'deployment') {
      this.getDeploymentList(clusterName, namespace);
    } else {
      this.getStatefulsetList(clusterName, namespace);
    }
  };

  getDeploymentList = async (clusterName, namespace) => {
    let data = await getDeploymentsByNamespace(clusterName, namespace);
    let deployments = data.map(item => ({ name: item.metadata.name, labels: item.metadata.labels }));
    this.setState({ deployments });
  };

  getStatefulsetList = async (clusterName, namespace) => {
    let data = await getStatefulsetsByNamespace(clusterName, namespace);
    let statefulsets = data.map(item => ({ name: item.metadata.name, labels: item.metadata.labels }));
    this.setState({ statefulsets });
  };

  handleTypeChanged = value => {
    this.setState({ type: value, deployments: stubArray(), statefulsets: stubArray(), labels: stubObject() }, () => {
      this.loadData();
    });
  };

  handleWorkloadChanged = value => {
    let { onChange } = this.props;
    let { type, deployments, statefulsets } = this.state;
    let workloads = type === 'deployment' ? deployments : statefulsets;
    console.log('workload@Selector = ', value);
    let workload = workloads.find(item => item.name === value);
    let { labels } = workload;
    this.setState({ selectedWorkload: value, labels }, () => {
      if (onChange) {
        onChange(workload.labels);
      }
    });
  };

  render() {
    let { type, deployments, statefulsets, selectedWorkload, labels } = this.state;
    let workloads = type === 'deployment' ? deployments : statefulsets;
    let workloadList = workloads.map(item => ({ value: item.name, text: item.name }));
    // let workload = workloads.find(item => item.name === selectedWorkload);
    // let { labels = {} } = workload || {};

    return (
      <Card bordered>
        <Card.Body>
          <Form.Item label={t('资源类型')}>
            <Radio.Group value={type} onChange={this.handleTypeChanged}>
              <Radio name="deployment">
                <span>Deployment</span>
              </Radio>
              <Radio name="statefulset">
                <span>Statefulset</span>
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('资源列表')}>
            <Select
              type="simulate"
              appearence="default"
              value={selectedWorkload}
              options={workloadList}
              onChange={this.handleWorkloadChanged}
            />
          </Form.Item>
          <Form.Item label="Labels">
            <Form.Text>
              <List>
                {Object.keys(labels).map(item => (
                  <List.Item key={item}>{`${item} : ${labels[item]}`}</List.Item>
                ))}
              </List>
            </Form.Text>
          </Form.Item>
        </Card.Body>
      </Card>
    );
  }
}
