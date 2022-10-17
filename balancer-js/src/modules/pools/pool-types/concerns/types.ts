/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */
import { ExitPoolRequest, JoinPoolRequest, Pool, PoolSeedToken } from '@/types';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionResponse, JsonRpcSigner } from '@ethersproject/providers';

export interface LiquidityConcern {
  calcTotal: (...args: any[]) => string;
}

export interface SpotPriceConcern {
  calcPoolSpotPrice: (tokenIn: string, tokenOut: string, pool: Pool) => string;
}

export interface PriceImpactConcern {
  bptZeroPriceImpact: (pool: Pool, tokenAmounts: bigint[]) => bigint;
  calcPriceImpact: (
    pool: Pool,
    tokenAmounts: string[],
    bptAmount: string
  ) => string;
}

export interface JoinConcern {
  buildJoin: ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters) => JoinPoolAttributes;

  buildInitJoin: ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    wrappedNativeAsset,
  }: InitJoinPoolParameters) => InitJoinPoolAttributes;
}

export interface ExitConcern {
  /**
   * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param pool Pool being exited
   * @param bptIn BPT provided for exiting pool
   * @param slippage Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @param shouldUnwrapNativeAsset Indicates whether wrapped native asset should be unwrapped after exit.
   * @param wrappedNativeAsset Wrapped native asset address for network being used. Required for exiting with native asset.
   * @param singleTokenMaxOut Optional: token address that if provided will exit to given token
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildExitExactBPTIn?: ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters) => ExitPoolAttributes;

  /**
   * Build exit pool transaction parameters with exact tokens out and maximum BPT in based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param pool Pool being exited
   * @param tokensOut Tokens provided for exiting pool
   * @param amountsOut Amounts provided for exiting pool
   * @param slippage Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
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
  }: ExitExactTokensOutParameters) => ExitPoolAttributes;

  buildExitSingleTokenOut?: ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInSingleTokenOutParameters) => ExitPoolAttributes;
}

export interface CreateConcern {
  /**
   * Build create pool transaction
   * @param signer Signer from the provider
   * @param name Name of the pool
   * @param symbol ???
   * @param swapFee The fee that will be applied to all the swaps in the pool
   * @param tokens An Array containing the seed tokens of the pool
   * @param ownerAddress The address of the owner of the pool
   * @returns transaction request ready to send with signer.sendTransaction
   */
  createPool?: ({
    signer,
    name,
    symbol,
    swapFee,
    tokens,
    ownerAddress,
  }: CreatePoolParameters) => TransactionResponse;
}

export interface JoinPool {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequest;
}

export interface JoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
  minBPTOut: string;
}

export interface InitJoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
}

export interface InitJoinPoolParameters {
  joiner: string;
  pool: Pool;
  tokensIn: string[];
  amountsIn: string[];
  wrappedNativeAsset: string;
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
  minAmountsOut: string[];
  maxBPTIn: string;
}

export interface ExitExactBPTInParameters {
  exiter: string;
  pool: Pool;
  bptIn: string;
  slippage: string;
  shouldUnwrapNativeAsset: boolean;
  wrappedNativeAsset: string;
  singleTokenMaxOut?: string;
}

export interface ExitExactBPTInSingleTokenOutParameters {
  exiter: string;
  pool: Pool;
  bptIn: string;
  slippage: string;
  shouldUnwrapNativeAsset: boolean;
  wrappedNativeAsset: string;
  singleTokenMaxOut: string;
}

export interface ExitExactTokensOutParameters {
  exiter: string;
  pool: Pool;
  tokensOut: string[];
  amountsOut: string[];
  slippage: string;
  wrappedNativeAsset: string;
}

export interface CreatePoolParameters {
  signer: JsonRpcSigner;
  name: string;
  symbol: string;
  swapFee: string;
  tokens: PoolSeedToken[];
  ownerAddress: string;
}
