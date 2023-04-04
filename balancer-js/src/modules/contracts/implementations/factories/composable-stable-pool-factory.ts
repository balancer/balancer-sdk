import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { ComposableStablePoolFactory__factory } from '@/contracts';

export const ComposableStablePoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    ComposableStablePoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
