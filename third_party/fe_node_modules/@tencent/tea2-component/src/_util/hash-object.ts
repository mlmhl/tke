import { hashString } from "./hash-string";

export function hashObject(obj) {
  if (obj.prototype) {
    throw new RangeError("Can only hash a plain object");
  }
  return hashString(JSON.stringify(obj));
}
