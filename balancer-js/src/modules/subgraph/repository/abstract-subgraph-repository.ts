import { PoolShare, GaugeShare } from '@/types';

export abstract class Mapper<T> {
    public abstract map(subgraphFragment: any): T;
}

export class PoolSharesMapper extends Mapper<PoolShare> {
    public map(subgraphFragment: any): PoolShare {
        const poolShare: PoolShare = {
            id: subgraphFragment.id,
            userAddress: subgraphFragment.userAddress.id,
            poolId: subgraphFragment.poolId.id,
            balance: subgraphFragment.balance
        };
        return poolShare;
    }
}

export class GaugeSharesMapper extends Mapper<GaugeShare> {
    public map(subgraphFragment: any) {
        const gaugeShare: GaugeShare = {
            id: subgraphFragment.id,
            userAddress: subgraphFragment.user.id,
            gaugeId: subgraphFragment.gauge.id,
            balance: subgraphFragment.balance,
            gaugeIsKilled: subgraphFragment.gauge.isKilled
        }
        return gaugeShare;
    }
}

/*
export class Mappers {
    get(type0: Object): Mapper<any> {
        if (type0 instanceof PoolShare) return new PoolSharesMapper();
        else if (type0 instanceof GaugeShare) return new GaugeSharesMapper();
        else throw new Error("Mapper not implemented.");
    }
}*/

export abstract class AbstractSubgraphRepository<T> {
    public abstract query(args: any): Promise<T[]>;
    public abstract get(args: any): Promise<T | undefined>;
    protected abstract mapType(subgraphFragment: any): T;
    
    /*protected mapType(subgraphFragment: any): T {
        return new Mappers().get(T).map(subgraphFragment);
    }*/
    
    /*
    async query(args = {}): Promise<PoolShare[]> {
        const { poolShares } = await this.client.PoolShares(args);
        return poolShares.map(this.mapType);
    }

    async get(args = {}): Promise<PoolShare | undefined> {
        const { poolShares } = await this.client.PoolShares(args);
        return (poolShares && poolShares.length > 0) ? this.mapType(poolShares[0]) : undefined; 
    }
    */
}