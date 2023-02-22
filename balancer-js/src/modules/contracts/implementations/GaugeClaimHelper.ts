import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import abi from '@/lib/abi/GaugeClaimHelper.json';

export const GaugeClaimHelper = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => new Contract(address, abi, signerOrProvider);
