import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';

const multicallAbi = [
  'function claimTokens(address user, address[] tokens) returns (uint256[])',
  'function claimToken(address user, address token) returns (uint256)'
];

export const FeeDistributor = (address: string, provider: Provider): Contract =>
  new Contract(address, multicallAbi, provider);
