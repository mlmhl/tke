interface ObjectParam {
  [key: string]: any;
}

/**
 * 拼接URL string
 * @param Object 指定一个对象
 * @returns URL string
 */
export const urlStringify = (o: ObjectParam): string =>
  Object.entries(o)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
