import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { BalancerRelayer__factory } from '@/contracts/factories/BalancerRelayer__factory';

export const Relayer = (address: string, provider: Provider): Contract => {
  return BalancerRelayer__factory.connect(address, provider);
};
