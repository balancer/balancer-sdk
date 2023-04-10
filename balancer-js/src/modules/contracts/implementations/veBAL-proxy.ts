import { Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { formatUnits } from '@ethersproject/units';

import { VeDelegationProxy__factory } from '@/contracts';
import { ContractAddresses } from '@/types';

export class VeBalProxy {
  instance: Contract;

  constructor(addresses: ContractAddresses, provider: Provider) {
    if (!addresses.veBalProxy)
      throw new Error('veBalProxy address must be defined');
    this.instance = VeDelegationProxy__factory.connect(
      addresses.veBalProxy,
      provider
    );
  }

  async getAdjustedBalance(account: string): Promise<string> {
    const balance = await this.instance.adjustedBalanceOf(account);
    return formatUnits(balance);
  }
}
