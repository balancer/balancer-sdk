import { SubgraphPoolBase } from '@balancer-labs/sor';
import { PoolProvider } from './provider.interface';

export class StaticPoolProvider implements PoolProvider {
    constructor(private pools: SubgraphPoolBase[]) {}

    get(id: string): SubgraphPoolBase | undefined {
        return this.pools.find((pool) => {
            return pool.id.toLowerCase() === id.toLowerCase();
        });
    }

    getByAddress(address: string): SubgraphPoolBase | undefined {
        return this.pools.find((pool) => {
            return pool.address.toLowerCase() === address.toLowerCase();
        });
    }
}
