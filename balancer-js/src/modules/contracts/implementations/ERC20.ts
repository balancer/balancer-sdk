import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import abi from '../../../lib/abi/ERC20.json';

export const ERC20 = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => new Contract(address, abi, signerOrProvider);
