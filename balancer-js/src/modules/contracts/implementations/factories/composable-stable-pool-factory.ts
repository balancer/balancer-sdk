import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { ComposableStableFactory__factory } from '@/contracts';

export const ComposableStablePoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    ComposableStableFactory__factory.createInterface(),
    signerOrProvider
  );
};
