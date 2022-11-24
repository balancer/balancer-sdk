import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import RelayerV4ABI from '@/lib/abi/RelayerV4.json';
import RelayerV3ABI from '@/lib/abi/BalancerRelayer.json';

export const Relayer = (
  address: string,
  provider: Provider,
  version: number
): Contract => {
  switch (version) {
    case 3:
      return new Contract(address, RelayerV3ABI, provider);
    case 4:
      return new Contract(address, RelayerV4ABI, provider);
    default:
      throw new Error('relayer not supported');
  }
};
