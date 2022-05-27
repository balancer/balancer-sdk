import { SubgraphPoolBase } from '@balancer-labs/sor';
import { PoolAttribute, PoolProvider } from './provider.interface';

export class StaticPoolProvider implements PoolProvider {
    constructor(private pools: SubgraphPoolBase[]) {}

    async find(id: string): Promise<SubgraphPoolBase | undefined> {
        return this.pools.find((pool) => {
            return pool.id.toLowerCase() === id.toLowerCase();
        });
    }

    async findBy(
        attribute: PoolAttribute,
        value: string
    ): Promise<SubgraphPoolBase | undefined> {
        return this.pools.find((pool) => {
            return pool[attribute] === value;
        });
    }
}
