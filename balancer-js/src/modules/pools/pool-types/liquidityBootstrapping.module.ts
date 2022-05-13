import { LiquidityBootstrappingPoolLiquidity } from './concerns/liquidity-bootstrapping/liquidity.concern';
import { PoolType } from './poolType.interface';

export class LiquidityBootstrapping implements PoolType {
    constructor(public liquidity = new LiquidityBootstrappingPoolLiquidity()) {}
}
