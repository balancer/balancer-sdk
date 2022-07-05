import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';

const multicallAbi = [
  'function aggregate(tuple[](address target, bytes callData) memory calls) public view returns (uint256 blockNumber, bytes[] memory returnData)',
];

export const Multicall = (address: string, provider: Provider): Contract =>
  new Contract(address, multicallAbi, provider);
