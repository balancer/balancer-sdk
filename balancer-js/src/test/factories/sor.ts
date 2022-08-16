import { Factory } from 'fishery';
import {
  SubgraphPoolBase,
  SubgraphToken,
  SwapInfo,
  SwapV2,
} from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

const swapV2 = Factory.define<SwapV2>(() => ({
  poolId: '0xe2957c36816c1033e15dd3149ddf2508c3cfe79076ce4bde6cb3ecd34d4084b4',
  assetInIndex: 0,
  assetOutIndex: 1,
  amount: '1000000000000000000',
  userData: '0x',
}));

const swapInfo = Factory.define<SwapInfo>(() => ({
  swaps: [swapV2.build()],
  tokenAddresses: [
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    '0x0000000000000000000000000000000000000000',
  ],
  tokenIn: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  tokenOut: '0x0000000000000000000000000000000000000000',
  marketSp: '1',
  swapAmount: BigNumber.from('1000000000000000000'),
  swapAmountForSwaps: BigNumber.from('1000000000000000000'),
  returnAmount: BigNumber.from('1000000000000000000'),
  returnAmountFromSwaps: BigNumber.from('1000000000000000000'),
  returnAmountConsideringFees: BigNumber.from('1000000000000000000'),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const namedTokens: Record<string, any> = {
  wETH: {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    decimals: 18,
  },
  wBTC: {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
  },
  DAI: {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
  },
  aDAI: {
    address: '0x02d60b84491589974263d922d9cc7a3152618ef6',
    decimals: 18,
  },
  bDAI: {
    address: '0x804cdb9116a10bb78768d3252355a1b18067bf8f',
    decimals: 18,
  },
  USDC: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
  },
  aUSDC: {
    address: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
    decimals: 18,
  },
  bUSDC: {
    address: '0x9210f1204b5a24742eba12f710636d76240df3d0',
    decimals: 18,
  },
  USDT: {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
  },
  aUSDT: {
    address: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
    decimals: 18,
  },
  bUSDT: {
    address: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c',
    decimals: 18,
  },
};

const subgraphToken = Factory.define<SubgraphToken>(({ transientParams }) => {
  const { symbol, balance = '1', weight = '1', address } = transientParams;
  let namedToken = namedTokens[symbol];
  if (!namedToken) {
    namedToken = {};
    namedToken.address = address ?? `address_${symbol}`;
    namedToken.decimals = 18;
  }
  return {
    ...namedToken,
    balance,
    priceRate: '1',
    weight,
    symbol,
  };
});

const subgraphPoolBase = Factory.define<SubgraphPoolBase>(
  ({ params, afterBuild }) => {
    afterBuild((pool) => {
      pool.tokensList = pool.tokens.map((t) => t.address);
    });

    const tokens = params.tokens || [
      subgraphToken.transient({ symbol: 'wETH' }).build(),
      subgraphToken.transient({ symbol: 'wBTC' }).build(),
    ];

    return {
      id: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
      address: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
      poolType: 'Weighted',
      swapFee: '0.001',
      swapEnabled: true,
      tokens,
      tokensList: [],
      totalWeight: '1',
      totalShares: '1',
    };
  }
);

export { swapInfo, swapV2, subgraphPoolBase, subgraphToken };
