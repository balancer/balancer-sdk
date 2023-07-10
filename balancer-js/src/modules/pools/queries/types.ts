import type { BigNumber } from '@ethersproject/bignumber';
import type { PoolType } from '@/.';

export interface Encoder {
  joinExactTokensInForBPTOut(
    amountsIn: BigNumber[],
    minimumBPT: BigNumber
  ): string;

  joinTokenInForExactBPTOut(
    bptAmountOut: BigNumber,
    enterTokenIndex: number
  ): string;

  exitExactBPTInForOneTokenOut(
    bptAmountIn: BigNumber,
    exitTokenIndex: number
  ): string;

  exitExactBPTInForTokensOut?(bptAmountIn: BigNumber): string;

  exitBPTInForExactTokensOut(
    amountsOut: BigNumber[],
    maxBPTAmountIn: BigNumber
  ): string;
}

export interface ParamsBuilder {
  buildQueryJoinExactIn(params: JoinExactInParams): queryJoinParams;

  buildQueryJoinExactOut(params: JoinExactOutParams): queryJoinParams;

  buildQueryExitToSingleToken(params: ExitToSingleTokenParams): queryExitParams;

  buildQueryExitProportionally(
    params: ExitProportionallyParams
  ): queryExitParams;

  buildQueryExitExactOut(params: ExitExactOutParams): queryExitParams;
}

/**
 * Pool model used to build queries
 *
 * @param tokensList is expected to be sorted in ascending order to match ordering used by the Vault.
 */
export interface Pool {
  id: string;
  poolType: PoolType;
  tokensList: string[];
}

export interface JoinExactInParams {
  maxAmountsInByToken: Map<string, BigNumber>;
  minimumBPT?: BigNumber;
}

export interface JoinExactOutParams {
  maxAmountIn?: BigNumber;
  bptOut: BigNumber;
  tokenIn: string;
}

export interface ExitToSingleTokenParams {
  minAmountOut?: BigNumber;
  bptIn: BigNumber;
  tokenOut: string;
}

export interface ExitProportionallyParams {
  minAmountsOut?: BigNumber[];
  bptIn: BigNumber;
}

export interface ExitExactOutParams {
  minAmountsOut: BigNumber[];
  tokensOut: string[];
  maxBptIn?: BigNumber;
}

export type queryJoinParams = [
  poolId: string,
  sender: string,
  recipient: string,
  request: {
    assets: string[];
    maxAmountsIn: BigNumber[];
    userData: string;
    fromInternalBalance: boolean;
  }
];

export type queryExitParams = [
  poolId: string,
  sender: string,
  recipient: string,
  request: {
    assets: string[];
    minAmountsOut: BigNumber[];
    userData: string;
    toInternalBalance: boolean;
  }
];
