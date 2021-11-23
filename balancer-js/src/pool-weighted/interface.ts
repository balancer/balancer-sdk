import { BigNumberish } from '@ethersproject/bignumber';

export interface PoolService {
    /**
     * Allow the input of any number of pool tokens, return the expected
     * bptAmount and priceImpactPercent of the join.
     *
     * Internally do sanity checks to ensure that all input tokens are actually part of the pool.
     */
    queryJoin(poolId: string, tokens: SimpleToken[]): Promise<QueryJoinOutput>;
    /**
     * Given a single token as input, determine what a zero impact join looks like.
     * Also return the expected bptAmount for a zero impact join.
     */
    queryBalancedJoin(poolId: string, token: SimpleToken): Promise<QueryBalancedJoinOutput>;
    /**
     * Given the input tokens, bptAmount, and maxSlippagePercent, encode the join operation.
     */
    encodeJoin(input: EncodeJoinInput): Promise<void>;

    //TODO: having the queries resolve to a promise may not be performant enough (ie: the frontend percentage slider)
    //TODO: Alternatively, we could pass the Pool in already resolved, or somehow cache the Pool in the SDK for some period of time.
    /**
     * Return the balanced token amounts received for bptAmount in
     */
    queryBalancedExit(poolId: string, bptAmount: BigNumberish): Promise<QueryBalancedExitOutput>;
    /**
     * Return the single token amount received for bptAmount in
     */
    querySingleTokenExit(
        poolId: string,
        bptAmount: BigNumberish,
        tokenAddress: string,
    ): Promise<QuerySingleTokenExitOutput>;

    encodeBalancedExit(poolId: string, bptAmount: BigNumberish, maxSlippagePercent: number): Promise<void>;
    encodeSingleTokenExit(
        poolId: string,
        bptAmount: BigNumberish,
        tokenAddress: string,
        maxSlippagePercent: number,
    ): Promise<void>;
}

interface QueryJoinOutput {
    bptAmount: BigNumberish;
    priceImpactPercent: number;
}

interface QueryBalancedJoinOutput {
    tokens: SimpleToken[];
    bptAmount: BigNumberish;
}

interface SimpleToken {
    address: string;
    amount: BigNumberish;
}

interface EncodeJoinInput {
    tokens: SimpleToken[];
    bptAmount: BigNumberish;
    maxSlippagePercent: number;
}

interface QueryBalancedExitOutput {
    tokens: SimpleToken[];
}

interface QuerySingleTokenExitOutput {
    token: SimpleToken;
}
