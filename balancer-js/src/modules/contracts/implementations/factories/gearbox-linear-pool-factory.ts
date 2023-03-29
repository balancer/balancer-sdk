import { GearboxLinearPoolFactory__factory } from '@/contracts';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';

export const GearboxLinearPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    GearboxLinearPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
