import { SubgraphPoolBase } from '@balancer-labs/sor';
import { PoolProvider } from './provider.interface';

export class UninitializedPoolProvider implements PoolProvider {
    get(): SubgraphPoolBase | undefined {
        throw new Error('No pool provider set');
    }

    getByAddress(): SubgraphPoolBase | undefined {
        throw new Error('No pool provider set');
    }

}
