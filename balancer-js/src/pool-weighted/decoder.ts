import { defaultAbiCoder, Result } from '@ethersproject/abi';

export class WeightedPoolDecoder {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  }

  /**
   * Decodes the userData parameter for providing the initial liquidity to a WeightedPool
   * @param data - encoded data
   */
  static joinInit = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]'], data);

  /**
   * Decodes the userData parameter for joining a WeightedPool with exact token inputs
   * @param data - encoded data
   */
  static joinExactTokensInForBPTOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]', 'uint256'], data);

  /**
   * Decodes the userData parameter for joining a WeightedPool with a single token to receive an exact amount of BPT
   * @param data - encoded data
   */
  static joinTokenInForExactBPTOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for joining a WeightedPool proportionally to receive an exact amount of BPT
   * @param data - encoded data
   */
  static joinAllTokensInForExactBPTOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a WeightedPool by removing a single token in return for an exact amount of BPT
   * @param data - encoded data
   */
  static exitExactBPTInForOneTokenOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
   * @param data - encoded data
   *
   */
  static exitExactBPTInForTokensOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a WeightedPool by removing exact amounts of tokens
   * @param data - encoded data
   */
  static exitBPTInForExactTokensOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]', 'uint256'], data);
}
