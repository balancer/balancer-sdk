import { SubgraphPoolBase } from '@balancer-labs/sor';
import { JoinConcern } from '../types';

export class StablePoolJoin implements JoinConcern {
    async encodedExactTokensInJoinPool(
        joiner: string,
        pool: SubgraphPoolBase,
        tokensIn: string[],
        amountsIn: string[],
        slippage: string
    ): Promise<string> {
        // TODO implementation
        console.log(joiner, pool, tokensIn, amountsIn, slippage);
        throw new Error('To be implemented');
    }
}
