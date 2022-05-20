/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

import { SubgraphPoolBase } from '@balancer-labs/sor';
import { JoinPoolRequest } from '@/types';

export interface LiquidityConcern {
    calcTotal: (...args: any[]) => string;
}

export interface SpotPriceConcern {
    calcPoolSpotPrice: (
        tokenIn: string,
        tokenOut: string,
        pool: SubgraphPoolBase
    ) => string;
}

export interface EncodeJoinPoolInput {
    poolId: string;
    sender: string;
    recipient: string;
    joinPoolRequest: JoinPoolRequest;
}

export type JoinPoolData = JoinPoolRequest & EncodeJoinPoolInput;
