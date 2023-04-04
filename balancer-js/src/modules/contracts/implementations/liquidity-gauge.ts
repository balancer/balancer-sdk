import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { LiquidityGaugeV5__factory } from '@/contracts';

export const LiquidityGauge = (
  address: string,
  signerOrProvider: Signer | Provider
): Contract =>
  new Contract(
    address,
    LiquidityGaugeV5__factory.createInterface(),
    signerOrProvider
  );
