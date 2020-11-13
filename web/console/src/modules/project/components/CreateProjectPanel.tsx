/**
 * 平台管理 -> 业务管理 -> 新建业务
 */
import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { bindActionCreators, deepClone, isSuccessWorkflow, OperationState } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Alert, Bubble, Button, Icon, Modal, Text, Select, Form } from '@tencent/tea-component';
import { isEqual } from 'lodash';

import { getWorkflowError, isEmpty, RequestParams, ResourceInfo } from '../../common';
import { allActions } from '../actions';
import { projectActions } from '../actions/projectActions';
import { resourceLimitTypeToText, resourceTypeToUnit, PlatformTypeEnum } from '../constants/Config';
import { ProjectResourceLimit } from '../models/Project';
import { router } from '../router';
import { CreateProjectResourceLimitPanel } from '../../common/components';
import { EditProjectManagerPanel } from './EditProjectManagerPanel';
import { RootProps } from './ProjectApp';
import { resourceConfig } from '@config/resourceConfig';
import { reduceK8sRestfulPath } from '@helper/urlUtil';
import { Method, reduceNetworkRequest } from '@helper/reduceNetwork';
import { fetchCMDBBusinessLevelTwoList, fetchCMDBBusinessLevelOneList, fetchCMDBDepartmentList } from '@src/modules/project/WebAPI';
const { useEffect, useReducer } = React;

function CMDBSelector(props) {
  const { value, onChange } = props;
  const initialState = {
    currentDepartment: 0,
    departmentList: [],
    currentBusinessLevelOne: 0,
    businessLevelOneList: [],
    currentBusinessleveTwo: 0,
    businessLevelTwoList: [],
  };
  const reducer = (state, action) => {
    let nextState;
    switch (action.type) {
      case 'department':
        nextState = { ...state, currentDepartment: action.payload };
        break;
      case 'departmentList':
        nextState = { ...state, departmentList: action.payload };
        break;
      case 'businessLevelOne':
        nextState = { ...state, currentBusinessLevelOne: action.payload };
        break;
      case 'businessLevelOneList':
        nextState = { ...state, businessLevelOneList: action.payload };
        break;
      case 'businessLevelTwo':
        nextState = { ...state, currentBusinessLevelTwo: action.payload };
        break;
      case 'businessLevelTwoList':
        nextState = { ...state, businessLevelTwoList: action.payload };
        break;
      default:
        nextState = state;
    }
    if (!isEqual(state, nextState)) {
      if (onChange) {
        const { currentDepartment, departmentList, currentBusinessLevelOne, businessLevelOneList, currentBusinessLevelTwo, businessLevelTwoList } = nextState;
        const cmdbInfo = {
          departmentName: currentDepartment,
          departmentId: departmentList.find(item => item.name === currentDepartment) && departmentList.find(item => item.name === currentDepartment).id || 0,
          businessLevelOneName: businessLevelOneList.find(item => item.id === currentBusinessLevelOne) && businessLevelOneList.find(item => item.id === currentBusinessLevelOne).name || '',
          businessLevelOneId: currentBusinessLevelOne,
          businessLevelTwoName: businessLevelTwoList.find(item => item.id === currentBusinessLevelTwo) && businessLevelTwoList.find(item => item.id === currentBusinessLevelTwo).name || '',
          businessLevelTwoId: currentBusinessLevelTwo
        };
        onChange(cmdbInfo);
      }
    }
    return nextState;
  };
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const getDepartmentList = async () => {
      const data = await fetchCMDBDepartmentList();
      dispatch({ type: 'departmentList', payload: data });
      return data;
    };
    getDepartmentList();
  }, []);


  useEffect(() => {
    const { currentDepartment } = state;
    const getBusinessLevelOneList = async () => {
      const data = await fetchCMDBBusinessLevelOneList(currentDepartment);
      dispatch({ type: 'businessLevelOneList', payload: data });
      return data;
    };
    getBusinessLevelOneList();
  }, [state.currentDepartment]);

  useEffect(() => {
    const { currentBusinessLevelOne } = state;
    const getBusinessLevelTwoList = async () => {
      const data = await fetchCMDBBusinessLevelTwoList(currentBusinessLevelOne);
      dispatch({ type: 'businessLevelTwoList', payload: data });
      return data;
    };
    getBusinessLevelTwoList();
  }, [state.currentBusinessLevelOne]);

  return (
    <Form layout="inline">
      <Form.Item label="部门">
        <Select
          value={state.currentDepartment}
          onChange={value => dispatch({ type: 'department', payload: value })}
          options={state.departmentList.map(item => ({ text: item.name, value: item.name }))}
          searchable
          type="simulate"
          appearence="button"
          size="m"
          boxSizeSync
          // placeholder="选择集群"
        />
      </Form.Item>
      <Form.Item label="一级业务">
        <Select
          value={state.currentBusinessLevelOne}
          onChange={value => dispatch({ type: 'businessLevelOne', payload: value })}
          options={state.businessLevelOneList.map(item => ({ text: item.name, value: item.id }))}
          searchable
          type="simulate"
          appearence="button"
          size="m"
          boxSizeSync
        />
      </Form.Item>
      <Form.Item label="二级业务">
        <Select
          value={state.currentBusinessLevelTwo}
          onChange={value => dispatch({ type: 'businessLevelTwo', payload: value })}
          options={state.businessLevelTwoList.map(item => ({ text: item.name, value: item.id }))}
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
    dispatch
  });

@connect(state => state, mapDispatchToProps)
export class CreateProjectPanel extends React.Component<
  RootProps,
  { currentClusterIndex: number; isShowDialog: boolean }
> {
  state = {
    currentClusterIndex: 0,
    isShowDialog: false
  };
  componentDidMount() {
    let { actions, project, manager } = this.props;
    actions.cluster.applyFilter({});
    if (project.list.data.recordCount === 0) {
      actions.project.applyFilter({});
    }
    if (manager.list.data.recordCount === 0) {
      actions.manager.applyFilter({});
    }
    this.getUserInfo();
  }

  //获取用户信息包括用户业务信息
  async getUserInfo() {
    let { actions } = this.props;
    let infoResourceInfo: ResourceInfo = resourceConfig()['info'];
    let url = reduceK8sRestfulPath({ resourceInfo: infoResourceInfo });
    let params: RequestParams = {
      method: Method.get,
      url
    };
    try {
      let response = await reduceNetworkRequest(params);
      let loginUserInfo = {
        id: '',
        name: '',
        displayName: ''
      };
      if (!response.code) {
        const { uid, name, extra } = response.data;
        loginUserInfo = {
          id: uid,
          name,
          displayName: extra.displayname ? extra.displayname[0] : ''
        };
      }
      actions.project.selectManager([loginUserInfo]);
    } catch (error) {}
  }

  formatResourceLimit(resourceLimit: ProjectResourceLimit[]) {
    let content = resourceLimit.map((item, index) => (
      <Text parent="p" key={index}>{`${resourceLimitTypeToText[item.type]}:${item.value}${
        resourceTypeToUnit[item.type]
      }`}</Text>
    ));
    return content;
  }

  _handleSubmit() {
    let { actions, projectEdition } = this.props;
    actions.project.validateProjection();
    if (projectActions._validateProjection(projectEdition)) {
      actions.project.createProject.start([projectEdition]);
      actions.project.createProject.perform();
    }
  }

  render() {
    let { projectEdition, actions, project, route, createProject, cluster, platformType } = this.props;

    let projectListOpions = project.list.data.records.map(item => {
      return { text: `${item.metadata.name}(${item.spec.displayName})`, value: item.metadata.name };
    });

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

    let failed = createProject.operationState === OperationState.Done && !isSuccessWorkflow(createProject);

    const renderCluster = (item, index) => {
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
          <Select
            value={item.zone}
            onChange={value => {
              const { clusterId } = clusterZones.find(item => item.zone === value);
              actions.project.updateClusterZones(index, clusterId, value);
              actions.project.validateClustersName(index);
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
        );
      }

      return (
        <FormPanel.Select
          label={t('集群')}
          value={item.name}
          model={finalClusterList}
          action={actions.cluster}
          valueField={x => x.clusterId}
          displayField={x => `${x.clusterId}(${x.clusterName})`}
          onChange={clusterId => {
            actions.project.updateClusters(index, clusterId);
            actions.project.validateClustersName(index);
          }}
          style={{ marginRight: 5 }}
        ></FormPanel.Select>
      );
    };

    return (
      <FormPanel>
        <FormPanel.Item
          label={t('业务名称')}
          errorTipsStyle="Icon"
          message={t('业务名称不能超过63个字符')}
          validator={projectEdition.v_displayName}
          input={{
            value: projectEdition.displayName,
            onChange: value => actions.project.inputProjectName(value),
            onBlur: e => {
              actions.project.validateDisplayName(e.target.value);
            }
          }}
        />
        {projectEdition.isSharingCluster && (
          <Form.Item label={t('CMDB业务')}>
            <CMDBSelector
              value={projectEdition.cmdbInfo}
              onChange={value => {
                actions.project.inputProjectCMDBInfo(value);
              }}
            />
          </Form.Item>
        )}
        <FormPanel.Item label={t('业务管理员')}>
          <div style={{ width: 600 }}>
            <EditProjectManagerPanel {...this.props} />
          </div>
          {(!projectEdition.members || projectEdition.members.length === 0) && (
            <Text theme="danger" style={{ fontSize: '12px' }}>
              需要至少选择一个责任人
            </Text>
          )}
        </FormPanel.Item>
        <FormPanel.Item label={projectEdition.isSharingCluster ? '集群和可用区' : '集群'}>
          {projectEdition.clusters.map((item, index) => {
            let resourceLimitContent = this.formatResourceLimit(item.resourceLimits);
            return (
              <React.Fragment key={index}>
                <div style={{ marginBottom: 5 }} className={item.v_name.status === 2 ? 'is-error' : ''}>
                  <Bubble placement="top" content={item.v_name.status === 2 ? <p>{item.v_name.message}</p> : null}>
                    <div style={{ display: 'inline-block' }}>{renderCluster(item, index)}</div>
                  </Bubble>
                  <Button
                    type={'link'}
                    disabled={item.name === ''}
                    onClick={() =>
                      this.setState({
                        isShowDialog: true,
                        currentClusterIndex: index
                      })
                    }
                  >
                    {t('填写资源限制')}
                  </Button>
                  {resourceLimitContent.length && (
                    <Bubble content={resourceLimitContent}>
                      <Icon type="detail" />
                    </Bubble>
                  )}
                  <Button
                    icon={'close'}
                    onClick={() => {
                      actions.project.deleteClusters(index);
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })}
          <Button type={'link'} onClick={() => actions.project.addClusters()}>
            {t('新增集群')}
          </Button>
        </FormPanel.Item>

        {!projectEdition.isSharingCluster && (
          <FormPanel.Item label={t('上级业务')}>
            <FormPanel.Select
              label={t('上级业务')}
              options={projectListOpions}
              value={projectEdition.parentProject}
              disabled={platformType === PlatformTypeEnum.Business}
              onChange={value => {
                actions.project.inputParentPorject(value);
              }}
            />
          </FormPanel.Item>
        )}
        <FormPanel.Footer>
          <React.Fragment>
            <Button
              type="primary"
              disabled={createProject.operationState === OperationState.Performing}
              onClick={this._handleSubmit.bind(this)}
            >
              {failed ? t('重试') : t('完成')}
            </Button>
            <Button
              type="weak"
              onClick={() => {
                actions.project.clearEdition();
                router.navigate({}, route.queries);
              }}
            >
              {t('取消')}
            </Button>
            {failed ? (
              <Alert
                type="error"
                style={{ display: 'inline-block', marginLeft: '20px', marginBottom: '0px', maxWidth: '750px' }}
              >
                {getWorkflowError(createProject)}
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
    const { actions, project, projectEdition } = this.props;
    let { currentClusterIndex, isShowDialog } = this.state;
    let parentProjectSelection = projectEdition.parentProject
      ? project.list.data.records.find(item => item.metadata.name === projectEdition.parentProject)
      : null;
    let clusterName = projectEdition.clusters[currentClusterIndex].name;

    let parentResourceLimits =
      parentProjectSelection && clusterName ? parentProjectSelection.spec.clusters[clusterName].hard : {};

    return (
      <Modal visible={isShowDialog} caption={t('编辑资源限制')} onClose={() => this.setState({ isShowDialog: false })}>
        <CreateProjectResourceLimitPanel
          parentResourceLimits={parentResourceLimits}
          onCancel={() => {
            this.setState({ isShowDialog: false, currentClusterIndex: 0 });
          }}
          resourceLimits={projectEdition.clusters[currentClusterIndex].resourceLimits}
          onSubmit={requestLimits => {
            actions.project.updateClustersLimit(currentClusterIndex, requestLimits);
            this.setState({ isShowDialog: false, currentClusterIndex: 0 });
          }}
        />
      </Modal>
    );
  }
}
