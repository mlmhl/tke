import { ActionField } from '../../../src/modules/common/models';

/** resource list资源页面的所提供的操作按钮 */
export const commonActionField: ActionField = {
  create: {
    isAvailable: true
  },
  search: {
    isAvailable: true,
    attributes: []
  },
  manualRenew: {
    isAvailable: true,
    attributes: []
  },
  autoRenew: {
    isAvailable: false
  },
  download: {
    isAvailable: true
  }
};

/** 存储相关对象 list资源页面的所提供的操作按钮 */
export const immutableActionField: ActionField = {
  create: {
    isAvailable: false
  },
  search: {
    isAvailable: true,
    attributes: []
  },
  manualRenew: {
    isAvailable: true,
    attributes: []
  },
  autoRenew: {
    isAvailable: false
  },
  download: {
    isAvailable: true
  }
};
