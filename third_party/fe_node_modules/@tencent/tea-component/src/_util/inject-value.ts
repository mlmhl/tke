import { isCallable } from "./is-callable";

/**
 * 处理 `R | (...args) => R` 类似类型
 * （ts <= 3.2 时无法依赖 typeof x === "function" 自动推导）
 */
export function injectValue<P extends unknown[], R = React.ReactNode>(
  target: R | ((...args: P) => R)
) {
  return (...args: P) => (isCallable(target) ? target(...args) : target);
}
