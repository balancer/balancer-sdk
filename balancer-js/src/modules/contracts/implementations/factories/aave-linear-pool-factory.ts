import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { AaveLinearPoolFactory__factory } from '@/contracts';

export const AaveLinearPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    AaveLinearPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
