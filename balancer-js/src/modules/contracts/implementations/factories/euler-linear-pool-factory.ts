import { EulerLinearPoolFactory__factory } from '@/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';

export const EulerLinearPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
) => {
  return new Contract(
    address,
    EulerLinearPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
