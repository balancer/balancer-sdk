/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

export interface LiquidityConcern {
    calcTotal: (...args: any[]) => string;
}
