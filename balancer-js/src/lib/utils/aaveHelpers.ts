import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

import aTokenRateProviderAbi from '../abi/StaticATokenRateProvider.json';

export class AaveHelpers {
  static async getRate(
    rateProviderAddress: string,
    provider: JsonRpcProvider
  ): Promise<string> {
    const rateProviderContract = new Contract(
      rateProviderAddress,
      aTokenRateProviderAbi,
      provider
    );

    const rate = await rateProviderContract.getRate();
    return rate.toString();
  }
}
