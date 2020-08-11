/**
 * Pod 选择器的Selector
 */
import React from 'react';

import { Button, Card, Form, List, Modal, Radio, Select, Text } from '@tencent/tea-component';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  getDeploymentsByNamespace,
  getStatefulsetsByNamespace,
  getTappsByNamespace,
  getWorkloadsByNamespace,
} from '../../../services/api';

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

  // deployments: WorkloadSummary[];
  //
  // statefulsets: WorkloadSummary[];
  //
  // tapps: WorkloadSummary[];

  workloads: WorkloadSummary[];

  selectedWorkload: string;

  labels: object;
}

export class Selector extends React.Component<PropTypes, StateTypes> {
  state = {
    clusterName: this.props.clusterName,
    namespace: this.props.namespace,
    type: 'deployment', // 默认是 Deployment
    // deployments: [],
    // statefulsets: [],
    // tapps: [],
    workloads: [],
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
    if (clusterName && namespace) {
      if (type === 'deployment') {
        this.getDeploymentList(clusterName, namespace);
      } else if (type === 'statefulset') {
        this.getStatefulsetList(clusterName, namespace);
      } else {
        this.getTappList(clusterName, namespace);
      }
    }
  };

  getDeploymentList = async (clusterName, namespace) => {
    let data = await getWorkloadsByNamespace(clusterName, namespace, 'deployment');
    let workloads = data.map(({ name, available, labels }) => ({ name, labels, available }));
    this.setState({ workloads });
  };

  getStatefulsetList = async (clusterName, namespace) => {
    let data = await getWorkloadsByNamespace(clusterName, namespace, 'statefulset');
    let workloads = data.map(({ name, available, labels }) => ({ name, labels, available }));
    this.setState({ workloads });
  };

  getTappList = async (clusterName, namespace) => {
    let data = await getWorkloadsByNamespace(clusterName, namespace, 'tapp');
    let workloads = data.map(({ name, available, labels }) => ({ name, labels, available }));
    this.setState({ workloads });
  };

  handleTypeChanged = value => {
    this.setState({ type: value, workloads: stubArray(), labels: stubObject() }, () => {
      this.loadData();
    });
  };

  handleWorkloadChanged = value => {
    let { onChange } = this.props;
    let { type, workloads } = this.state;
    let workload = workloads.find(item => item.name === value);
    let { labels } = workload;
    this.setState({ selectedWorkload: value, labels }, () => {
      if (onChange) {
        onChange(workload.labels);
      }
    });
  };

  render() {
    let { type, workloads, selectedWorkload, labels } = this.state;
    let workloadList = workloads.map(item => ({ value: item.name, text: item.name, disabled: !item.available }));

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
              <Radio name="tapp">
                <span>TAPP</span>
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="资源列表">
            <Select
              searchable
              type="simulate"
              appearence="button"
              value={selectedWorkload}
              options={workloadList}
              onChange={this.handleWorkloadChanged}
              placeholder="请选择hostNetwork或Floating IP的容器"
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
