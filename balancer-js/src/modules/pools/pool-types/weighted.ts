import { Pool } from '../pool';
import { PoolType } from './pool-type.interface';

export class WeightedPool extends Pool implements PoolType {
    public async create(): Promise<> {}
}
