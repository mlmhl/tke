/* eslint-disable import/export */
import React from "react";

export function isChildOfType(
  child: React.ReactNode,
  type: "text"
): child is string;

export function isChildOfType(
  child: React.ReactNode,
  type: "number"
): child is number;

export function isChildOfType<T extends keyof JSX.IntrinsicElements>(
  child: React.ReactNode,
  type: T
): child is React.ReactComponentElement<T>;

export function isChildOfType<T extends React.ElementType>(
  child: React.ReactNode,
  type: T
): child is React.ReactElement<
  T extends React.ElementType<infer P> ? P : any,
  T
>;

export function isChildOfType(
  child: React.ReactNode,
  type: "text" | "number" | React.ElementType
) {
  if (typeof child === "undefined" || child === null) return false;
  if (typeof child === "string") {
    return type === "text";
  }
  if (typeof child === "number") {
    return type === "number";
  }
  if (React.isValidElement(child)) {
    if (typeof type === "string") {
      return child.type === type;
    }
    // React Hot Loader 会对组件进行代理。使用 createElement() 返回的 element.type 才是实际的类型
    // remark: https://github.com/gaearon/react-hot-loader/issues/304#issuecomment-223222772
    return child.type === React.createElement(type, {}).type;
  }
  return false;
}
/* eslint-enable import/export */
