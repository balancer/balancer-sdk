import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { PoolType } from './pool-type.interface';

export class Stable implements PoolType {
    constructor(public liquidity = new StablePoolLiquidity()) {}
}
