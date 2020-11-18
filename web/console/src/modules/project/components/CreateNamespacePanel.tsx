/**
 * 新建 Namespace
 */
import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { bindActionCreators, deepClone, isSuccessWorkflow, OperationState } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Alert, Button, Modal, Select, Form } from '@tencent/tea-component';

import { getWorkflowError } from '../../common';
import { allActions } from '../actions';
import { namespaceActions } from '../actions/namespaceActions';
import { resourceLimitTypeToText, resourceTypeToUnit } from '../constants/Config';
import { ProjectResourceLimit } from '../models/Project';
import { router } from '../router';
import { CreateProjectResourceLimitPanel } from '../../common/components';
import { RootProps } from './ProjectApp';
import { fetchCMDBBusinessLevelThreeList } from '@src/modules/project/WebAPI';
import { CMDBInfoWithDefaultModuleType } from '@src/modules/project/models/Namespace';
const { useState, useEffect } = React;
declare const WEBPACK_CONFIG_SHARED_CLUSTER: boolean;

function CMDBModule(props) {
  const { value: prevInfo, onChange } = props;
  const { departmentName, businessLevelOneName, businessLevelTwoName, businessLevelTwoId } = prevInfo;
  const [currentBusinessLevelThree, setCurrentBusinessLevelThree] = useState('');
  const [businessLevelThreeList, setBusinessLevelThreeList] = useState([]);

  useEffect(() => {
    const getModuleList = async () => {
      const data = await fetchCMDBBusinessLevelThreeList(businessLevelTwoId);
      setBusinessLevelThreeList(data);
      return data;
    };
    getModuleList();
  }, [businessLevelTwoId]);

  return (
    <Form>
      <Form.Item label="部门">
        <Form.Text>{departmentName}</Form.Text>
      </Form.Item>
      <Form.Item label="一级业务">
        <Form.Text>{businessLevelOneName}</Form.Text>
      </Form.Item>
      <Form.Item label="二级业务">
        <Form.Text>{businessLevelTwoName}</Form.Text>
      </Form.Item>
      <Form.Item label="默认模块">
        <Select
          value={currentBusinessLevelThree}
          onChange={value => {
            setCurrentBusinessLevelThree(value);
            const businessLevelThreeName = businessLevelThreeList.find(item => item.id === value) && businessLevelThreeList.find(item => item.id === value).name || '';
            if (onChange) {
              const cmdbModuleInfo = {
                ...prevInfo,
                businessLevelThreeName,
                businessLevelThreeId: value
              };
              onChange(cmdbModuleInfo);
            }
          }}
          options={businessLevelThreeList.map(item => ({ text: item.name, value: item.id }))}
          searchable
          type="simulate"
          appearence="button"
          size="m"
          boxSizeSync
        />
      </Form.Item>
    </Form>
  );
}

const mapDispatchToProps = dispatch =>
  Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), {
    dispatch,
  });

const CMDBMapping = {
  'teg.tkex.oa.com/department': 'departmentName',
  'teg.tkex.oa.com/department-id': 'departmentId',
  'teg.tkex.oa.com/business1': 'businessLevelOneName',
  'teg.tkex.oa.com/business1-id': 'businessLevelOneId',
  'teg.tkex.oa.com/business2': 'businessLevelTwoName',
  'teg.tkex.oa.com/business2-id': 'businessLevelTwoId',
  'teg.tkex.oa.com/business3': 'businessLevelThreeName',
  'teg.tkex.oa.com/business3-id': 'businessLevelThreeId',
};

@connect(state => state, mapDispatchToProps)
export class CreateNamespacePanel extends React.Component<RootProps, {}> {
  state = {
    isShowDialog: false,
  };
  componentDidMount() {
    let { actions, project, projectDetail, namespaceEdition, manager } = this.props;
    actions.cluster.applyFilter({});
    if (project.list.data.recordCount === 0) {
      actions.project.applyFilter({});
    }
    let cmdbInfo = {};
    if (projectDetail && projectDetail.metadata) {
      const { labels, annotations } = projectDetail.metadata;
      cmdbInfo = Object.assign({}, labels ? labels : {}, annotations ? annotations : {});
      const cmdbValue: CMDBInfoWithDefaultModuleType = Object.keys(CMDBMapping).reduce((accu, item, arr) => {
        if (cmdbInfo[item]) {
          accu[CMDBMapping[item]] = new RegExp(/-id$/).test(item) ? Number(cmdbInfo[item]) : cmdbInfo[item];
        }
        return accu;
      }, {}) as CMDBInfoWithDefaultModuleType;
      actions.namespace.inputCMDBInfo(cmdbValue);
    }
  }

  componentWillUnmount() {
    this.props.actions.namespace.clearEdition();
  }
  _handleSubmit() {
    let { actions, namespaceEdition, project, route } = this.props;
    actions.namespace.validateNamespaceEdition();
    if (namespaceActions._validateNamespaceEdition(namespaceEdition)) {
      actions.namespace.createNamespace.start([namespaceEdition], {
        projectId: project.selections[0] ? project.selections[0].metadata.name : route.queries['projectId'],
      });
      actions.namespace.createNamespace.perform();
    }
  }
  formatResourceLimit(resourceLimit: ProjectResourceLimit[]) {
    let content = resourceLimit.map((item, index) => (
      <FormPanel.Text key={index}>{`${resourceLimitTypeToText[item.type]}:${item.value}${
        resourceTypeToUnit[item.type]
      }`}</FormPanel.Text>
    ));
    return content;
  }

  render() {
    let { namespaceEdition, actions, cluster, project, createNamespace, route, projectDetail } = this.props;

    let finalClusterList = deepClone(cluster);
    //筛选出project中的集群
    if (projectDetail) {
      let projectClusterList = projectDetail.spec.clusters ? Object.keys(projectDetail.spec.clusters) : [];
      finalClusterList.list.data.records = finalClusterList.list.data.records.filter(
        item => projectClusterList.indexOf(item.clusterId + '') !== -1
      );
      finalClusterList.list.data.recordCount = finalClusterList.list.data.records.length;
    }

    let failed = createNamespace.operationState === OperationState.Done && !isSuccessWorkflow(createNamespace);

    // 只有业务中设置了quota的cluster和zone才可以供选择
    const renderCluster = () => {
      if (projectDetail && projectDetail.spec.zones) {
        const projectClusterZones = projectDetail.spec.zones;
        const allClusterZones = cluster.list.data.records;
        // 下面要显示的集群/可用区必须是业务里面已经设置了的，因此需要从projectDetail中进行映射，但是因为projectDetail.spec.zones中缺少用于作为text显示的clusterDisplayName，因此要从clusters接口里面拿集群名称用于显示用
        const clusterZones = projectClusterZones.map(item => {
          const { clusterName: clusterId, zone } = item;
          const data = { clusterId, clusterDisplayName: clusterId, zone };
          return data;
        });
        const clusterZoneList = clusterZones.map(({ zone, clusterId }) => ({
          // value: zone,
          value: `${clusterId}/${zone}`,
          groupKey: clusterId,
          text: zone,
        }));
        const groups = clusterZones.reduce((accu, item, index, arr) => {
          let { clusterId, clusterDisplayName, zone } = item;
          if (!accu[clusterId]) {
            accu[clusterId] = `${clusterId}(${clusterDisplayName})`;
          }
          return accu;
        }, {});

        return (
          <Form.Item label="集群/可用区">
            <Select
              value={`${namespaceEdition.clusterName}/${namespaceEdition.zone}`}
              onChange={value => {
                const { clusterId, zone } = clusterZones.find(({ clusterId, zone }) => `${clusterId}/${zone}` === value);
                const region = allClusterZones.find(item => item.clusterId === clusterId).region;
                actions.namespace.selectClusterZone(region, clusterId, zone);
                actions.namespace.validateClusterName();
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
        <FormPanel.Item
          label={t('集群')}
          validator={namespaceEdition.v_clusterName}
          errorTipsStyle="Icon"
          select={{
            model: finalClusterList,
            action: actions.cluster,
            value: namespaceEdition.clusterName,
            valueField: x => x.clusterId,
            displayField: x => `${x.clusterId}(${x.clusterName})`,
            onChange: value => {
              actions.namespace.selectCluster(value);
              actions.namespace.validateClusterName();
            },
          }}
        />
      );
    };

    return (
      <FormPanel>
        <FormPanel.Item
          message={t(
            '最长48个字符，只能包含小写字母、数字及分隔符("-")，且必须以小写字母开头，数字或小写字母结尾，名称不能以"kube-"开头'
          )}
          text
          label={t('名称')}
          validator={namespaceEdition.v_namespaceName}
          errorTipsStyle="Icon"
          input={{
            value: namespaceEdition.namespaceName,
            onChange: actions.namespace.inputNamespaceName,
            onBlur: () => {
              actions.namespace.validateNamespaceName();
            },
          }}
        />
        <FormPanel.Item text label={t('业务')}>
          {projectDetail ? (
            <React.Fragment>
              <FormPanel.InlineText>
                {t(projectDetail.metadata.name + '(' + projectDetail.spec.displayName + ')')}
              </FormPanel.InlineText>
            </React.Fragment>
          ) : (
            <noscript />
          )}
        </FormPanel.Item>
        {WEBPACK_CONFIG_SHARED_CLUSTER && (
          <Form.Item label={t('CMDB业务')}>
            <CMDBModule
              value={namespaceEdition.cmdbInfo}
              onChange={value => {
                actions.namespace.inputCMDBInfo(value);
              }}
            />
          </Form.Item>
        )}
        {renderCluster()}
        <FormPanel.Item label={'资源限制'}>
          {this.formatResourceLimit(namespaceEdition.resourceLimits)}
          <Button
            disabled={namespaceEdition.clusterName === ''}
            icon={'pencil'}
            onClick={() => {
              this.setState({
                isShowDialog: true,
              });
            }}
          ></Button>
        </FormPanel.Item>
        <FormPanel.Footer>
          <React.Fragment>
            <Button
              type="primary"
              disabled={createNamespace.operationState === OperationState.Performing}
              onClick={this._handleSubmit.bind(this)}
            >
              {failed ? t('重试') : t('完成')}
            </Button>
            <Button
              type="weak"
              onClick={() => {
                actions.namespace.clearEdition();
                router.navigate({ sub: 'detail', tab: 'namespace' }, route.queries);
              }}
            >
              {t('取消')}
            </Button>
            {failed ? (
              <Alert
                type="error"
                style={{ display: 'inline-block', marginLeft: '20px', marginBottom: '0px', maxWidth: '750px' }}
              >
                {getWorkflowError(createNamespace)}
              </Alert>
            ) : (
              <noscript />
            )}
          </React.Fragment>
        </FormPanel.Footer>
        {this._renderEditProjectLimitDialog()}
      </FormPanel>
    );
  }
  private _renderEditProjectLimitDialog() {
    const { actions, project, namespaceEdition, projectDetail } = this.props;
    let { isShowDialog } = this.state;

    const { clusterName, zone } = namespaceEdition;

    // let resourceLimits = projectDetail && clusterName ? projectDetail.spec.clusters || projectDetail.spec.zones : {};
    const getResourceLimits = () => {
      if (projectDetail && clusterName) {
        if (projectDetail.spec.clusters) {
          return projectDetail.spec.clusters[clusterName].hard;
        } else if (projectDetail.spec.zones) {
          return projectDetail.spec.zones.find(
            item => item.clusterName === clusterName && item.zone === zone
          ).hard;
        }
      }
      return {};
    };

    return (
      <Modal visible={isShowDialog} caption={t('编辑资源限制')} onClose={() => this.setState({ isShowDialog: false })}>
        <CreateProjectResourceLimitPanel
          parentResourceLimits={getResourceLimits()}
          onCancel={() => {
            this.setState({ isShowDialog: false });
          }}
          resourceLimits={namespaceEdition.resourceLimits}
          onSubmit={requestLimits => {
            actions.namespace.updateNamespaceResourceLimit(requestLimits);
            this.setState({ isShowDialog: false });
          }}
        />
      </Modal>
    );
  }
}
