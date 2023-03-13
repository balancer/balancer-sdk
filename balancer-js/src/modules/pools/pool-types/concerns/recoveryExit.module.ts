import { defaultAbiCoder } from '@ethersproject/abi';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { Pool } from '@/types';
import { ExitPool, ExitPoolAttributes } from './types';

// RECOVERY_MODE must match BasePoolUserData.RECOVERY_MODE_EXIT_KIND, the value that (Legacy)BasePool uses to detect the special exit enabled in recovery mode.
enum BasePoolExitKind {
  RECOVERY_MODE = 255,
}

export function buildRecoveryExit(
  pool: Pool,
  sender: string,
  recipient: string,
  bptAmountIn: string,
  minAmountsOut: string[]
): ExitPoolAttributes {
  const userData = defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [BasePoolExitKind.RECOVERY_MODE, bptAmountIn]
  );
  // --- encode exitPool
  const to = balancerVault;
  const functionName = 'exitPool';
  const attributes: ExitPool = {
    poolId: pool.id,
    sender,
    recipient,
    exitPoolRequest: {
      assets: pool.tokensList,
      minAmountsOut,
      userData,
      toInternalBalance: false,
    },
  };
  // Encode transaction data into an ABI byte string which can be sent to the network to be executed
  const vaultInterface = Vault__factory.createInterface();
  const data = vaultInterface.encodeFunctionData(functionName, [
    attributes.poolId,
    attributes.sender,
    attributes.recipient,
    attributes.exitPoolRequest,
  ]);
  return { data, to, functionName, attributes };
}
