import { DetailField, DisplayField, DetailInfo } from '../../../src/modules/common/models';
import { defaulNotExistedValue, dataFormatConfig, commonActionField, generateResourceInfo } from '../common';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

const displayField: DisplayField = {
  name: {
    dataField: ['metadata.name'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: t('名称'),
    noExsitedValue: defaulNotExistedValue,
    isLink: false,
    isClip: true
  },
  driverName: {
    dataField: ['spec.driverName'],
    dataFormat: dataFormatConfig['text'],
    width: '15%',
    headTitle: t('Driver'),
    noExsitedValue: defaulNotExistedValue
  },
  version: {
    dataField: ['spec.version'],
    dataFormat: dataFormatConfig['text'],
    width: '15%',
    headTitle: t('版本'),
    noExsitedValue: defaulNotExistedValue
  },
  operator: {
    dataField: [''],
    dataFormat: dataFormatConfig['operator'],
    width: '15%',
    headTitle: t('操作'),
    operatorList: [{
      name: t('删除'),
      actionType: 'delete',
      isInMoreOp: false
    }]
  }
};

/** resource action当中的配置 */
const actionField = Object.assign({}, commonActionField, {
  create: {
    isAvailable: false
  }
});

/** 自定义tabList */
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
        creationTimestamp: {
          dataField: ['creationTimestamp'],
          dataFormat: dataFormatConfig['time'],
          label: t('创建时间'),
          noExsitedValue: defaulNotExistedValue,
          order: '25'
        },
        isDefaul: {
          dataField: ['annotations', 'storageclass.beta.kubernetes.io/is-default-class'],
          dataFormat: dataFormatConfig['text'],
          label: 'Default Class',
          noExsitedValue: 'false',
          order: '20'
        }
      }
    },
    provisioner: {
      dataField: ['provisioner'],
      displayField: {
        provisioner: {
          dataField: [''],
          dataFormat: dataFormatConfig['text'],
          label: t('来源'),
          noExsitedValue: defaulNotExistedValue,
          order: '10'
        }
      }
    },
    reclaimPolicy: {
      dataField: ['reclaimPolicy'],
      displayField: {
        reclaimPolicy: {
          dataField: [''],
          dataFormat: dataFormatConfig['text'],
          label: t('回收策略'),
          noExsitedValue: 'Delete',
          order: '15'
        }
      }
    }
  }
};

const detailField: DetailField = {
  tabList,
  detailInfo: Object.assign({}, detailBasicInfo)
};

/** storage classes 的配置 */
export const csi = (k8sVersion: string) => {
  return generateResourceInfo({
    k8sVersion,
    resourceName: 'csi',
    requestType: {
      list: 'csis',
      addon: true
    },
    isRelevantToNamespace: true,
    displayField,
    actionField,
    detailField
  });
};
