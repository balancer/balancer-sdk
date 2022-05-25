import { SubgraphPoolBase } from '@balancer-labs/sor';

export interface PoolProvider {
    get: (id: string) => SubgraphPoolBase | undefined;
    getByAddress: (address: string) => SubgraphPoolBase | undefined;
}
