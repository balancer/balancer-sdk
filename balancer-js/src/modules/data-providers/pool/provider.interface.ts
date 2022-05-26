import { SubgraphPoolBase } from '@balancer-labs/sor';

export type PoolAttribute = 'id' | 'address';

export interface PoolProvider {
    find: (id: string) => SubgraphPoolBase | undefined;
    findBy: (
        attribute: PoolAttribute,
        value: string
    ) => SubgraphPoolBase | undefined;
}
