import { DetailField, DisplayField, DetailInfo } from '../../../src/modules/common/models';
import { commonActionField, defaulNotExistedValue, dataFormatConfig, generateResourceInfo } from '../common';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

const displayField: DisplayField = {
  name: {
    dataField: ['metadata.name'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: t('名称'),
    noExsitedValue: defaulNotExistedValue,
    isLink: true, // 用于判断该值是否为链接
    isClip: true
  },
  status: {
    dataField: ['status.phase'],
    dataFormat: dataFormatConfig['status'],
    width: '8%',
    headTitle: t('状态'),
    noExsitedValue: defaulNotExistedValue
  },
  clusterName: {
    dataField: ['spec.clusterId', 'spec.clusterDisplayName'],
    dataFormat: dataFormatConfig['text'],
    width: '10%',
    headTitle: t('归属集群'),
    noExsitedValue: defaulNotExistedValue
  },
  zone: {
    // business: BusinessVersionObj.shared_cluster,
    dataField: ['metadata.labels'],
    dataFormat: dataFormatConfig['zone'],
    width: '10%',
    headTitle: t('可用区'),
    noExsitedValue: defaulNotExistedValue
  },
  zoneHard: {
    // business: BusinessVersionObj.shared_cluster,
    dataField: ['metadata.labels'],
    dataFormat: dataFormatConfig['zoneHard'],
    width: '10%',
    headTitle: t('可用区资源限制'),
    noExsitedValue: defaulNotExistedValue
  },
  hard: {
    dataField: ['spec.hard'],
    dataFormat: dataFormatConfig['resourceLimit'],
    width: '12%',
    headTitle: t('namespace资源限制'),
    noExsitedValue: defaulNotExistedValue
  },
  used: {
    dataField: ['status.used'],
    dataFormat: dataFormatConfig['resourceLimit'],
    width: '10%',
    headTitle: t('已使用'),
    noExsitedValue: defaulNotExistedValue
  },
  business: {
    dataField: ['metadata.annotations.cmdb.io/bsiPath'],
    dataFormat: dataFormatConfig['cmdbBusiness'],
    width: '12%',
    headTitle: t('业务'),
    noExsitedValue: defaulNotExistedValue
  },
  theOperator: {
    dataField: ['metadata.annotations.cmdb.io/operator'],
    shareClusterDataField: ['metadata.labels.teg.tkex.oa.com/creator'],
    dataFormat: dataFormatConfig['cmdbOperator'],
    width: '8%',
    headTitle: t('负责人'),
    shareClusterHeadTitle: t('创建人'),
    noExsitedValue: defaulNotExistedValue
  },
  creationTimestamp: {
    dataField: ['metadata.creationTimestamp'],
    dataFormat: dataFormatConfig['time'],
    width: '10%',
    headTitle: t('创建时间'),
    noExsitedValue: defaulNotExistedValue
  },
  operator: {
    dataField: [''],
    dataFormat: dataFormatConfig['operator'],
    width: '',
    headTitle: t('操作'),
    operatorList: [
      {
        name: t('查看访问凭证'),
        actionType: 'view-access-credentials',
        isInMoreOp: false
      },
      {
        name: t('编辑'),
        actionType: 'modify-namespace',
        isInMoreOp: false
      }
    ]
  }
};

/** resrouce action当中的配置 */
const actionField = Object.assign({}, commonActionField);

/** 自定义tabList */
const tabList = [
  {
    id: 'nsInfo',
    label: t('详情')
  },
  {
    id: 'yaml',
    label: 'YAML'
  }
];

/** 自定义配置详情的展示 */
const detailBasicInfo: DetailInfo = {};

/** 详情页面的相关配置 */
const detailField: DetailField = {
  tabList,
  detailInfo: Object.assign({}, detailBasicInfo)
};

/** namespace的配置 */
export const np = (k8sVersion: string) => {
  return generateResourceInfo({
    k8sVersion,
    resourceName: 'np',
    requestType: {
      list: 'namespaces'
    },
    displayField,
    actionField,
    detailField
  });
};
