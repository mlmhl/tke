export interface Instance {
  ruleName?: string; // 规则名称

  clbName: string; // CLB 名称

  clbId: string; // CLB ID

  type: string; // 网络类型
}

export interface InstanceForTable extends Instance {
  imported: boolean; // 是否已导入
}

export interface ImportedInstance extends Instance {
  scope: string[];

  name: string;

  vip: string;

  vipIsp: string; // 运营商

  disabled: boolean;
}
