import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { StaticATokenRateProvider__factory } from '@/contracts';

export class AaveHelpers {
  static async getRate(
    rateProviderAddress: string,
    provider: JsonRpcProvider
  ): Promise<string> {
    const rateProviderContract = new Contract(
      rateProviderAddress,
      StaticATokenRateProvider__factory.createInterface(),
      provider
    );

    const rate = await rateProviderContract.getRate();
    return rate.toString();
  }
}
