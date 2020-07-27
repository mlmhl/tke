/**
 * 获取精度
 */
export function getPrecision(value: number) {
  if (typeof value !== "number") {
    return 0;
  }
  const str = value.toString();
  if (/e-(.+)$/.test(str)) {
    return parseInt(RegExp.$1, 10);
  }
  if (str.indexOf(".") >= 0) {
    return str.length - str.indexOf(".") - 1;
  }
  return 0;
}
