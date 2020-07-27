/// <reference types="react" />
export declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export declare type Combine<A, B, C = {}, D = {}, E = {}, F = {}> = A & B & C & D & E & F;
export declare type MatchPropertyNames<S, T> = {
    [P in keyof S]: S[P] extends T ? P : never;
}[keyof S];
export declare type MatchProperties<S, T> = Pick<S, MatchPropertyNames<S, T>>;
export declare type NonFunctionPropNames<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];
export declare type WithoutMethod<T> = Pick<T, NonFunctionPropNames<T>>;
export declare type InferProps<C> = C extends React.ComponentType<infer P> ? P : never;
