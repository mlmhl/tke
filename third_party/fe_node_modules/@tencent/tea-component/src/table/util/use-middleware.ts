import { TableAddon, TableMiddleware } from "../TableProps";

export function useMiddleware<K extends keyof TableAddon>(
  addons: TableAddon[],
  name: K
) {
  // infer value type
  type Value<T> = T extends TableMiddleware<infer V> ? V : never;
  type ValueType = Value<TableAddon[typeof name]>;

  if (!addons || !addons.length) {
    return (initialValue: ValueType) => initialValue;
  }

  return (initialValue: ValueType) =>
    addons
      .map(x => x[name])
      .filter(Boolean)
      .reduce<ValueType>(
        (previous, middleware: TableMiddleware<any>) => middleware(previous),
        initialValue
      );
}
