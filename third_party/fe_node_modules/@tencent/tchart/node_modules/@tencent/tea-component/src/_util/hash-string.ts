export function hashString(str) {
  let hash = 0;
  let i;
  let chr;
  let len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr; // eslint-disable-line no-bitwise
    // Convert to 32bit integer
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return hash;
}
