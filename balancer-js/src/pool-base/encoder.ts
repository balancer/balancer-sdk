import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';

// RECOVERY_MODE must match BasePoolUserData.RECOVERY_MODE_EXIT_KIND, the value that (Legacy)BasePool uses to detect the special exit enabled in recovery mode.
enum BasePoolExitKind {
  RECOVERY_MODE = 255,
}

export class BasePoolEncoder {
  /**
   * Encodes the userData parameter for exiting any Pool in recovery mode, by removing tokens in return for
   * an exact amount of BPT
   * @param bptAmountIn - the amount of BPT to be burned
   */
  static recoveryModeExit = (bptAmountIn: BigNumberish): string =>
    defaultAbiCoder.encode(
      ['uint256', 'uint256'],
      [BasePoolExitKind.RECOVERY_MODE, bptAmountIn]
    );
}
