/**
 * 业务侧应用管理中namespace的创建及修改页面
 */
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, useForm } from 'react-hook-form';
import { bindActionCreators, insertCSS, uuid } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Affix, Button, Card, Form, Input, Layout, Modal, Select, Text } from '@tencent/tea-component';
import { useModal } from '../../../../common/utils';
import { allActions } from '../../../actions';
import { editNamespace, fetchClusterList, fetchProjectById, fetchNamespaceByMetaName } from '../../../WebAPI';
// import { CreateProjectResourceLimitPanel } from './CreateProjectResourceLimitPanel';
import { FormPanel } from '@tencent/ff-component/src';
import {
  initProjectResourceLimit,
  resourceLimitTypeToText,
  resourceTypeToUnit
} from '@src/modules/project/constants/Config';
import { EditResourceBusinessInfo, DefaultBusinessInfo } from './EditResourceBusinessInfo';
import { router } from '@src/modules/cluster/router';
import { K8SUNIT, valueLabels1000, valueLabels1024 } from '@helper/k8sUnitUtil';
import { TipInfo, CreateProjectResourceLimitPanel } from '../../../../common/components';
const { useState, useEffect, useRef, forwardRef, useMemo } = React;
const { Header, Body, Content } = Layout;
const NewEditResourceBusinessInfo = forwardRef(EditResourceBusinessInfo);
insertCSS(
  'ClusterEditBusinessNamespacePanelCSS',
  `
    .cluster-business-namespace .tea-form__controls {
      font-size: 12px;
    }
  `
);
const MODIFY = 'modify-namespace';
export const EditBusinessNamespacePanel = () => {
  const state = useSelector(state => state);
  const dispatch = useDispatch();
  const { actions } = bindActionCreators({ actions: allActions }, dispatch);
  const { projectList, projectSelection, subRoot, route } = state;
  const selection = subRoot.resourceOption.ffResourceList.selection;
  const selectResource = selection ? selection.originalDataBak : null;

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
      const projectClusterList = project.spec.clusters ? Object.keys(project.spec.clusters) : [];
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
    return JSON.parse(
      JSON.stringify({
        cmdb,
        department,
        bsiPath1: bsiPath1 ? Number(bsiPath1) : undefined,
        bsiPath2: bsiPath2 ? Number(bsiPath2) : undefined,
        bsiPath3: bsiPath3 ? Number(bsiPath3) : undefined,
        operator,
        bakOperator
      })
    );
  }, [selectResource]);

  const { register, watch, handleSubmit, reset, control, errors } = useForm({
    mode: 'onBlur'
  });
  const clusterName = watch('clusterName');

  // 下边可以用useMemo处理下，这里每当成复杂运算所以懒得处理啦
  const initResourceLimits = selectedProject && clusterName ? selectedProject.spec.clusters[clusterName].hard : {};
  const [isDisabled, setDisabled] = useState(false);
  const [editResult, setEditResult] = useState(null);
  const onSubmit = async (data, e) => {
    setDisabled(true);
    const { current } = myCMDBComponentRef;
    // @ts-ignore
    const { cmdb, department, departmentId, bsiPath, bsiPathIds, operator, bakOperator } = current.getCMDBData();
    const namespaceInfo = {
      ...data,
      projectId: projectSelection,
      cmdb,
      department,
      departmentId,
      bsiPath,
      bsiPathIds,
      operator,
      bakOperator,
      resourceLimits: editRequestLimits
    };
    let namespaceChangeResult = null;
    if (mode === MODIFY) {
      namespaceInfo.namespaceName = selectResource.spec.namespace;
      namespaceInfo.clusterName = selectResource.spec.clusterName;
      const neweastSelectedNamespace = await fetchNamespaceByMetaName({
        projectId: projectSelection,
        namespaceName: selectResource.metadata.name
      });
      namespaceChangeResult = await editNamespace({
        namespaces: namespaceInfo,
        selectedNamespace: neweastSelectedNamespace
      });
    } else {
      namespaceChangeResult = await editNamespace({ namespaces: namespaceInfo });
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
  const myCMDBComponentRef = useRef();
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
                  {projectSelection}({selectedProject && selectedProject.spec.displayName})
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
              <Form.Item label="资源限制" showStatusIcon={false}>
                {editRequestLimits.map((item, index) => (
                  <FormPanel.Text key={index}>{`${resourceLimitTypeToText[item.type]}:${item.value}${
                    resourceTypeToUnit[item.type]
                  }`}</FormPanel.Text>
                ))}
                <Button
                  type="icon"
                  htmlType="button"
                  disabled={!clusterName && mode !== MODIFY}
                  icon="pencil"
                  onClick={e => {
                    toggle();
                  }}
                ></Button>
              </Form.Item>
              <Form.Item label={t('业务信息')}>
                <NewEditResourceBusinessInfo ref={myCMDBComponentRef} defaultBusinessInfo={defaultBusinessInfo} />
              </Form.Item>
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
          }}
        />
      </Modal>
    </Content.Body>
  );
};
