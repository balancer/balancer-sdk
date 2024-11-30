import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { StablePhantomPoolJoinKind } from '../pool-stable/index';

export enum ComposableStablePoolJoinKind {
  INIT = 0,
  EXACT_TOKENS_IN_FOR_BPT_OUT,
  TOKEN_IN_FOR_EXACT_BPT_OUT,
}

export enum ComposableStablePoolExitKind {
  EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
  BPT_IN_FOR_EXACT_TOKENS_OUT,
  EXACT_BPT_IN_FOR_ALL_TOKENS_OUT,
}

export class ComposableStablePoolEncoder {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  }

  /**
   * Encodes the userData parameter for providing the initial liquidity to a ComposableStablePool
   * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
   */
  static joinInit = (amountsIn: BigNumberish[]): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256[]'],
      [ComposableStablePoolJoinKind.INIT, amountsIn]
    );

  /**
   * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
   */
  static joinCollectProtocolFees = (): string =>
    defaultAbiCoder.encode(
      ['uint256'],
      [StablePhantomPoolJoinKind.COLLECT_PROTOCOL_FEES]
    );

  /**
   * Encodes the userData parameter for joining a ComposableStablePool with exact token inputs
   * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
   * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
   */
  static joinExactTokensInForBPTOut = (
    amountsIn: BigNumberish[],
    minimumBPT: BigNumberish
  ): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256[]', 'uint256'],
      [
        ComposableStablePoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
        amountsIn,
        minimumBPT,
      ]
    );

  /**
   * Encodes the userData parameter for joining a ComposableStablePool with to receive an exact amount of BPT
   * @param bptAmountOut - the amount of BPT to be minted
   * @param enterTokenIndex - the index of the token to be provided as liquidity
   */
  static joinTokenInForExactBPTOut = (
    bptAmountOut: BigNumberish,
    enterTokenIndex: number
  ): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'],
      [
        ComposableStablePoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT,
        bptAmountOut,
        enterTokenIndex,
      ]
    );

  /**
   * Encodes the userData parameter for exiting a ComposableStablePool by removing a single token in return for an exact amount of BPT
   * @param bptAmountIn - the amount of BPT to be burned
   * @param enterTokenIndex - the index of the token to removed from the pool
   */
  static exitExactBPTInForOneTokenOut = (
    bptAmountIn: BigNumberish,
    exitTokenIndex: number
  ): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'],
      [
        ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
        bptAmountIn,
        exitTokenIndex,
      ]
    );

  /**
   * Encodes the userData parameter for exiting a StablePool by removing tokens in return for an exact amount of BPT
   * @param bptAmountIn - the amount of BPT to be burned
   */
  static exitExactBPTInForTokensOut = (bptAmountIn: BigNumberish): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256'],
      [
        ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ALL_TOKENS_OUT,
        bptAmountIn,
      ]
    );

  /**
   * Encodes the userData parameter for exiting a ComposableStablePool by removing exact amounts of tokens
   * @param amountsOut - the amounts of each token to be withdrawn from the pool
   * @param maxBPTAmountIn - the max acceptable BPT to burn in return for withdrawn tokens
   */
  static exitBPTInForExactTokensOut = (
    amountsOut: BigNumberish[],
    maxBPTAmountIn: BigNumberish
  ): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256[]', 'uint256'],
      [
        ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT,
        amountsOut,
        maxBPTAmountIn,
      ]
    );
}
