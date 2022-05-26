import { SubgraphPoolBase } from '@balancer-labs/sor';
import { PoolAttribute, PoolProvider } from './provider.interface';

export class StaticPoolProvider implements PoolProvider {
    constructor(private pools: SubgraphPoolBase[]) {}

    find(id: string): SubgraphPoolBase | undefined {
        return this.pools.find((pool) => {
            return pool.id.toLowerCase() === id.toLowerCase();
        });
    }

    findBy(
        attribute: PoolAttribute,
        value: string
    ): SubgraphPoolBase | undefined {
        return this.pools.find((pool) => {
            return pool[attribute] === value;
        });
    }
}
