export interface KeyValueMap {
  text: string;
  value: string;
  groupKey?: string;
  tooltip?: string;
  disabled?: boolean;
}

export interface Groups {
  [props: string]: string;
}
