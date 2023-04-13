/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */
import { ExitPoolRequest, JoinPoolRequest, Pool } from '@/types';
import { BigNumber } from '@ethersproject/bignumber';

export interface LiquidityConcern {
  calcTotal: (...args: any[]) => string;
}

export interface SpotPriceConcern {
  /**
   * Calculate spot price for swapping tokenIn with tokenOut
   * @param tokenIn Token address
   * @param tokenOut Token address
   * @param pool Pool where swap is being made
   * @returns spot price for swapping tokenIn with tokenOut in EVM scale
   */
  calcPoolSpotPrice: (tokenIn: string, tokenOut: string, pool: Pool) => string;
}

export interface PriceImpactConcern {
  /**
   * Calculate BPT return amount when investing with no price impact.
   * @param pool Investment pool.
   * @param tokenAmounts Token amounts in EVM scale. Needs a value for each pool token.
   * @returns BPT amount in EVM scale.
   */
  bptZeroPriceImpact: (pool: Pool, tokenAmounts: bigint[]) => bigint;

  /**
   * Calculate price impact of bptAmount against zero price impact BPT amount.
   * @param pool Investment pool.
   * @param tokenAmounts Token amounts in EVM scale. Needs a value for each pool token.
   * @param bptAmount BPT amount for comparison (in EVM scale)
   * @param isJoin boolean indicating if the price impact is for a join or exit.
   * @returns price impact in EVM scale.
   */
  calcPriceImpact: (
    pool: Pool,
    tokenAmounts: bigint[],
    bptAmount: bigint,
    isJoin: boolean
  ) => string;
}

export interface JoinConcern {
  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param joiner Account address joining pool
   * @param pool Subgraph pool object of pool being joined
   * @param tokensIn Token addresses provided for joining pool (same length and order as amountsIn)
   * @param amountsIn Token amounts provided for joining pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps i.e. 50 = 0.5%
   * @param wrappedNativeAsset Address of wrapped native asset for specific network config. Required for joining with native asset.
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildJoin: ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters) => JoinPoolAttributes;
}

export interface ExitConcern {
  /**
   * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param pool Pool being exited
   * @param bptIn BPT provided for exiting pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps. i.e. 50 = 5%
   * @param shouldUnwrapNativeAsset Indicates whether wrapped native asset should be unwrapped after exit.
   * @param wrappedNativeAsset Wrapped native asset address for network being used. Required for exiting with native asset.
   * @param singleTokenOut Optional: token address that if provided will exit to given token
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildExitExactBPTIn?: ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenOut,
    toInternalBalance,
  }: ExitExactBPTInParameters) => ExitExactBPTInAttributes;

  /**
   * Build exit pool transaction parameters with exact tokens out and maximum BPT in based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param pool Pool being exited
   * @param tokensOut Tokens provided for exiting pool (same length and order as amountsOut)
   * @param amountsOut Amounts provided for exiting pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps. i.e. 50 = 5%
   * @param wrappedNativeAsset Wrapped native asset address for network being used. Required for exiting with native asset.
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildExitExactTokensOut: ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
    toInternalBalance,
  }: ExitExactTokensOutParameters) => ExitExactTokensOutAttributes;

  /**
   * Build recovery exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param pool Pool being exited
   * @param bptIn BPT provided for exiting pool
   * @param slippage Maximum slippage tolerance in basis points. i.e. 50 = 5%
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildRecoveryExit: ({
    exiter,
    pool,
    bptIn,
    slippage,
    toInternalBalance,
  }: Pick<
    ExitExactBPTInParameters,
    'exiter' | 'pool' | 'bptIn' | 'slippage' | 'toInternalBalance'
  >) => ExitExactBPTInAttributes;
}

export interface JoinPool {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequest;
}

/**
 * Join with exact tokens in transaction parameters
 * @param to Address that will execute the transaction (vault address)
 * @param functionName Function name to be called (joinPool)
 * @param attributes Transaction attributes ready to be encoded
 * @param data Encoded transaction data
 * @param value Optional: ETH amount in EVM scale (required when joining with ETH)
 * @param minBptOut Minimum BPT amount out of join transaction considering slippage tolerance in EVM scale
 * @param expectedBptOut Expected BPT amount out of join transaction in EVM scale
 * @param priceImpact Price impact of join transaction in EVM scale
 */
export interface JoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
  minBPTOut: string;
  expectedBPTOut: string;
  priceImpact: string;
}

export interface JoinPoolParameters {
  joiner: string;
  pool: Pool;
  tokensIn: string[];
  amountsIn: string[];
  slippage: string;
  wrappedNativeAsset: string;
}

export interface ExitPool {
  poolId: string;
  sender: string;
  recipient: string;
  exitPoolRequest: ExitPoolRequest;
}

export interface ExitPoolAttributes {
  to: string;
  functionName: string;
  attributes: ExitPool;
  data: string;
}

/**
 * Exit exact BPT in transaction parameters
 * @param to Address that will execute the transaction (vault address)
 * @param functionName Function name to be called (exitPool)
 * @param attributes Transaction attributes ready to be encoded
 * @param data Encoded transaction data
 * @param expectedAmountsOut Expected amounts out of exit transaction in EVM scale
 * @param minAmountsOut Minimum amounts out of exit transaction (considering slippage tolerance) in EVM scale
 * @param priceImpact Price impact of exit transaction in EVM scale
 */
export interface ExitExactBPTInAttributes extends ExitPoolAttributes {
  expectedAmountsOut: string[];
  minAmountsOut: string[];
  priceImpact: string;
}

/**
 * Exit exact tokens out transaction parameters
 * @param to Address that will execute the transaction (vault address)
 * @param functionName Function name to be called (exitPool)
 * @param attributes Transaction attributes ready to be encoded
 * @param data Encoded transaction data
 * @param expectedBPTIn Expected BPT into exit transaction in EVM scale
 * @param maxBPTIn Max BPT into exit transaction (considering slippage tolerance) in EVM scale
 * @param priceImpact Price impact of exit transaction in EVM scale
 */
export interface ExitExactTokensOutAttributes extends ExitPoolAttributes {
  expectedBPTIn: string;
  maxBPTIn: string;
  priceImpact: string;
}

export interface ExitExactBPTInParameters {
  exiter: string;
  pool: Pool;
  bptIn: string;
  slippage: string;
  shouldUnwrapNativeAsset: boolean;
  wrappedNativeAsset: string;
  singleTokenOut?: string;
  toInternalBalance: boolean;
}

export interface ExitExactBPTInSingleTokenOutParameters {
  exiter: string;
  pool: Pool;
  bptIn: string;
  slippage: string;
  shouldUnwrapNativeAsset: boolean;
  wrappedNativeAsset: string;
  singleTokenOut: string;
}

export interface ExitExactTokensOutParameters {
  exiter: string;
  pool: Pool;
  tokensOut: string[];
  amountsOut: string[];
  slippage: string;
  wrappedNativeAsset: string;
  toInternalBalance: boolean;
}
