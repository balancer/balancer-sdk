import { SubgraphPoolBase } from '@balancer-labs/sor';

export type PoolAttribute = 'id' | 'address';

export interface PoolProvider {
    find: (id: string) => Promise<SubgraphPoolBase | undefined>;
    findBy: (
        attribute: PoolAttribute,
        value: string
    ) => Promise<SubgraphPoolBase | undefined>;
}
