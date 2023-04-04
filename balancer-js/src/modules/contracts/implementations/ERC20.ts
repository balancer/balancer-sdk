import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { ERC20__factory } from '@/contracts';

export const ERC20 = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract =>
  new Contract(address, ERC20__factory.createInterface(), signerOrProvider);
