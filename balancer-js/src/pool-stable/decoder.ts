import { defaultAbiCoder, Result } from '@ethersproject/abi';

export class StablePoolDecoder {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  }

  /**
   * Decodes the userData parameter for providing the initial liquidity to a StablePool
   * @param data - encoded data
   */
  static joinInit = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]'], data);

  /**
   * Decodes the userData parameter for collecting protocol fees for StablePhantomPool
   * @param data - encoded data
   */
  static joinCollectProtocolFees = (data: string): Result =>
    defaultAbiCoder.decode(['uint256'], data);

  /**
   * Decodes the userData parameter for joining a StablePool with exact token inputs
   * @param data - encoded data
   */
  static joinExactTokensInForBPTOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]', 'uint256'], data);

  /**
   * Decodes the userData parameter for joining a StablePool with a single token to receive an exact amount of BPT
   * @param data - encoded data
   */
  static joinTokenInForExactBPTOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a StablePool by removing a single token in return for an exact amount of BPT
   * @param data - encoded data
   */
  static exitExactBPTInForOneTokenOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a StablePool by removing tokens in return for an exact amount of BPT
   * @param data - encoded data
   *
   */
  static exitExactBPTInForTokensOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256'], data);

  /**
   * Decodes the userData parameter for exiting a StablePool by removing exact amounts of tokens
   * @param data - encoded data
   */
  static exitBPTInForExactTokensOut = (data: string): Result =>
    defaultAbiCoder.decode(['uint256', 'uint256[]', 'uint256'], data);
}
