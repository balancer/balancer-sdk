import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { ERC4626LinearPoolFactory__factory } from '@/contracts';
import { Contract } from '@ethersproject/contracts';

export const Erc4626LinearPoolFactory = (
  address: string,
  signerOrProvider: Signer | Provider
) => {
  return new Contract(
    address,
    ERC4626LinearPoolFactory__factory.createInterface(),
    signerOrProvider
  );
};
