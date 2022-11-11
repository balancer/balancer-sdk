import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import abi from '@/lib/abi/LiquidityGaugeV5.json';

export const LiquidityGauge = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract => new Contract(address, abi, signerOrProvider);
