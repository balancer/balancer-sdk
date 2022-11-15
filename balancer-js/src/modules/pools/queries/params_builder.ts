import * as PoolQueries from './types';
import { AddressZero, Zero, MaxUint256 } from '@ethersproject/constants';
import { getEncoder } from './get_encoder';

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
   *
   * @param maxAmountsIn - the amounts each of token to deposit in the pool as liquidity, order needs to match pool.tokensList
   * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
   */
  buildQueryJoinExactIn({
    sender = AddressZero,
    recipient = sender,
    maxAmountsIn,
    minimumBPT = Zero,
    fromInternalBalance = false,
  }: PoolQueries.JoinExactInParams): PoolQueries.queryJoinParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );
    const assets = [...this.pool.tokensList];

    // Remove BPT token from amounts
    if (bptIndex && bptIndex > -1) {
      maxAmountsIn.splice(bptIndex, 1);
    }

    const userData = this.encoder.joinExactTokensInForBPTOut(
      maxAmountsIn,
      minimumBPT
    );

    const params = [
      this.pool.id,
      sender,
      recipient,
      {
        assets,
        maxAmountsIn,
        userData,
        fromInternalBalance,
      },
    ] as PoolQueries.queryJoinParams;

    return params;
  }

  /**
   * Encodes the query to get expected token amount when joining a Pool specifying fixed BPT out.
   *
   * @param maxAmountsIn - max limits of amounts provided as liquidity, can be set to zero, ordered same as pool.tokensList
   * @param bptOut - the expected BPT for providing liquidity
   * @param tokenIn - address of a token joining the pool
   */
  buildQueryJoinExactOut({
    sender = AddressZero,
    recipient = sender,
    maxAmountsIn = [],
    bptOut,
    tokenIn,
    fromInternalBalance = false,
  }: PoolQueries.JoinExactOutParams): PoolQueries.queryJoinParams {
    const tokenIndex = this.pool.tokensList.indexOf(tokenIn);

    const userData = this.encoder.joinTokenInForExactBPTOut(bptOut, tokenIndex);

    const params = [
      this.pool.id,
      sender,
      recipient,
      {
        assets: this.pool.tokensList,
        maxAmountsIn,
        userData,
        fromInternalBalance,
      },
    ] as PoolQueries.queryJoinParams;

    return params;
  }

  /**
   * Encodes the query for exiting the pool to a single token
   *
   * @param minAmountsOut - minimum expected amounts, can be set to zero for a query, ordered same as pool.tokensList
   * @param bptIn - BPT, shares of the pool liquidity
   * @param tokenOut - address of an exit liquidity token
   */
  buildQueryExitToSingleToken({
    sender = AddressZero,
    recipient = sender,
    minAmountsOut = [],
    bptIn,
    tokenOut,
    toInternalBalance = false,
  }: PoolQueries.ExitToSingleTokenParams): PoolQueries.queryExitParams {
    const tokenIndex = this.pool.tokensList.indexOf(tokenOut);

    const userData = this.encoder.exitExactBPTInForOneTokenOut(
      bptIn,
      tokenIndex
    );

    const params = [
      this.pool.id,
      sender,
      recipient,
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance,
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
    sender = AddressZero,
    recipient = sender,
    minAmountsOut = [],
    bptIn,
    toInternalBalance = false,
  }: PoolQueries.ExitProportionallyParams): PoolQueries.queryExitParams {
    if (!this.encoder.exitExactBPTInForTokensOut) {
      throw 'Proportional exit not implemented';
    }

    const userData = this.encoder.exitExactBPTInForTokensOut(bptIn);

    const params = [
      this.pool.id,
      sender,
      recipient,
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance,
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
    sender = AddressZero,
    recipient = sender,
    minAmountsOut,
    maxBptIn = MaxUint256,
    toInternalBalance = false,
  }: PoolQueries.ExitExactOutParams): PoolQueries.queryExitParams {
    const bptIndex = this.pool.tokensList.findIndex((token) =>
      this.pool.id.includes(token)
    );

    // Remove BPT token from amounts
    if (bptIndex && bptIndex > -1) {
      minAmountsOut.splice(bptIndex, 1);
    }

    const userData = this.encoder.exitBPTInForExactTokensOut(
      minAmountsOut,
      maxBptIn
    );

    const params = [
      this.pool.id,
      sender,
      recipient,
      {
        assets: this.pool.tokensList,
        minAmountsOut,
        userData,
        toInternalBalance,
      },
    ] as PoolQueries.queryExitParams;

    return params;
  }
}
