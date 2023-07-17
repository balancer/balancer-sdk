import * as PoolQueries from './types';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero, Zero, MaxUint256 } from '@ethersproject/constants';
import { getEncoder } from './get_encoder';
import { removeItem } from '@/lib/utils';

/**
 * Builds parameters quering join / exit liquidity functions in the Balancer Helpers contract.
 */
export class ParamsBuilder implements PoolQueries.ParamsBuilder {
  private encoder: PoolQueries.Encoder;

  constructor(private pool: PoolQueries.Pool) {
    const encoder = getEncoder(pool.poolType);
    if (encoder) {
      this.encoder = encoder;
    } else {
      throw 'Pool type not supported';
    }
  }

  /**
   * Encodes the query to get expected amount of BPT when joining a Pool with exact token inputs
   * @param maxAmountsInByToken - The amounts each of token, mapped by token address, to deposit in the pool as liquidity,
   *                       doesn't need to have all tokens, only the ones that will be deposited
   * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens (optional)
   */
  buildQueryJoinExactIn({
    maxAmountsInByToken,
    minimumBPT = Zero,
  }: PoolQueries.JoinExactInParams): PoolQueries.queryJoinParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );

    const assets = [...this.pool.tokensList];

    const maxAmountsIn = this.pool.tokensList.map(
      (tokenAddress) =>
        maxAmountsInByToken.get(tokenAddress) ?? BigNumber.from('0')
    );

    let maxInWithoutBpt;

    // Remove BPT token from amounts for user data
    if (bptIndex > -1) {
      maxInWithoutBpt = removeItem(maxAmountsIn, bptIndex);
    } else {
      maxInWithoutBpt = maxAmountsIn;
    }

    const userData = this.encoder.joinExactTokensInForBPTOut(
      maxInWithoutBpt,
      minimumBPT
    );

    const params = [
      this.pool.id,
      AddressZero, // sender is ignored on query join, so it can be just address zero
      AddressZero, // same as sender
      {
        assets,
        maxAmountsIn,
        userData,
        fromInternalBalance: false, // from internal balance is ignored on query join, can be just false
      },
    ] as PoolQueries.queryJoinParams;

    return params;
  }

  /**
   * Encodes the query to get expected token amount when joining a Pool specifying fixed BPT out.
   *
   * @param maxAmountIn - The max expected amount for tokenIn (optional)
   * @param bptOut - the expected BPT for providing liquidity
   * @param tokenIn - address of a token joining the pool
   */
  buildQueryJoinExactOut({
    maxAmountIn,
    bptOut,
    tokenIn,
  }: PoolQueries.JoinExactOutParams): PoolQueries.queryJoinParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );
    let tokensWithoutBpt = [...this.pool.tokensList];
    if (bptIndex > -1) {
      tokensWithoutBpt = removeItem(this.pool.tokensList, bptIndex);
    }
    const tokenIndex = tokensWithoutBpt.indexOf(tokenIn);

    const userData = this.encoder.joinTokenInForExactBPTOut(bptOut, tokenIndex);
    const maxAmountsIn = maxAmountIn
      ? this.pool.tokensList.map((tokenAddress) =>
          tokenAddress === tokenIn ? maxAmountIn : '0'
        )
      : [];
    const params = [
      this.pool.id,
      AddressZero, // sender is ignored on query join, so it can be just address zero
      AddressZero, // same as sender
      {
        assets: this.pool.tokensList,
        maxAmountsIn,
        userData,
        fromInternalBalance: false, // from internal balance is ignored on query join, can be just false
      },
    ] as PoolQueries.queryJoinParams;

    return params;
  }

  /**
   * Encodes the query for exiting the pool to a single token
   *
   * @param minAmountOut - minimum expected amount for token out
   * @param bptIn - BPT, shares of the pool liquidity
   * @param tokenOut - address of an exit liquidity token
   */
  buildQueryExitToSingleToken({
    minAmountOut,
    bptIn,
    tokenOut,
  }: PoolQueries.ExitToSingleTokenParams): PoolQueries.queryExitParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );
    let tokensWithoutBpt = [...this.pool.tokensList];
    if (bptIndex > -1) {
      tokensWithoutBpt = removeItem(this.pool.tokensList, bptIndex);
    }
    const tokenIndex = tokensWithoutBpt.indexOf(tokenOut);

    const userData = this.encoder.exitExactBPTInForOneTokenOut(
      bptIn,
      tokenIndex
    );
    const minAmountsOut = minAmountOut
      ? this.pool.tokensList.map((tokenAddress) =>
          tokenAddress === tokenOut ? minAmountOut : '0'
        )
      : [];
    const params = [
      this.pool.id,
      AddressZero, // sender is ignored on query join, so it can be just address zero
      AddressZero, // same as sender
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance: false, // to internal balance is ignored on query join, can be just false
      },
    ] as PoolQueries.queryExitParams;

    return params;
  }

  /**
   * Encodes the query for exiting the pool with all underlying tokens proportionally.
   * Not supported by ComposableStable
   *
   * @param minAmountsOut - minimum expected amounts, can be set to zero for a query, ordered same as pool.tokensList
   * @param bptIn - BPT, shares of the pool liquidity
   */
  buildQueryExitProportionally({
    minAmountsOut = [],
    bptIn,
  }: PoolQueries.ExitProportionallyParams): PoolQueries.queryExitParams {
    if (!this.encoder.exitExactBPTInForTokensOut) {
      throw 'Proportional exit not implemented';
    }

    const userData = this.encoder.exitExactBPTInForTokensOut(bptIn);

    const params = [
      this.pool.id,
      AddressZero, // sender is ignored on query join, so it can be just address zero
      AddressZero, // same as sender
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance: false,
      },
    ] as PoolQueries.queryExitParams;

    return params;
  }

  /**
   * Encodes calldata to query expected BPT for known amounts out.
   *
   * @param minAmountsOut - minimum expected amounts, ordered same as pool.tokensList
   * @param maxBptIn - BPT, shares of the pool liquidity, can be set to zero for a query
   */
  buildQueryExitExactOut({
    minAmountsOut,
    maxBptIn = MaxUint256,
  }: PoolQueries.ExitExactOutParams): PoolQueries.queryExitParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );

    let minAmountsOutWithoutBpt = [...minAmountsOut];
    // Remove BPT token from amounts
    if (bptIndex > -1) {
      minAmountsOutWithoutBpt = removeItem(minAmountsOut, bptIndex);
    }

    const userData = this.encoder.exitBPTInForExactTokensOut(
      minAmountsOutWithoutBpt,
      maxBptIn
    );

    const params = [
      this.pool.id,
      AddressZero, // sender is ignored on query join, so it can be just address zero
      AddressZero, // same as sender
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance: false, // to internal balance is ignored on query join, can be just false
      },
    ] as PoolQueries.queryExitParams;

    return params;
  }
}
