/**
 * 业务详情 - 基本信息 - 资源限制
 */
import * as React from 'react';

import { K8SUNIT, valueLabels1000, valueLabels1024 } from '@helper/k8sUnitUtil';
import { Bubble, Button, Modal, StatusTip, Table, TableColumn, Text, Alert, Form, Select } from '@tea/component';
import { FormPanel } from '@tencent/ff-component';
import { isSuccessWorkflow, OperationState, deepClone } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { autotip } from '@tencent/tea-component/lib/table/addons';

import { getWorkflowError } from '../../common';
import { resourceLimitTypeToText, resourceTypeToUnit, PlatformTypeEnum } from '../constants/Config';
import { CreateProjectResourceLimitPanel } from '../../common/components';
import { RootProps } from './ProjectApp';
import { projectActions } from '../actions/projectActions';

export class ProjectDetailResourcePanel extends React.Component<RootProps, {}> {
  state = {
    currentClusterIndex: 0,
    isShowEditDialog: false,
    isShowDeleteDialog: false,
    isShowAddDialog: false
  };

  formatResourceLimit(resourceLimit) {
    let resourceLimitKeys = resourceLimit ? Object.keys(resourceLimit) : [];
    let content = resourceLimitKeys.map((item, index) => (
      <Text parent="p" key={index}>{`${resourceLimitTypeToText[item]}:${
        resourceTypeToUnit[item] === 'MiB'
          ? valueLabels1024(resourceLimit[item], K8SUNIT.Mi)
          : valueLabels1000(resourceLimit[item], K8SUNIT.unit)
      }${resourceTypeToUnit[item]}`}</Text>
    ));
    return resourceLimit ? (
      <Bubble content={content}>{content.filter((item, index) => index < 2)}</Bubble>
    ) : (
      <Text parent="p">{t('无限制')}</Text>
    );
  }

  render() {
    let { actions } = this.props;

    return (
      <>
        <FormPanel.Item label={t('资源限制')}>
          <React.Fragment>{this._renderTablePanel()}</React.Fragment>
        </FormPanel.Item>
        {this._renderEditProjectLimitDialog()}
        {this._renderDeleteProjectLimitDialog()}
        {this._renderAddProjectLimitDialog()}
      </>
    );
  }
  private _renderTablePanel() {
    let { actions, namespace, projectDetail, platformType, userManagedProjects } = this.props;
    let limitList = [];
    // 是否有可用区（spec包含zones属性的时候表示是共享集群，有可用区信息）
    const hasZoneInfo = Boolean(projectDetail.spec.zones);
    if (projectDetail) {
      const { clusters: specClusters, zones: specZones } = projectDetail.spec;
      if (specClusters) {
        const clusters = Object.keys(specClusters);
        limitList = clusters.map(item => ({
          key: item,
          name: item,
          hard: projectDetail.spec.clusters[item].hard
        }));
      }
      if (specZones) {
        limitList = specZones.map(({ clusterName, zone, hard }) => ({
          key: `${clusterName}_${zone}`,
          name: clusterName,
          zone,
          hard
        }));
      }
    }
    let projectId = projectDetail && projectDetail.metadata.name;
    let enableOp = platformType === PlatformTypeEnum.Manager;
    const zoneItem = {
      key: 'zone',
      header: t('可用区'),
      render: x => (
        <div>
          <span className="text-overflow">{x.zone}</span>
        </div>
      )
    };
    const columns: TableColumn<{ name: string; hard: any }>[] = [
      {
        key: 'name',
        header: t('集群'),
        render: x => (
          <div>
            <span className="text-overflow">{x.name}</span>
          </div>
        )
      },
      {
        key: 'resourceLimit',
        header: t('集群配额'),
        render: x => <React.Fragment>{this.formatResourceLimit(x.hard)}</React.Fragment>
      },
      {
        key: 'operation',
        header: t('操作'),
        render: (x, recordkey, recordIndex) => {
          if (enableOp) {
            return (
              <>
                <Button
                  type="link"
                  onClick={() => {
                    actions.project.initEdition(projectDetail);
                    this.setState({
                      currentClusterIndex: recordIndex,
                      isShowEditDialog: true
                    });
                    actions.project.editProjecResourceLimit.start([]);
                  }}
                >
                  {t('编辑')}
                </Button>
                <Button
                  className={'tea-ml-2n'}
                  type="link"
                  onClick={() => {
                    actions.project.initEdition(projectDetail);
                    this.setState({
                      currentClusterIndex: recordIndex,
                      isShowDeleteDialog: limitList.length
                    });
                  }}
                >
                  {t('解除')}
                </Button>
              </>
            );
          }
        }
      }
    ];
    hasZoneInfo && columns.splice(1, 0, zoneItem);

    return (
      <div style={{ width: 500 }}>
        <Table
          columns={columns}
          recordKey="key"
          records={limitList}
          addons={[
            autotip({
              emptyText: (
                <StatusTip
                  status="empty"
                  emptyText={<div className="text-center">{t('该业务没有集群配额限制')}</div>}
                />
              )
            })
          ]}
        />
        {enableOp && (
          <Button
            type={'link'}
            onClick={() => {
              actions.project.initEdition(projectDetail);
              actions.project.addClusters();
              this.setState({
                isShowAddDialog: true,
                currentClusterIndex: limitList.length
              });
            }}
          >
            {t('新增关联集群')}
          </Button>
        )}
      </div>
    );
  }

  private _renderEditProjectLimitDialog() {
    const { actions, project, projectEdition, editProjecResourceLimit } = this.props;
    let { currentClusterIndex } = this.state;
    let item = projectEdition.clusters[currentClusterIndex];
    if (!item) {
      return <></>;
    }
    let parentProjectSelection = projectEdition.parentProject
      ? project.list.data.records.find(item => item.metadata.name === projectEdition.parentProject)
      : null;

    let parentResourceLimits =
      parentProjectSelection && item.name ? parentProjectSelection.spec.clusters[item.name].hard : {};

    let failed =
      editProjecResourceLimit.operationState === OperationState.Done && !isSuccessWorkflow(editProjecResourceLimit);

    const cancel = () => {
      this.setState({ isShowEditDialog: false, currentClusterIndex: 0 });
      actions.project.clearEdition();

      if (editProjecResourceLimit.operationState === OperationState.Done) {
        actions.project.editProjecResourceLimit.reset();
      }
      if (editProjecResourceLimit.operationState === OperationState.Started) {
        actions.project.editProjecResourceLimit.cancel();
      }
    };
    return (
      <Modal visible={this.state.isShowEditDialog} caption={t('编辑资源限制')} onClose={() => cancel()}>
        <CreateProjectResourceLimitPanel
          parentResourceLimits={parentResourceLimits}
          onCancel={() => cancel()}
          failMessage={failed ? getWorkflowError(editProjecResourceLimit) : null}
          resourceLimits={item.resourceLimits}
          onSubmit={resourceLimits => {
            projectEdition.clusters[currentClusterIndex] = Object.assign(
              {},
              projectEdition.clusters[currentClusterIndex],
              {
                resourceLimits
              }
            );
            actions.project.editProjecResourceLimit.start([projectEdition]);
            actions.project.editProjecResourceLimit.perform();
            cancel();
          }}
        />
      </Modal>
    );
  }

  private _renderDeleteProjectLimitDialog() {
    const { actions, project, projectEdition, editProjecResourceLimit } = this.props;
    let { currentClusterIndex } = this.state;
    let clusterName =
      projectEdition.clusters.length && projectEdition.clusters[currentClusterIndex]
        ? projectEdition.clusters[currentClusterIndex].name
        : '-';

    let failed =
      editProjecResourceLimit.operationState === OperationState.Done && !isSuccessWorkflow(editProjecResourceLimit);

    const cancel = () => {
      this.setState({ isShowDeleteDialog: false, currentClusterIndex: 0 });
      actions.project.clearEdition();

      if (editProjecResourceLimit.operationState === OperationState.Done) {
        actions.project.editProjecResourceLimit.reset();
      }
      if (editProjecResourceLimit.operationState === OperationState.Started) {
        actions.project.editProjecResourceLimit.cancel();
      }
    };
    return (
      <Modal visible={this.state.isShowDeleteDialog} caption={t('解除集群关联')} onClose={() => cancel()}>
        <Modal.Body>
          <FormPanel.InlineText>
            {t('确定要删除业务和{{clusterName}}的关联么？', {
              clusterName: clusterName
            })}
          </FormPanel.InlineText>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="primary"
            style={{ margin: '0px 5px 0px 40px' }}
            onClick={() => {
              projectEdition.clusters.splice(currentClusterIndex, 1);
              actions.project.editProjecResourceLimit.start([projectEdition]);
              actions.project.editProjecResourceLimit.perform();
              cancel();
            }}
          >
            {failed ? t('重试') : t('完成')}
          </Button>
          <Button
            type="weak"
            onClick={() => {
              cancel();
            }}
          >
            {t('取消')}
          </Button>
          {failed ? (
            <Alert
              type="error"
              style={{ display: 'inline-block', marginLeft: '20px', marginBottom: '0px', maxWidth: '750px' }}
            >
              {getWorkflowError(editProjecResourceLimit)}
            </Alert>
          ) : (
            <noscript />
          )}
        </Modal.Footer>
      </Modal>
    );
  }

  private _renderAddProjectLimitDialog() {
    let { projectEdition, actions, project, route, editProjecResourceLimit, cluster } = this.props;
    let { currentClusterIndex, isShowAddDialog } = this.state;

    let item = projectEdition.clusters[currentClusterIndex];
    if (!item) {
      return <></>;
    }
    let finalClusterList = deepClone(cluster);

    let parentProjectSelection = projectEdition.parentProject
      ? project.list.data.records.find(item => item.metadata.name === projectEdition.parentProject)
      : null;
    //筛选出project中的集群
    if (parentProjectSelection) {
      let parentClusterList = parentProjectSelection.spec.clusters
        ? Object.keys(parentProjectSelection.spec.clusters)
        : [];
      finalClusterList.list.data.records = finalClusterList.list.data.records.filter(
        item => parentClusterList.indexOf(item.clusterId + '') !== -1
      );
      finalClusterList.list.data.recordCount = finalClusterList.list.data.records.length;
    }

    let failed =
      editProjecResourceLimit.operationState === OperationState.Done && !isSuccessWorkflow(editProjecResourceLimit);

    let parentResourceLimits =
      parentProjectSelection && item.name ? parentProjectSelection.spec.clusters[item.name].hard : {};

    const cancel = () => {
      this.setState({ isShowAddDialog: false, currentClusterIndex: 0 });
      actions.project.clearEdition();

      if (editProjecResourceLimit.operationState === OperationState.Done) {
        actions.project.editProjecResourceLimit.reset();
      }
      if (editProjecResourceLimit.operationState === OperationState.Started) {
        actions.project.editProjecResourceLimit.cancel();
      }
    };

    const renderClusterField = () => {
      if (projectEdition.isSharingCluster) {
        const clusterZones = cluster.list.data.records.reduce((accu, item, arr) => {
          const { clusterId, clusterName, zones = [] } = item;
          const clusterZones = zones.map(item => ({ clusterId, clusterDisplayName: clusterName, zone: item }));
          const data = accu.concat(clusterZones);
          return data;
        }, []);
        const clusterZoneList = clusterZones.map(({ zone, clusterId }) => ({
          value: zone,
          groupKey: clusterId,
          text: zone
        }));
        const groups = clusterZones.reduce((accu, item, index, arr) => {
          let { clusterId, clusterDisplayName, zone } = item;
          if (!accu[clusterId]) {
            accu[clusterId] = `${clusterId}(${clusterDisplayName})`;
          }
          return accu;
        }, {});

        return (
          <Form.Item
            label="集群和可用区"
            required
            // status={getStatus(meta)}
            // message={getStatus(meta) === 'error' && meta.error}
          >
            <Select
              value={item.zone}
              onChange={value => {
                const { clusterId } = clusterZones.find(item => item.zone === value);
                actions.project.updateClusterZones(currentClusterIndex, clusterId, value);
                actions.project.validateClustersName(currentClusterIndex);
              }}
              searchable
              type="simulate"
              appearence="button"
              size="m"
              boxSizeSync
              placeholder="选择可用区"
              options={clusterZoneList}
              groups={groups}
            />
          </Form.Item>
        );
      }

      return (
        <FormPanel.Item label={t('集群')}>
          <FormPanel.Select
            label={t('集群')}
            value={item.name}
            validator={item.v_name}
            model={finalClusterList}
            action={actions.cluster}
            valueField={x => x.clusterId}
            displayField={x => `${x.clusterId}(${x.clusterName})`}
            onChange={clusterId => {
              actions.project.updateClusters(currentClusterIndex, clusterId);
              actions.project.validateClustersName(currentClusterIndex);
            }}
            style={{ marginRight: 5 }}
          ></FormPanel.Select>
        </FormPanel.Item>
      );
    };

    return (
      <Modal visible={isShowAddDialog} caption={t('新增集群限制')} onClose={() => cancel()} size={700}>
        <FormPanel>
          {renderClusterField()}
          <FormPanel.Item label={t('限额')}>
            <CreateProjectResourceLimitPanel
              parentResourceLimits={parentResourceLimits}
              onCancel={() => cancel()}
              failMessage={failed ? getWorkflowError(editProjecResourceLimit) : null}
              resourceLimits={item.resourceLimits}
              onSubmit={resourceLimits => {
                actions.project.validateProjection();
                if (projectActions._validateProjection(projectEdition)) {
                  projectEdition.clusters[currentClusterIndex] = Object.assign(
                    {},
                    projectEdition.clusters[currentClusterIndex],
                    {
                      resourceLimits
                    }
                  );
                  actions.project.editProjecResourceLimit.start([projectEdition]);
                  actions.project.editProjecResourceLimit.perform();
                  cancel();
                }
              }}
            />
          </FormPanel.Item>
        </FormPanel>
      </Modal>
    );
  }
}
