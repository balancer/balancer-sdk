import { InvestmentPoolLiquidity } from './concerns/investment/liquidity.concern';
import { PoolType } from './poolType.interface';

export class Investment implements PoolType {
    constructor(public liquidity = new InvestmentPoolLiquidity()) {}
}
