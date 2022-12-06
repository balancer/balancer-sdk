import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { Multicall } from '@/modules/contracts/implementations/multicall';
import { yieldTokens } from '../token-yields/tokens/aave';
import { Network } from '@/types';

const wrappedATokenInterface = new Interface([
  'function rate() view returns (uint256)',
]);

export interface IAaveRates {
  getRate: (address: string) => Promise<number>;
}

export class AaveRates implements IAaveRates {
  multicall: Contract;
  rates?: Promise<{ [wrappedATokenAddress: string]: number }>;

  constructor(
    multicallAddress: string,
    provider: Provider,
    private network: Network
  ) {
    this.multicall = Multicall(multicallAddress, provider);
  }

  private async fetch(
    network: Network.MAINNET | Network.POLYGON
  ): Promise<{ [wrappedATokenAddress: string]: number }> {
    console.time('Fetching aave rates');
    const addresses = Object.values(yieldTokens[network]);
    const payload = addresses.map((wrappedATokenAddress) => [
      wrappedATokenAddress,
      wrappedATokenInterface.encodeFunctionData('rate', []),
    ]);
    const [, res] = await this.multicall.aggregate(payload);

    const rates = addresses.reduce((p: { [key: string]: number }, a, i) => {
      p[a] ||= res[i] == '0x' ? 0 : parseFloat(formatUnits(res[i], 27));
      return p;
    }, {});
    console.timeEnd('Fetching aave rates');

    return rates;
  }

  async getRate(wrappedAToken: string): Promise<number> {
    if (this.network != Network.MAINNET && this.network != Network.POLYGON) {
      return 1;
    }
    if (!Object.values(yieldTokens[this.network]).includes(wrappedAToken)) {
      return 1;
    }
    if (!this.rates) {
      this.rates = this.fetch(this.network);
    }

    return (await this.rates)[wrappedAToken];
  }
}
