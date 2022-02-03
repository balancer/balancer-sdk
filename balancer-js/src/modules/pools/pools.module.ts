import { BalancerSDK } from "../sdk.module";
import { Pool } from "./pool";

type RawPoolData = {
    id: string;
};

type DecoratedPoolData = {
    id: string;
    totalLiquidity: string;
};

BalancerSDK.pools.fetching.decorateAll()
pools.decorateAll()

export class Pools {
    constructor() {
        this.fetching = new PoolFetcher()
    }
    public async decorate(rawPoolData: RawPoolData): Promise<DecoratedPoolData> {
        const pool = new Pool(rawPoolData.id);
        pool.decorate()
        // pool.decorate needs to have a default
        // implmentation and then delegate to the 
        // pool type if it has an implementation
        // Check ts design patterns for correct implementation

        const decoratedPool: DecoratedPoolData = {
            ...pool,
            totalLiquidity: '1000',
        };

        return decoratedPool;
    }

    public async decorateAll(
        pools: RawPoolData[]
    ): Promise<DecoratedPoolData[]> {
        const promises = pools.map(async (pool) => this.decorate(pool));
        return Promise.all(promises);
    }
}
