export type RawSubgraphPool = {
    id: string;
};

export type DecoratedPool = {
    id: string;
    totalLiquidity: string;
};

export enum PoolType {
    Weighted = 'Weighted',
    Investment = 'Investment',
    Stable = 'Stable',
    MetaStable = 'MetaStable',
    StablePhantom = 'StablePhantom',
    LiquidityBootstrapping = 'LiquidityBootstrapping',
}
