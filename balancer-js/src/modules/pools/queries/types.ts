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
  sender?: string;
  recipient?: string;
  maxAmountsIn: BigNumber[];
  minimumBPT?: BigNumber;
  fromInternalBalance?: boolean;
}

export interface JoinExactOutParams {
  sender?: string;
  recipient?: string;
  maxAmountsIn?: BigNumber[];
  bptOut: BigNumber;
  tokenIn: string;
  fromInternalBalance?: boolean;
}

export interface ExitToSingleTokenParams {
  sender?: string;
  recipient?: string;
  minAmountsOut?: BigNumber[];
  bptIn: BigNumber;
  tokenOut: string;
  toInternalBalance?: boolean;
}

export interface ExitProportionallyParams {
  sender?: string;
  recipient?: string;
  minAmountsOut?: BigNumber[];
  bptIn: BigNumber;
  toInternalBalance?: boolean;
}

export interface ExitExactOutParams {
  sender?: string;
  recipient?: string;
  minAmountsOut: BigNumber[];
  maxBptIn?: BigNumber;
  toInternalBalance?: boolean;
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
