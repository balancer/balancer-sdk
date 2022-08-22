import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import abi from '../../lib/abi/ERC20.json';

export const ERC20 = (address: string, provider: Provider): Contract =>
  new Contract(address, abi, provider);
