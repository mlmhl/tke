/**
 * 北极星创建
 */
import React, { useState, useEffect, useMemo } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import {
  Button,
  Form,
  Modal
} from '@tencent/tea-component';
import { useForm, Controller } from 'react-hook-form';
import { insertCSS, uuid } from '@tencent/ff-redux/libs/qcloud-lib';
import { KeyValueMap } from '../../common/models';
import BaseForm from '@src/modules/polaris/features/polarisEditor/BaseForm';
import PolarisParamsForm from '@src/modules/polaris/features/polarisEditor/PolarisParamsForm';
import ContainerParamsForm from '@src/modules/polaris/features/polarisEditor/ContainerParamsForm';
import { createPolaris } from '@src/modules/polaris/api';
import { router } from '@src/modules/polaris/router';

/**
 * 组件样式
 */
insertCSS(
    'polaris-feature-editor-panel',
    `
      .polaris-edit-strategy-ul { margin-bottom : 10px; }
      .polaris-edit-strategy-li + .polaris-edit-strategy-li { margin-top: 5px; }
    `
);

interface PolarisEditorModal {
  isPlatform: boolean;
  clusterId: string;
  projectId: string;
  namespaceId: string;
  clusterSelectOptions: KeyValueMap[];
  projectSelectOptions: KeyValueMap[];
  triggerRefresh: () => void;
}
const PolarisEditor = React.memo((props: PolarisEditorModal) => {
  const {
    isPlatform,
    clusterId,
    projectId,
    namespaceId,
    clusterSelectOptions,
    projectSelectOptions,
    triggerRefresh
  } = props;

  /**
   * 表单初始化
   */
  const { register, watch, handleSubmit, reset, control, errors, setValue } = useForm<{
    podChoice: string;
    resourceType: string;
    resource: string;
    excludePodNames?: any;
    includePodNames?: any;
    ports: any;
  }>({
    mode: 'onTouched',
    shouldUnregister: false,
    defaultValues: {
      base: {},
      polarisParams: {},
      containerParams: {}
    }
  });

  /**
   * 表单提交数据处理
   * @param data
   */
  const onSubmit = async data => {
    const { base, polarisParams, containerParams } = data;
    const [ifBaseVerified, ifPolarisVerified, ifContainerVerified] = await Promise.all([base.trigger(), polarisParams.trigger(), containerParams.trigger()]);
    if (ifBaseVerified === false || ifPolarisVerified === false || ifContainerVerified === false) {
      return false;
    }
    const { ruleName } = base;
    const { polarisNamespace, serviceName, token, weight, protocol, version, metadata = [], isolate, healthy, enableHealthCheck, healthCheckType = '', healthCheckTTL = '' } = polarisParams;
    const { cluster, project, namespace, podChoice, resourceType, resource, ports, excludePodNames = [], includePodNames = [], labels, selectedNamespaceId } = containerParams;
    let newMetadata = {};
    metadata.forEach(item => {
      const { key, value } = item;
      newMetadata[key] = value;
    });

    // parameters
    let parameters = {
      weight: weight.toString(),
      protocol,
      version,
      metadata: JSON.stringify(newMetadata),
      isolate: isolate.toString(),
      healthy: healthy.toString(),
      enableHealthCheck: enableHealthCheck.toString()
    };
    if (enableHealthCheck) {
      parameters['healthCheckType'] = '1';
      parameters['healthCheckTTL'] = healthCheckTTL.toString();
    }

    // pods
    let pods = {
      ports
    };
    let selector = {};
    Object.keys(labels).forEach(item => {
      selector[item] = labels[item];
    });
    if (podChoice === 'byLabel') {
      pods['byLabel'] = {
        selector,
        except: excludePodNames.map(item => item.name)
      };
    } else {
      pods['byName'] = includePodNames.map(item => item.name);
    }

    const polarisData = {
      apiVersion: 'lbcf.tkestack.io/v1',
      kind: 'Bind',
      metadata: {
        labels: {
          'type.bind': 'polaris'
        },
        name: 'polaris-' + ruleName,
        namespace: selectedNamespaceId,
      },
      spec: {
        loadBalancers: [
          {
            driver: 'lbcf-polaris-driver',
            name: ruleName,
            spec: {
              namespace: polarisNamespace,
              service: serviceName,
              token
            }
          }
        ],
        parameters,
        pods
      }
    };

    console.log('submit namespace, cluster ,polarisData:', namespace, cluster, polarisData);
    async function addPolaris() {
      const addPolarisResult = await createPolaris({
        namespaceId: selectedNamespaceId,
        clusterId: cluster || clusterId,
        polarisData
      });
      if (addPolarisResult) {
        router.navigate({ mode: '' });
        triggerRefresh();
      }
    }
    addPolaris();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        render={(
                  { onChange, onBlur, value, name },
                  { invalid, isTouched, isDirty }
              ) => {
                return (
                  <BaseForm
                    onChange={onChange}
                  />
                );
              }}
        control={control}
        name="base"
      />
      <hr />
      <Form.Title>北极星参数</Form.Title>
      <Controller
        render={(
                  { onChange, onBlur, value, name },
                  { invalid, isTouched, isDirty }
              ) => {
                return (
                  <PolarisParamsForm
                    onChange={onChange}
                  />
                );
              }}
        control={control}
        name="polarisParams"
      />
      <hr />
      <Form.Title>容器参数</Form.Title>
      <Controller
        render={(
                  { onChange, onBlur, value, name },
                  { invalid, isTouched, isDirty }
              ) => {
                return (
                  <ContainerParamsForm
                    onChange={onChange}
                    value={{
                          isPlatform,
                          clusterId,
                          projectId,
                          namespaceId,
                          clusterSelectOptions,
                          projectSelectOptions
                        }}
                  />
                );
              }}
        control={control}
        name="containerParams"
      />
      <Form.Action style={{ textAlign: 'center' }}>
        <Button htmlType="submit" type="primary"><Trans>保存</Trans></Button>
        <Button htmlType="button" onClick={() => history.back()}><Trans>取消</Trans></Button>
      </Form.Action>
    </form>
  );
});

export default PolarisEditor;
