import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { WeightedPoolFactory__factory } from '@/contracts';

export const WeightedPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    WeightedPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
