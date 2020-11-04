/**
 * 业务侧应用管理中namespace的创建及修改页面
 */
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { bindActionCreators, insertCSS, uuid } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Affix, Button, Card, Form, Input, Layout, Modal, Select, Text } from '@tencent/tea-component';
import { useModal, isEmpty, cloneDeep } from '@src/modules/common/utils';
import { allActions } from '../../../../actions';
import { createNamespace, editNamespace, fetchClusterList, fetchProjectById, fetchNamespaceByMetaName } from '../../../../WebAPI';
import { FormPanel } from '@tencent/ff-component/src';
import {
  initProjectResourceLimit,
  resourceLimitTypeToText,
  resourceTypeToUnit
} from '@src/modules/project/constants/Config';
import { CmdbInfo, DefaultBusinessInfo } from './CmdbInfo';
import { SharedClusterCmdbInfo } from './SharedClusterCmdbInfo';
import { router } from '@src/modules/cluster/router';
import { K8SUNIT, valueLabels1000, valueLabels1024 } from '@helper/k8sUnitUtil';
import { TipInfo, CreateProjectResourceLimitPanel } from '../../../../../common/components';
import { AreaMap } from '@src/modules/cluster/constants/Config';
import { _reduceProjectLimit } from '../../../../utils';

const { useState, useEffect, useRef, forwardRef, useMemo } = React;
const { Header, Body, Content } = Layout;
const NewCmdbInfo = forwardRef(CmdbInfo);
const NewSharedClusterCmdbInfo = forwardRef(SharedClusterCmdbInfo);
insertCSS(
    'ClusterEditBusinessNamespacePanelCSS',
    `
    .cluster-business-namespace .tea-form__controls {
      font-size: 12px;
    }
  `
);
declare const WEBPACK_CONFIG_SHARED_CLUSTER: boolean;
const MODIFY = 'modify-namespace';
export const EditBusinessNamespacePanel = () => {
  const state = useSelector(state => state);
  const dispatch = useDispatch();
  const { actions } = bindActionCreators({ actions: allActions }, dispatch);
  const { projectList, projectSelection, subRoot, route } = state;
  const selection = subRoot.resourceOption.ffResourceList.selection;
  const selectResource = selection ? selection.originalDataBak : null;

  /**
   * 页面滚动逻辑
   */
  const bottomAffixRef = useRef(null);
  useEffect(() => {
    const body = document.querySelector('.tea-web-body');
    if (!body) {
      return () => null;
    }
    const handleScroll = () => {
      bottomAffixRef.current.update();
    };
    body.addEventListener('scroll', handleScroll);
    return () => body.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * 获取选中业务，处理选中业务包含的集群列表数据
   */
  const [selectedProject, setSelectedProject] = useState(null);
  const [clusterList, setClusterList] = useState([]);
  useEffect(() => {
    async function getData() {
      // 获取选中的业务
      const project = await fetchProjectById(projectSelection);
      setSelectedProject(project);

      // 过滤出选中业务包含的cluster列表，并处理成Select组件可以使用的数据
      const clusterList = await fetchClusterList({ search: '' });
      let projectClusterList = [];
      if (WEBPACK_CONFIG_SHARED_CLUSTER) {
        const myProjectClusterList = new Set();
        const { zones = {}} = project.spec;
        zones.forEach(zone => {
          myProjectClusterList.add(zone.clusterName);
        });
        projectClusterList = Array.from(myProjectClusterList);
      } else {
        const { clusters = {}} = project.spec;
        projectClusterList = Object.keys(clusters);
      }
      // let projectClusterList = project.spec.clusters ? Object.keys(project.spec.clusters) : [];
      clusterList.records = clusterList.records.filter(
          item => projectClusterList.indexOf(item.metadata.name + '') !== -1
      );
      const newClusterList = clusterList.records.map(cluster => ({
        ...cluster,
        text: `${cluster.metadata.name}(${cluster.spec.displayName})`,
        value: cluster.metadata.name
      }));
      setClusterList(newClusterList);
    }

    if (projectSelection) {
      getData();
    }
  }, [projectSelection]);

  /**
   * 展示数据
   */
  const showProjectData = useMemo(() => {
    let data = {
      businessText: '',
      shareClusterBusinessText: '',
      defaultData: {
        department: '',
        business1: '',
        business2: '',
        business2Id: ''
      },
      clusterZoneMap: {}
    };
    if (!isEmpty(selectedProject)) {
      const { metadata = {}, spec = {}} = selectedProject;
      const { annotations = {}, labels = {}} = metadata;

      // 基本数据
      const { displayName = '-', zones = [] } = spec;
      const department = annotations['teg.tkex.oa.com/department'];
      const business1 = annotations['teg.tkex.oa.com/business1'];
      const business2 = annotations['teg.tkex.oa.com/business2'];
      const business2Id = labels['teg.tkex.oa.com/business2-id'];

      // 本组件元素使用数据
      const businessText = `${projectSelection}(${displayName})`;
      const shareClusterBusinessText = `${projectSelection}（ ${displayName}: ${department} - ${business1} - ${business2} ）`;
      const clusterZoneMap = {};
      zones.forEach(item => {
        // zone的格式为：ap-nanjing-1
        const { zone, clusterName } = item;
        const [prefix, area, number] = zone.split('-');
        const zoneList = clusterZoneMap[clusterName] ? clusterZoneMap[clusterName] : [];
        zoneList.push({
          value: zone,
          text: AreaMap[area] ? AreaMap[area].text + number + '区' : ''
        });
        clusterZoneMap[clusterName] = zoneList;
      });

      // 调用组件使用数据
      const defaultData = {
        department,
        business1,
        business2,
        business2Id
      };
      data = {
        businessText,
        shareClusterBusinessText,
        defaultData,
        clusterZoneMap
      };
    }
    return data;
  }, [selectedProject]);

  const showResourceData = useMemo(() => {
    let data = {
      selectedZone: '',
      selectedModuleId: ''
    };
    let selectedZoneText = '';
    if (WEBPACK_CONFIG_SHARED_CLUSTER && !isEmpty(selectResource)) {
      const { metadata = {}} = selectResource;
      const { labels = {}} = metadata;
      Object.keys(labels).forEach(key => {
        if (key.indexOf('zone.teg.tkex.oa.com') !== -1) {
          // key 的案例：zone.teg.tkex.oa.com/ap-nanjing-1
          const zone = key.split('/')[1];
          const [prefix, area, number] = zone.split('-');
          selectedZoneText = AreaMap[area] ? AreaMap[area].text + number + '区' : '';
        }
      });
      data = {
        selectedZone: selectedZoneText,
        selectedModuleId: labels['teg.tkex.oa.com/default-module-id']
      };
    }
    return data;
  }, [selectResource, WEBPACK_CONFIG_SHARED_CLUSTER]);

  /**
   * 资源限制部分的数据处理
   */
  const { mode } = router.resolve(route);
  const [editRequestLimits, setEditRequestLimits] = useState([]);
  useEffect(() => {
    actions.mode.changeMode(mode);
    if (mode === MODIFY) {
      const requestLimits = selectResource.spec.hard
          ? Object.keys(selectResource.spec.hard).map(key => {
            let value = selectResource.spec.hard[key];
            /**CPU类 */
            if (resourceTypeToUnit[key] === '核' || resourceTypeToUnit[key] === '个') {
              value = parseFloat(valueLabels1000(value, K8SUNIT.unit)) + '';
            } else if (resourceTypeToUnit[key] === 'MiB') {
              value = parseFloat(valueLabels1024(value, K8SUNIT.Mi)) + '';
            }
            /**个数不需要转化 */
            return Object.assign({}, initProjectResourceLimit, { type: key, id: uuid(), value });
          })
          : [];
      setEditRequestLimits(requestLimits);
    }
  }, [mode]);

  /**
   * 获取业务信息（CMDB）的初始数据。
   */
  const defaultBusinessInfo: DefaultBusinessInfo = useMemo(() => {
    if (!selectResource) {
      return;
    }
    const labels = selectResource.metadata && selectResource.metadata.labels;
    if (!labels || !labels.cmdb) {
      return;
    }

    const cmdb = true;
    const annotations = selectResource.metadata.annotations;
    const department = annotations['cmdb.io/depName'];
    const [bsiPath1 = undefined, bsiPath2 = undefined, bsiPath3 = undefined] = annotations['cmdb.io/bsiPathIds']
        ? annotations['cmdb.io/bsiPathIds'].split(' - ')
        : [];
    const operator = annotations['cmdb.io/operator'];
    const bakOperator = annotations['cmdb.io/bakOperator'] ? annotations['cmdb.io/bakOperator'].split(',') : undefined;
    const all = labels['cmdb.all'] ? true : false;
    return JSON.parse(
      JSON.stringify({
        cmdb,
        department,
        bsiPath1: bsiPath1 ? Number(bsiPath1) : undefined,
        bsiPath2: bsiPath2 ? Number(bsiPath2) : undefined,
        bsiPath3: bsiPath3 ? Number(bsiPath3) : undefined,
        operator,
        bakOperator,
        all
      })
    );
  }, [selectResource]);

  const { register, watch, handleSubmit, reset, control, errors } = useForm({
    mode: 'onBlur'
  });
  const { clusterName, zone } = watch();

  /** 资源限制 数据处理*/
  const [initResourceLimits, setInitResourceLimits] = useState({});
  useEffect(() => {
    let hard = {};
    if (!isEmpty(selectedProject)) {
      if (WEBPACK_CONFIG_SHARED_CLUSTER) {
        const { zones = [] } = selectedProject.spec;
        const zoneObj = zones.filter(item => item.zone === zone);
        hard = zoneObj.hard;
      } else if (clusterName) {
        const { clusters = {}} = selectedProject.spec;
        const { hard: clusterHard = {}} = clusters[clusterName];
        hard = clusterHard;
      }
    }
    setInitResourceLimits(hard);
  }, [clusterName, zone, selectedProject]);

  const isLimitResourceDisabled = useMemo(() => {
    if (WEBPACK_CONFIG_SHARED_CLUSTER) {
      return (!clusterName || !zone) && mode !== MODIFY;
    } else {
      return !clusterName && mode !== MODIFY;
    }
  }, [clusterName, zone]);

  const [isDisabled, setDisabled] = useState(false);
  const [editResult, setEditResult] = useState(null);
  const myCMDBComponentRef = useRef();
  const mySharedClusterCMDBRef = useRef();
  const onSubmit = async (data, e) => {
    const { namespaceName, clusterName } = data;
    const hard = _reduceProjectLimit(editRequestLimits);
    const spec = {
      clusterName,
      namespace: namespaceName,
      projectName: projectSelection,
      hard,
    };
    setDisabled(true);
    let namespaceChangeResult = null;
    if (WEBPACK_CONFIG_SHARED_CLUSTER) {
      const { current } = mySharedClusterCMDBRef;
      // @ts-ignore
      const { moduleName, moduleId } = current.getSharedClusterCmdbData();
      if (mode !== MODIFY) { // 创建
        const { metadata = {}} = selectedProject;
        const { annotations = {}, labels = {}} = metadata;
        const newAnnotations = { ...annotations, 'teg.tkex.oa.com/default-module': moduleName };
        const newLabels = { ...labels, 'teg.tkex.oa.com/default-module-id': moduleId.toString() };
        const { zone } = data;
        const [prefix, area, number] = zone.split('-');
        newLabels['teg.tkex.oa.com/region'] = `${prefix}-${area}`;
        newLabels['zone.teg.tkex.oa.com/' + zone] = '';
        const newMetadata = {
          labels: newLabels,
          annotations: newAnnotations
        };
        const namespaceInfo = {
          spec,
          metadata: newMetadata,
        };

        namespaceChangeResult = await createNamespace({
          projectId: projectSelection,
          namespaceInfo,
        });
      } else {
        const neweastSelectedNamespace = await fetchNamespaceByMetaName({
          projectId: projectSelection,
          namespaceName: selectResource.metadata.name
        });
        const neweastNamespaceClone = cloneDeep(neweastSelectedNamespace);
        neweastNamespaceClone.spec.hard = hard;
        neweastNamespaceClone.spec.projectName = projectSelection;
        neweastNamespaceClone.metadata.annotations['teg.tkex.oa.com/default-module'] = moduleName;
        neweastNamespaceClone.metadata.labels['teg.tkex.oa.com/default-module-id'] = String(moduleId);
        namespaceChangeResult = await editNamespace({
          projectId: projectSelection,
          newNamespace: neweastNamespaceClone,
        });
      }
    } else {
      const { current } = myCMDBComponentRef;
      // @ts-ignore
      const { cmdb, department, departmentId, bsiPath, bsiPathIds, operator, bakOperator, all } = current.getCMDBData();
      const metadata = {};
      const annotations = {};
      if (cmdb) {
        metadata['labels'] = { cmdb: 'true' };
        if (all) {
          metadata['labels']['cmdb.all'] = 'true';
        }
        if (department) {
          annotations['cmdb.io/depName'] = department;
        }
        if (departmentId) {
          annotations['cmdb.io/depId'] = departmentId ? String(departmentId) : undefined;
        }
        if (bsiPath) {
          annotations['cmdb.io/bsiPath'] = bsiPath;
        }
        if (bsiPathIds) {
          annotations['cmdb.io/bsiPathIds'] = bsiPathIds;
        }
        if (operator) {
          annotations['cmdb.io/operator'] = operator;
        }
        if (bakOperator) {
          annotations['cmdb.io/bakOperator'] = bakOperator.join(',');
        }
        if (JSON.stringify(annotations) !== '{}') {
          metadata['annotations'] = annotations;
        }
      }

      const namespaceInfo = {
        spec,
        metadata,
      };

      if (mode === MODIFY) {
        const neweastSelectedNamespace = await fetchNamespaceByMetaName({
          projectId: projectSelection,
          namespaceName: selectResource.metadata.name
        });
        const neweastNamespaceClone = cloneDeep(neweastSelectedNamespace);
        neweastNamespaceClone.spec.hard = hard;
        neweastNamespaceClone.spec.projectName = projectSelection;

        if (cmdb) {
          if (neweastNamespaceClone.metadata.labels) {
            neweastNamespaceClone.metadata.labels.cmdb = 'true';
            if (all) {
              neweastNamespaceClone.metadata.labels['cmdb.all'] = 'true';
            } else {
              delete neweastNamespaceClone.metadata.labels['cmdb.all'];
            }
          } else {
            neweastNamespaceClone.metadata.labels = {
              cmdb: 'true'
            };
            if (all) {
              neweastNamespaceClone.metadata.labels['cmdb.all'] = 'true';
            }
          }
          neweastNamespaceClone.metadata.annotations = annotations;
        } else {
          if (neweastNamespaceClone.metadata.labels) {
            delete neweastNamespaceClone.metadata.labels.cmdb;
            delete neweastNamespaceClone.metadata.labels['cmdb.all'];
          }
          delete neweastNamespaceClone.metadata.annotations;
        }
        namespaceChangeResult = await editNamespace({
          projectId: projectSelection,
          newNamespace: neweastNamespaceClone,
        });
      } else {
        namespaceChangeResult = await createNamespace({
          projectId: projectSelection,
          namespaceInfo
        });
      }
    }
    setDisabled(false);
    setEditResult(namespaceChangeResult);
    if (namespaceChangeResult) {
      const urlParams = router.resolve(route);
      const queries = route.queries;
      delete queries.resourceIns;
      router.navigate({ ...urlParams, mode: 'list' }, { ...queries });
    }
  };

  const affixStyle = { borderTop: '1px solid #dbe3e4', boxShadow: '0 2px 3px 0 rgba(0,0,0,.2)' };
  const bottomButtonStyle = { marginLeft: 5 };
  const { isShowing, toggle } = useModal(false);
  return (
    <Content.Body full>
      <Card>
        <Card.Body>
          <form className="cluster-business-namespace">
            <Form>
              <Form.Item
                required
                label={t('名称')}
                showStatusIcon={false}
                status={errors.namespaceName ? 'error' : 'success'}
                message={
                      errors.namespaceName
                          ? errors.namespaceName.message
                          : t(
                          '最长48个字符，只能包含小写字母、数字及分隔符("-")，且必须以小写字母开头，数字或小写字母结尾，名称不能以"kube-"开头'
                          )
                    }
                >
                {mode === MODIFY ? (
                      selectResource.spec.namespace
                  ) : (
                    <Controller
                      as={<Input placeholder={t('请输入名称')} />}
                      name="namespaceName"
                      control={control}
                      rules={{
                            required: t('Namespace名称不能为空'),
                            maxLength: {
                              value: 48,
                              message: 'Namespace名称不能超过48个字符'
                            },
                            pattern: {
                              value: /^[a-z]([-a-z0-9]*[a-z0-9])?$/,
                              message: 'Namespace名称格式不正确'
                            },
                            validate: value => !value.startsWith('kube-') || 'Namespace不能以kube-开头'
                          }}
                    />
                  )}
              </Form.Item>
              <Form.Item label="业务" showStatusIcon={false}>
                <Text style={{ fontSize: 12 }}>
                  {
                    WEBPACK_CONFIG_SHARED_CLUSTER ? showProjectData.shareClusterBusinessText : showProjectData.businessText
                  }
                </Text>
              </Form.Item>
              <Form.Item
                required
                label="集群"
                showStatusIcon={false}
                status={errors.clusterName ? 'error' : 'success'}
                message={errors.clusterName && errors.clusterName.message}
                >
                {mode === MODIFY ? (
                      `${selectResource.spec.clusterName}(${selectResource.spec.clusterDisplayName})`
                  ) : (
                    <Controller
                      as={
                        <Select
                          searchable
                          boxSizeSync
                          size="m"
                          type="simulate"
                          appearence="button"
                          options={clusterList}
                        />
                      }
                      name="clusterName"
                      control={control}
                      rules={{ required: t('集群不能为空') }}
                    />
                  )}
              </Form.Item>
              {
                WEBPACK_CONFIG_SHARED_CLUSTER && (
                  <Form.Item
                    required
                    label="可用区"
                    showStatusIcon={false}
                    status={errors.zone ? 'error' : 'success'}
                    message={errors.zone && errors.zone.message}
                  >
                    {mode === MODIFY ? showResourceData.selectedZone : (
                      <Controller
                        as={
                          <Select
                            searchable
                            boxSizeSync
                            size="m"
                            type="simulate"
                            appearence="button"
                            options={clusterName ? showProjectData.clusterZoneMap[clusterName] : []}
                          />
                        }
                        name="zone"
                        control={control}
                        rules={{ required: t('可用区不能为空') }}
                      />
                    )}
                  </Form.Item>
                )
              }
              <Form.Item label="资源限制" showStatusIcon={false}>
                {editRequestLimits.map((item, index) => (
                  <FormPanel.Text key={index}>{`${resourceLimitTypeToText[item.type]}:${item.value}${
                          resourceTypeToUnit[item.type]
                      }`}</FormPanel.Text>
                  ))}
                <Button
                  type="icon"
                  htmlType="button"
                  disabled={isLimitResourceDisabled}
                  icon="pencil"
                  onClick={e => {
                        toggle();
                      }}
                />
              </Form.Item>
              {
                WEBPACK_CONFIG_SHARED_CLUSTER ? (
                  <Form.Item label={t('CMDB默认业务模块')}>
                    <NewSharedClusterCmdbInfo
                      ref={mySharedClusterCMDBRef}
                      initialData={{ ...showProjectData.defaultData, selectedModuleId: mode === MODIFY ? Number(showResourceData.selectedModuleId) : undefined }}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label={t('业务信息')}>
                    <NewCmdbInfo
                      ref={myCMDBComponentRef}
                      defaultBusinessInfo={defaultBusinessInfo}
                      hasPod={true}
                      isModify={mode === MODIFY ? true : false}
                    />
                  </Form.Item>
                )
              }
            </Form>
          </form>
          <div id="CMDB-part-id"></div>
        </Card.Body>
      </Card>
      <Affix
        ref={bottomAffixRef}
        offsetBottom={0}
        target={() => document.querySelector('.affix-target')}
        style={affixStyle}
        >
        <Card>
          <Card.Body>
            <Button type="primary" htmlType="submit" disabled={isDisabled} onClick={handleSubmit(onSubmit)}>
              {editResult && editResult.error ? t('重试') : mode === MODIFY ? t('修改Namespace') : t('创建Namespace')}
            </Button>
            <Button
              style={bottomButtonStyle}
              onClick={() => {
                    history.back();
                  }}
              >
              {t('取消')}
            </Button>
            <TipInfo isShow={editResult && editResult.error} type="error" isForm>
              {editResult && editResult.msg}
            </TipInfo>
          </Card.Body>
        </Card>
      </Affix>
      <Modal
        visible={isShowing}
        caption={t('编辑资源限制')}
        onClose={() => {
              toggle();
            }}
        >
        <CreateProjectResourceLimitPanel
          parentResourceLimits={initResourceLimits}
          onCancel={() => {
                toggle();
              }}
          resourceLimits={editRequestLimits}
          onSubmit={requestLimits => {
                setEditRequestLimits(requestLimits);
                toggle();
              }}
        />
      </Modal>
    </Content.Body>
  );
};
