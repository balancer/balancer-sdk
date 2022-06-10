import { Network } from '@/lib/constants/network';
import { AddressZero } from '@ethersproject/constants';

export const ADDRESSES = {
  [Network.MAINNET]: {
    BatchRelayer: {
      address: '0xdcdbf71A870cc60C6F9B621E28a7D3Ffd6Dd4965',
    },
    ETH: {
      address: AddressZero,
      decimals: 18,
      symbol: 'ETH',
    },
    BAL: {
      address: '0xba100000625a3754423978a60c9317c58a424e3d',
      decimals: 18,
      symbol: 'BAL',
    },
    USDC: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
      symbol: 'USDC',
    },
    WBTC: {
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      decimals: 8,
      symbol: 'WBTC',
    },
    WETH: {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      decimals: 18,
      symbol: 'WETH',
    },
    DAI: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      decimals: 18,
      symbol: 'DAI',
    },
    STETH: {
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      decimals: 18,
      symbol: 'STETH',
    },
    wSTETH: {
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      decimals: 18,
      symbol: 'wSTETH',
    },
    bbausd: {
      address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
      decimals: 18,
      symbol: 'bbausd',
    },
    bbausdc: {
      address: '0x9210F1204b5a24742Eba12f710636D76240dF3d0',
      decimals: 18,
      symbol: 'bbausdc',
    },
    waDAI: {
      address: '0x02d60b84491589974263d922d9cc7a3152618ef6',
      decimals: 18,
      symbol: 'waDAI',
    },
    waUSDC: {
      address: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
      decimals: 6,
      symbol: 'waUSDC',
    },
  },
  [Network.KOVAN]: {
    // Visit https://balancer-faucet.on.fleek.co/#/faucet for test tokens
    BatchRelayer: {
      address: '0x41B953164995c11C81DA73D212ED8Af25741b7Ac',
    },
    ETH: {
      address: AddressZero,
      decimals: 18,
      symbol: 'ETH',
    },
    BAL: {
      address: '0x41286Bb1D3E870f3F750eB7E1C25d7E48c8A1Ac7',
      decimals: 18,
      symbol: 'BAL',
    },
    USDC: {
      address: '0xc2569dd7d0fd715B054fBf16E75B001E5c0C1115',
      decimals: 6,
      symbol: 'USDC',
    },
    WBTC: {
      address: '0x1C8E3Bcb3378a443CC591f154c5CE0EBb4dA9648',
      decimals: 8,
      symbol: 'WBTC',
    },
    WETH: {
      address: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
      decimals: 18,
      symbol: 'WETH',
    },
    DAI: {
      address: '0x04DF6e4121c27713ED22341E7c7Df330F56f289B',
      decimals: 18,
      symbol: 'DAI',
    },
    STETH: {
      address: '0x4803bb90d18a1cb7a2187344fe4feb0e07878d05',
      decimals: 18,
      symbol: 'STETH',
    },
    wSTETH: {
      address: '0xa387b91e393cfb9356a460370842bc8dbb2f29af',
      decimals: 18,
      symbol: 'wSTETH',
    },
    USDT_from_AAVE: {
      address: '0x13512979ade267ab5100878e2e0f485b568328a4',
      decimals: 6,
      symbol: 'USDT_from_AAVE',
    },
    aUSDT: {
      address: '0xe8191aacfcdb32260cda25830dc6c9342142f310',
      decimals: 6,
      symbol: 'aUSDT',
    },
    bUSDT: {
      address: '0xe667d48618e71c2a02e4a1b66ed9def1426938b6',
      decimals: 18,
      symbol: 'bUSDT',
    },
    USDC_from_AAVE: {
      address: '0xe22da380ee6b445bb8273c81944adeb6e8450422',
      decimals: 6,
      symbol: 'USDC_from_AAVE',
    },
    aUSDC: {
      address: '0x0fbddc06a4720408a2f5eb78e62bc31ac6e2a3c4',
      decimals: 6,
      symbol: 'aUSDC',
    },
    DAI_from_AAVE: {
      address: '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd',
      decimals: 18,
      symbol: 'DAI_from_AAVE',
    },
    bDAI: {
      address: '0xfcccb77a946b6a3bd59d149f083b5bfbb8004d6d',
      decimals: 18,
      symbol: 'bDAI',
    },
    STABAL3: {
      address: '0x8fd162f338b770f7e879030830cde9173367f301',
      decimals: 18,
      symbol: 'STABAL3',
    },
  },
  [Network.POLYGON]: {
    MATIC: {
      address: AddressZero,
      decimals: 18,
      symbol: 'MATIC',
    },
    LINK: {
      address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
      decimals: 18,
      symbol: 'LINK',
    },
    BAL: {
      address: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
      decimals: 18,
      symbol: 'BAL',
    },
    USDC: {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      decimals: 6,
      symbol: 'USDC',
    },
    WBTC: {
      address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
      decimals: 8,
      symbol: 'WBTC',
    },
    WETH: {
      address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
      decimals: 18,
      symbol: 'WETH',
    },
    DAI: {
      address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
      decimals: 18,
      symbol: 'DAI',
    },
    STETH: {
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      decimals: 18,
      symbol: 'STETH',
    },
    stUSD_PLUS: {
      address: '0x5a5c6aa6164750b530b8f7658b827163b3549a4d',
      decimals: 6,
      symbol: 'stUSD+',
    },
    bstUSD_PLUS: {
      address: '0x1aafc31091d93c3ff003cff5d2d8f7ba2e728425',
      decimals: 18,
      symbol: 'bstUSD+',
    },
    USD_PLUS: {
      address: '0x5d9d8509c522a47d9285b9e4e9ec686e6a580850',
      decimals: 6,
      symbol: 'USD_PLUS',
    },
    USDT: {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
      symbol: 'USDT',
    },
    DHT: {
      address: '0x8C92e38eCA8210f4fcBf17F0951b198Dd7668292',
      decimals: 18,
      symbol: 'DHT',
    },
    dUSD: {
      address: '0xbAe28251B2a4E621aA7e20538c06DEe010Bc06DE',
      decimals: 18,
      symbol: 'dUSD',
    },
  },
  [Network.ARBITRUM]: {
    WETH: {
      address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      decimals: 18,
      symbol: 'WETH',
    },
    BAL: {
      address: '0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8',
      decimals: 18,
      symbol: 'BAL',
    },
    USDC: {
      address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
      decimals: 6,
      symbol: 'USDC',
    },
    STETH: {
      address: 'N/A',
      decimals: 18,
      symbol: 'STETH',
    },
  },
};
