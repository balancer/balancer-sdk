import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';

const abi = [
  'function getPoolId() view returns (bytes32)',
  'function getSwapFeePercentage() view returns (uint256)',
  'function getProtocolFeesCollector() view returns (address)',
  'function inRecoveryMode() view returns (bool)',
];

export const BasePool = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => new Contract(address, abi, signerOrProvider);
