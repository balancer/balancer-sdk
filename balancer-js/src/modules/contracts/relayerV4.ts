import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import abi from '../../lib/abi/RelayerV4.json';

export const RelayerV4 = (address: string, provider: Provider): Contract =>
  new Contract(address, abi, provider);
