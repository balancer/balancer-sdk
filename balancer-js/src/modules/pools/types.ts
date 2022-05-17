import { JoinPoolRequest } from '@/types';

export enum PoolType {
    Weighted = 'Weighted',
    Investment = 'Investment',
    Stable = 'Stable',
    MetaStable = 'MetaStable',
    StablePhantom = 'StablePhantom',
    LiquidityBootstrapping = 'LiquidityBootstrapping',
}

export interface EncodeJoinPoolInput {
    poolId: string;
    sender: string;
    recipient: string;
    joinPoolRequest: JoinPoolRequest;
}

export type JoinPoolData = JoinPoolRequest & EncodeJoinPoolInput;

export interface ExactTokensJoinPoolInput {
    joiner: string;
    poolId: string;
    assets: string[];
    amountsIn: string[];
    expectedBPTOut: string;
    slippage: string;
}
