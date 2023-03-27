import { YearnLinearPoolFactory__factory } from '@/contracts';
import { Contract } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/providers';

export const YearnLinearPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => {
  return new Contract(
    address,
    YearnLinearPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
