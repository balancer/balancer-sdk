import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import {
  RelayerV3__factory,
  RelayerV4__factory,
  RelayerV5__factory,
} from '@/contracts';

export const Relayer = (
  address: string,
  provider: Provider,
  version: number
): Contract => {
  switch (version) {
    case 3:
      return new Contract(
        address,
        RelayerV3__factory.createInterface(),
        provider
      );
    case 4:
      return new Contract(
        address,
        RelayerV4__factory.createInterface(),
        provider
      );
    case 5:
      return new Contract(
        address,
        RelayerV5__factory.createInterface(),
        provider
      );
    default:
      throw new Error('relayer not supported');
  }
};
