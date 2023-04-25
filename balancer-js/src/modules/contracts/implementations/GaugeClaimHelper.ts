import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { GaugeClaimHelper__factory } from '@/contracts';

export const GaugeClaimHelper = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract =>
  new Contract(
    address,
    GaugeClaimHelper__factory.createInterface(),
    signerOrProvider
  );
