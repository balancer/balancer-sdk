import { Interface } from '@ethersproject/abi';
import { formatUnits } from '@ethersproject/units';
import { Multicall } from '@/contracts';
import { Network } from '@/types';

export const yieldTokens = {
  [Network.MAINNET]: {
    waUSDT: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
    waUSDC: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
    waDAI: '0x02d60b84491589974263d922d9cc7a3152618ef6',
  },
  [Network.POLYGON]: {
    wamDAI: '0xee029120c72b0607344f35b17cdd90025e647b00',
    wamUSDC: '0x221836a597948dce8f3568e044ff123108acc42a',
    wamUSDT: '0x19c60a251e525fa88cd6f3768416a8024e98fc19',
  },
};

export const wrappedTokensMap = {
  [Network.MAINNET]: {
    // USDT
    [yieldTokens[Network.MAINNET].waUSDT]: {
      aToken: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
      underlying: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // USDC
    [yieldTokens[Network.MAINNET].waUSDC]: {
      aToken: '0xbcca60bb61934080951369a648fb03df4f96263c',
      underlying: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    // DAI
    [yieldTokens[Network.MAINNET].waDAI]: {
      aToken: '0x028171bca77440897b824ca71d1c56cac55b68a3',
      underlying: '0x6b175474e89094c44da98b954eedeac495271d0f',
    },
  },
  [Network.POLYGON]: {
    // USDT
    [yieldTokens[Network.POLYGON].wamUSDT]: {
      aToken: '0x60d55f02a771d515e077c9c2403a1ef324885cec',
      underlying: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    },
    // USDC
    [yieldTokens[Network.POLYGON].wamUSDC]: {
      aToken: '0x1a13f4ca1d028320a707d99520abfefca3998b7f',
      underlying: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    },
    // DAI
    [yieldTokens[Network.POLYGON].wamDAI]: {
      aToken: '0x27f8d03b3a2196956ed754badc28d73be8830a6e',
      underlying: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    },
  },
};

const wrappedATokenInterface = new Interface([
  'function rate() view returns (uint256)',
]);

export interface IAaveRates {
  getRate: (address: string) => Promise<number>;
}

export class AaveRates implements IAaveRates {
  rates?: Promise<{ [wrappedATokenAddress: string]: number }>;

  constructor(private multicall: Multicall, private network: Network) {}

  private async fetch(
    network: Network.MAINNET | Network.POLYGON
  ): Promise<{ [wrappedATokenAddress: string]: number }> {
    console.time('Fetching aave rates');
    const addresses = Object.values(yieldTokens[network]);
    const payload = addresses.map((wrappedATokenAddress) => ({
      target: wrappedATokenAddress,
      callData: wrappedATokenInterface.encodeFunctionData('rate', []),
    }));
    const [, res] = await this.multicall.callStatic.aggregate(payload);

    const rates = addresses.reduce((p: { [key: string]: number }, a, i) => {
      p[a] ||= res[i] == '0x' ? 0 : parseFloat(formatUnits(res[i], 27));
      return p;
    }, {});
    console.timeEnd('Fetching aave rates');

    return rates;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRate(wrappedAToken: string): Promise<number> {
    //To prevent bricked linear pools from effecting this call
    /*if (this.network != Network.MAINNET && this.network != Network.POLYGON) {
      return 1;
    }
    if (!Object.values(yieldTokens[this.network]).includes(wrappedAToken)) {
      return 1;
    }
    if (!this.rates) {
      this.rates = this.fetch(this.network);
    }

    return (await this.rates)[wrappedAToken];*/

    return 1;
  }
}
