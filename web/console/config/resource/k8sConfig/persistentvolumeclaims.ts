import { DetailField, DisplayField, DetailInfo } from '../../../src/modules/common/models';
import { defaulNotExistedValue, dataFormatConfig, immutableActionField, generateResourceInfo } from '../common';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

const displayField: DisplayField = {
  name: {
    dataField: ['metadata.name'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: t('名称'),
    noExsitedValue: defaulNotExistedValue,
    isLink: true,
    isClip: true
  },
  status: {
    dataField: ['status.phase'],
    dataFormat: dataFormatConfig['status'],
    width: '10%',
    headTitle: t('状态'),
    noExsitedValue: defaulNotExistedValue
  },
  capacity: {
    dataField: ['status.capacity.storage'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: 'Storage',
    noExsitedValue: defaulNotExistedValue
  },
  accessModes: {
    dataField: ['spec.accessModes.0'],
    dataFormat: dataFormatConfig['mapText'],
    mapTextConfig: {
      ReadWriteOnce: 'RWO',
      ReadOnlyMany: 'ROX',
      ReadWriteMany: 'RWX'
    },
    width: '10%',
    headTitle: t('访问权限'),
    noExsitedValue: defaulNotExistedValue
  },
  storageClassName: {
    dataField: ['spec.storageClassName'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: 'StorageClass',
    noExsitedValue: defaulNotExistedValue
  },
  creationTimestamp: {
    dataField: ['metadata.creationTimestamp'],
    dataFormat: dataFormatConfig['time'],
    width: '13%',
    headTitle: t('创建时间'),
    noExsitedValue: defaulNotExistedValue
  },
  operator: {
    dataField: [''],
    dataFormat: dataFormatConfig['operator'],
    width: '15%',
    headTitle: t('操作'),
    operatorList: [
      {
        name: t('编辑YAML'),
        actionType: 'modify',
        isInMoreOp: false
      },
      {
        name: t('删除'),
        actionType: 'delete',
        isInMoreOp: false
      }
    ]
  }
};

/** resource action当中的配置 */
const actionField = Object.assign({}, immutableActionField);

/** 自定义tablist */
const tabList = [
  {
    id: 'info',
    label: t('详情')
  },
  {
    id: 'event',
    label: t('事件')
  },
  {
    id: 'yaml',
    label: 'YAML'
  }
];

const detailBasicInfo: DetailInfo = {
  info: {
    metadata: {
      dataField: ['metadata'],
      displayField: {
        name: {
          dataField: ['name'],
          dataFormat: dataFormatConfig['text'],
          label: t('名称'),
          noExsitedValue: defaulNotExistedValue,
          order: '0'
        },
        namespace: {
          dataField: ['namespace'],
          dataFormat: dataFormatConfig['text'],
          label: 'Namespace',
          noExsitedValue: defaulNotExistedValue,
          order: '5'
        },
        labels: {
          dataField: ['labels'],
          dataFormat: dataFormatConfig['labels'],
          label: 'Labels',
          noExsitedValue: defaulNotExistedValue,
          order: '10'
        },
        creationTimestamp: {
          dataField: ['creationTimestamp'],
          dataFormat: dataFormatConfig['time'],
          label: t('创建时间'),
          noExsitedValue: defaulNotExistedValue,
          order: '30'
        }
      }
    },
    spec: {
      dataField: ['spec'],
      displayField: {
        accessModes: {
          dataField: ['accessModes'],
          dataFormat: dataFormatConfig['text'],
          label: t('访问权限'),
          noExsitedValue: defaulNotExistedValue,
          order: '20'
        }
      }
    },
    status: {
      dataField: ['status'],
      displayField: {
        phase: {
          dataField: ['phase'],
          dataFormat: dataFormatConfig['status'],
          label: t('状态'),
          noExsitedValue: defaulNotExistedValue,
          order: '15'
        },
        capacity: {
          dataField: ['capacity.storage'],
          dataFormat: dataFormatConfig['text'],
          label: 'Storage',
          noExsitedValue: defaulNotExistedValue,
          order: '25'
        }
      }
    }
  }
};

const detailField: DetailField = {
  tabList,
  detailInfo: Object.assign({}, detailBasicInfo)
};

/** persistentvolumeclaims 的配置 */
export const pvc = (k8sVersion: string) => {
  return generateResourceInfo({
    k8sVersion,
    resourceName: 'pvc',
    isRelevantToNamespace: true,
    requestType: {
      list: 'persistentvolumeclaims'
    },
    displayField,
    actionField,
    detailField
  });
};
