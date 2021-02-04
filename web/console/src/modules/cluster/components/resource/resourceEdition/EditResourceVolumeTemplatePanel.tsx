import React, { useState, useEffect, useMemo, useImperativeHandle } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import * as classnames from 'classnames';
import { Bubble, Text, Modal, Button, Form, Select, Radio, Input, Icon, InputNumber } from '@tea/component';
import { cloneDeep, FormItem, InputField, LinkButton, useModal } from '@src/modules/common';
import { useForm, Controller } from 'react-hook-form';
import { bindActionCreators } from '@/lib/ff-redux';
import { allActions } from '../../../actions';
import { resourceConfig } from '@/config';
import * as WebAPI from '../../../WebAPI';
interface ERVTPanel {
  clusterId: string;
  namespace: string;
}
const EditResourceVolumeTemplatePanel = (props: ERVTPanel, ref) => {
  const clusterVersion = useSelector((state) => state.clusterVersion);
  const dispatch = useDispatch();
  const { actions } = bindActionCreators({ actions: allActions }, dispatch);
  const { clusterId, namespace } = props;
  const [templateVolumesMap, setTemplateVolumesMap] = useState({});
  const [editKey, setEditKey] = useState();
  const [isNeedAlertError, setIsNeedAlertError] = useState(false);
  const { isShowing, toggle } = useModal();

  /**
   * 获取相关API数据
   */
  const [storageClassList, setStorageClassList] = useState([]);
  useEffect(() => {
    const resourceInfo = resourceConfig(clusterVersion)['sc'];
    async function getStorageClass() {
      const result = await WebAPI.fetchResourceList(
          {
            filter: { namespace, clusterId },
            paging: { pageSize: 10000 }
          },
          {
            resourceInfo,
            isContinue: true
          }
      );
      const scList = result.records.map(record => {
        const name = record.metadata.name;
        return {
          text: name,
          value: name,
          tooltip: name
        };
      });
      setStorageClassList(scList);
    }

    if (clusterId && namespace && clusterVersion) {
      getStorageClass();
    }
  }, [clusterId, namespace, clusterVersion]);

  /**
   * templateVolumesMap数据变更引起的数据改变
   */
  const [canAdd, setCanAdd] = useState(false);
  useEffect(() => {
    // list为空或者有不完整数据则添加模板不能点击，否则可以
    const templateVolumesList = Object.values(templateVolumesMap);
    const tvLength = templateVolumesList.length;
    if (!tvLength) {
      setCanAdd(true);
    }
    if (tvLength) {
      let canAdd = true;
      let hasError = false;
      templateVolumesList.forEach(item => {
        const { name = '', storageClassName = '', nameErrorMsg, templateErrorMsg } = item as any;
        if (!name || !storageClassName) {
          canAdd = false;
        }

        // 是否有错误
        if (nameErrorMsg || templateErrorMsg) {
          hasError = true;
        }
      });
      setCanAdd(canAdd);
      setIsNeedAlertError(hasError);
      if (canAdd && tvLength) {
        actions.editWorkload.addVolumeTemplates(templateVolumesList);
      }
    }
  }, [JSON.stringify(templateVolumesMap)]);

  /**
   * 对父组件暴露接口
   */
  useImperativeHandle(ref, () => ({
    // 在使用 ref 时自定义暴露给父组件的实例值
    getVolumeTemplates: () => {
      const templateVolumesList = Object.values(templateVolumesMap);
      const volumeClaimTemplates = templateVolumesList.map(record => {
        return {
          metadata: {
            name: record['name']
          },
          spec: {
            accessModes: [record['accessModes']],
            storageClassName: record['storageClassName'],
            resources: {
              requests: {
                storage: record['storage'] + 'Gi'
              }
            }
          }
        };
      });
      return volumeClaimTemplates;
    },
    triggerValidation: () => {
      const templateVolumesKeys = Object.keys(templateVolumesMap);
      let isValided = true;
      const newTemplateVolumesMap = templateVolumesKeys.map(key => {
        const record = templateVolumesMap[key];
        const newRecord = cloneDeep(record);
        if (record['name'] === '') {
          newRecord.nameErrorMsg = '名称不能为空';
          isValided = false;
        }
        if (record['storageClassName'] === '') {
          newRecord.templateErrorMsg = '缺失模板信息';
          isValided = false;
        }
        return newRecord;
      });
      setTemplateVolumesMap(newTemplateVolumesMap);
      return isValided;
    }
  }));

  const { register, watch, handleSubmit, reset, control, errors, setValue } = useForm<{
    accessModes: string;
    storageClassName: string;
    storage: number;
  }>({
    mode: 'onBlur',
    defaultValues: {
      accessModes: 'ReadWriteOnce',
      storageClassName: '',
      storage: 100
    }
  });

  const onSubmit = data => {
    const { accessModes, storageClassName, storage } = data;
    const editTemplateVolume = templateVolumesMap[editKey];
    const newEditTemplateVolume = {
        ...editTemplateVolume,
        accessModes,
        storageClassName,
        storage,
        isEdit: true,
        templateErrorMsg: ''
    };
    setTemplateVolumesMap({
      ...templateVolumesMap,
      [editKey]: newEditTemplateVolume
    });
    toggle();
  };

  const templateVolumesList = Object.values(templateVolumesMap);
  return (
    <FormItem className="vm data-mod" label={t('数据卷模板（选填）')}>
      <div className="form-unit">
        {templateVolumesList.length ? (
          <div className="tc-15-table-panel" style={{ maxWidth: '730px', marginTop: '2px' }}>
            <div className="tc-15-table-fixed-body">
              <table className="tc-15-table-box tc-15-table-rowhover">
                <colgroup>
                  <col />
                  <col />
                  <col style={{ width: '13%' }} />
                </colgroup>
                <tbody>
                  {
                    templateVolumesList.map(volume => {
                      return (
                        <tr
                          key={volume['key']}
                          className={classnames('tr-hover run-docker-box')}
                          style={isNeedAlertError ? { border: '1px solid red' } : {}}
                        >
                          <td>
                            <div className="form-unit">
                              {(volume['namesErrorMsg'] || volume['templateErrorMsg']) && (
                                <div className="tc-15-bubble tc-15-bubble-bottom" style={{ marginTop: '-60px' }}>
                                  <div className="tc-15-bubble-inner">
                                    <p>{volume['namesErrorMsg']}; {volume['templateErrorMsg']}</p>
                                  </div>
                                </div>
                              )}
                              <InputField
                                type="text"
                                placeholder={t('名称')}
                                tipMode="popup"
                                validator={
                                  volume['nameErrorMsg']
                                    ? { status: 2, message: volume['nameErrorMsg'] }
                                    : { status: 1, message: '' }
                                }
                                value={volume['name']}
                                onBlur={value => {
                                  // 错误判断
                                  let nameErrorMsg = '';
                                  if (!value) {
                                    nameErrorMsg = '名称不能为空';
                                  }
                                  templateVolumesList.forEach(item => {
                                    if (item['name'] === value) {
                                      nameErrorMsg = '名称不能重复';
                                    }
                                  });

                                  // 设置对应数据条目
                                  const editKey = volume['key'];
                                  const editTemplateVolume = templateVolumesMap[editKey];
                                  const newEditTemplateVolume = {
                                    ...editTemplateVolume,
                                    name: value,
                                    nameErrorMsg
                                  };
                                  setTemplateVolumesMap({
                                    ...templateVolumesMap,
                                    [editKey]: newEditTemplateVolume
                                  });
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="form-unit">
                              <Bubble
                                placement="bottom"
                                content={
                                  volume['storageClassName'] ? (
                                    <React.Fragment>
                                      <p>{t('访问模式：') + volume['accessModes']}</p>
                                      <p>{t('StorageClass名称：') + volume['storageClassName']}</p>
                                      <p>{t('资源限制：') + volume['storage'] + 'GB'}</p>
                                    </React.Fragment>
                                  ) : null
                                }
                              >
                                {volume['accessModes'] ? (
                                  <div style={{ display: 'inline-block' }}>
                                    <Text theme="text" verticalAlign="middle">
                                      {t('模板配置')}
                                    </Text>
                                    <i className="plaint-icon" style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                  </div>
                                ) : (
                                  <Text theme="text" verticalAlign="middle">
                                    {t('暂未设置模板配置')}
                                  </Text>
                                )}
                              </Bubble>
                              <a
                                href="javascript:;"
                                onClick={() => {
                                  const editKey = volume['key'];
                                  setEditKey(editKey);
                                  const { accessModes, storageClassName, storage } = templateVolumesMap[editKey];
                                  if (storageClassName) {
                                    reset({
                                      accessModes,
                                      storageClassName,
                                      storage
                                    });
                                  } else {
                                    reset({
                                      accessModes: 'ReadWriteOnce',
                                      storageClassName,
                                      storage: 100
                                    });
                                  }
                                  toggle();
                                }}
                              >
                                <Trans>选择配置项</Trans>
                              </a>
                            </div>
                          </td>
                          <td>
                            <LinkButton
                              tip={t('删除')}
                              onClick={() => {
                                delete templateVolumesMap[volume['key']];
                                setTemplateVolumesMap(templateVolumesMap);
                              }}
                            >
                              <i className="icon-cancel-icon" />
                            </LinkButton>
                          </td>
                        </tr>
                      );
                    }
                  )
                }
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <noscript />
          )}
      </div>
      <LinkButton
        disabled={!canAdd}
        tip=""
        errorTip={t('请先完成待编辑项')}
        onClick={() => {
          const key = new Date().getTime();
          setTemplateVolumesMap({
            ...templateVolumesMap,
            [key]: {
              key,
              name: '',
              accessModes: '',
              storageClassName: '',
              storage: '',
              isEdit: false,
              nameErrorMsg: '',
              templateErrorMsg: ''
            }
          });
        }}
      >
        {t('添加模板')}
      </LinkButton>
      <p className="text-label">
        <span style={{ verticalAlign: '-1px' }}>
          {t(
              '为 StatefulSet、TApp 类型的 Workload 提供 PVC 对象的模板。详细介绍请参考'
          )}
          <a href="https://iwiki.woa.com/pages/viewpage.action?pageId=554592121" target="_blank">
            指引
          </a>
          {t(
              '。'
          )}
        </span>
      </p>
      <Modal visible={isShowing} caption="设置VolumeClaimTemplate" onClose={() => toggle()}>
        <Modal.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Form>
              <Form.Item
                label={
                  <span>
                    <span style={{ marginRight: '5px' }}><Trans>访问模式</Trans></span>
                    <Bubble
                      content="CBS 只能使用被一个Pod读写模式"
                  >
                      <Icon type="info" />
                    </Bubble>
                  </span>
                }
                required
                showStatusIcon={false}
              >
                <Controller
                  as={
                    <Radio.Group>
                      <Radio name="ReadWriteOnce">被一个Pod读写</Radio>
                      {/*<Radio name="ReadOnlyMany">被多个Pod只读</Radio>*/}
                      {/*<Radio name="ReadWriteMany">被多个Pod读写</Radio>*/}
                    </Radio.Group>
                  }
                  name="accessModes"
                  control={control}
                />
              </Form.Item>
              <Form.Item
                required
                label={t('StorageClass名称')}
                showStatusIcon={false}
                status={errors.storageClassName ? 'error' : 'success'}
              >
                <Controller
                  as={
                    <Select
                      searchable
                      boxSizeSync
                      size="m"
                      type="simulate"
                      appearence="button"
                      options={storageClassList}
                    />
                  }
                  rules={{ required: t('无选中StorageClass') }}
                  name="storageClassName"
                  control={control}
                />
              </Form.Item>
              <Form.Item
                required
                label={
                  <span>
                    <span style={{ marginRight: '5px' }}><Trans>资源限制</Trans></span>
                    <Bubble
                      content="数据卷大小"
                    >
                      <Icon type="info" />
                    </Bubble>
                  </span>
                }
                showStatusIcon={false}
                status={errors.storage ? 'error' : 'success'}
                message={errors.storage && errors.storage.message}
              >
                <Controller
                  as={<InputNumber step={1} min={100} unit="GB" />}
                  name="storage"
                  size="s"
                  control={control}
                />
              </Form.Item>
            </Form>
            <Form.Action style={{ textAlign: 'center' }}>
              <Button htmlType="submit" type="primary"><Trans>保存</Trans></Button>
              <Button htmlType="button" onClick={() => toggle()}><Trans>取消</Trans></Button>
            </Form.Action>
          </form>
        </Modal.Body>
      </Modal>
    </FormItem>
  );
};
export default EditResourceVolumeTemplatePanel;
