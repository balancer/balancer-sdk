import { Network } from '@/lib/constants/network';

/**
 * TYPES
 */
type CommonTokens = {
  nativeAsset: string;
  wNativeAsset: string;
  WETH: string;
  BAL: string;
  bbaUSD?: string;
  bbaUSDv2?: string;
};

type TokenConstants = {
  Popular: {
    Symbols: string[];
  };
  Addresses: CommonTokens;
  PriceChainMap?: Record<string, string>;
};

/**
 * CONSTANTS
 */
export const DEFAULT_TOKEN_DECIMALS = 18;

export const TOKENS_MAINNET: TokenConstants = {
  Popular: {
    Symbols: ['WBTC', 'DAI', 'USDC', 'BAL', 'AAVE', 'WETH'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    BAL: '0xba100000625a3754423978a60c9317c58a424e3d',
    bbaUSD: '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2',
    bbaUSDv2: '0xA13a9247ea42D743238089903570127DdA72fE44',
  },
};

export const TOKENS_POLYGON: TokenConstants = {
  Popular: {
    Symbols: ['WBTC', 'DAI', 'USDC', 'BAL', 'AAVE', 'WETH'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    BAL: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
  },
};

export const TOKENS_ARBITRUM: TokenConstants = {
  Popular: {
    Symbols: ['WBTC', 'DAI', 'USDC', 'BAL', 'AAVE', 'WETH'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    BAL: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
  },
};

export const TOKENS_GNOSIS: TokenConstants = {
  Popular: {
    Symbols: ['xDAI', 'WXDAI', 'WETH', 'BAL'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    WETH: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
    BAL: '0x7eF541E2a22058048904fE5744f9c7E4C57AF717',
  },
};

export const TOKENS_BSC: TokenConstants = {
  Popular: {
    Symbols: ['WBNB', 'MATIC', 'BUSD'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    WETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    BAL: '0x0000000000000000000000000000000000000000',
  },
};

export const TOKENS_BSCTESTNET: TokenConstants = {
  Popular: {
    Symbols: ['WBNB', 'BUSD', 'MATIC'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xE906CBeCd4A17DF62B8d6c8C82F3882af25295f5',
    WETH: '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378',
    BAL: '0x0000000000000000000000000000000000000000',
  },
  PriceChainMap: {
    /**
     * Addresses must be lower case and map from bsc-testnet to bsc, e.g
     * [bsc-testnet address]: bsc address
     */
    // WBNB
    '0xe906cbecd4a17df62b8d6c8c82f3882af25295f5':
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    // DAI
    '0xec5dcb5dbf4b114c9d0f65bccab49ec54f6a0867':
      '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    // USDC
    '0x64544969ed7ebf5f083679233325356ebe738930':
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    // USDT
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd':
      '0x55d398326f99059ff775485246999027b3197955',
    // BUSD
    '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee':
      '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    // BTC
    '0x6ce8da28e2f864420840cf74474eff5fd80e65b8':
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    // ETH
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378':
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    // XRP
    '0xa83575490d7df4e2f47b7d38ef351a2722ca45b9':
      '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe',
    // DOT
    '0x5ba18625a9e42f9e4755c5389af65070d818542f':
      '0x7083609fce4d1d8dc0c979aab8c869ea2c873402',
    // DOGE
    '0x92dd70182813cd3da0f1b1eac914bad6e0ed7afd':
      '0xba2ae424d960c26247dd6c32edc70b295c744c43',
    // ADA
    '0x8197e8f4c358b9be57a09c6063ba4591ea502e98':
      '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47',
    // AVAX
    '0x14d440cd12f99b676491cd6e7e606ad0f7ea9c51':
      '0x1ce0c2827e2ef14d5c4f29a091d735a204794041',
    // MATIC
    '0x2397355a668bb2b8b70a2873f1eb559b21ed1a8d':
      '0xcc42724c6683b7e57334c4e856f4c9965ed682bd',
    // LTC
    '0xd11a7f26576dfd64ca94b7092402642516c7603e':
      '0x4338665cbb7b2485a8855a139b75d5e34ab0db94',
    // SHIB
    '0xb655afdda2a8f60126dfc8a7ae2795b100e66178':
      '0x2859e4544c4bb03966803b044a93563bd2d0dd4d',
    // TRX
    '0xbb4b4004869ee0a6942a6a5a0657c32a632b38ed':
      '0x85eac5ac2f758618dfa09bdbe0cf174e7d574d5b',
    // UNI
    '0x0dcaf36c5774a04ea721069f0244076226ae0968':
      '0xbf5140a22578168fd562dccf235e5d43a02ce9b1',
    // ATOM
    '0x797df1c15eb8a1fdbe81ce118c4a787699bb0c2e':
      '0x0eb3a705fc54725037cc9e008bdede697f62f335',
    // LINK
    '0xdf2b91419d08bf3f70ebdaa45175c4485540e3b3':
      '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
    // EOS
    '0xfe67f0bc56c3c84fdac21788799f6dc1952be683':
      '0x56b6fb708fc5732dec1afc8d8556423a2edccbd6',
    // CAKE
    '0x243f7a225930392e9c206f25ba9200862f7fe8f8':
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    // BCH
    '0x6d81740a0aef5ba3fa2c3ff8e49438d00a13afed':
      '0x8ff795a6f4d97e7887c79bea79aba5cc76444adf',
    // 1INCH
    '0x5fc243e2a22eead26b2ee1d31ed702f3970fb738':
      '0x111111111117dc0aa78b770fa6a738034120c302',
  },
};

export const TOKENS_GOERLI: TokenConstants = {
  Popular: {
    Symbols: ['WBTC', 'DAI', 'USDC', 'BAL', 'USDT', 'WETH'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
    WETH: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
    BAL: '0xfA8449189744799aD2AcE7e0EBAC8BB7575eff47',
    bbaUSD: '0x13ACD41C585d7EbB4a9460f7C8f50BE60DC080Cd',
  },
  PriceChainMap: {
    /**
     * Addresses must be lower case and map from goerli to mainnet, e.g
     * [goerli address]: mainnet address
     */
    '0xdfcea9088c8a88a76ff74892c1457c17dfeef9c1':
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0x37f03a12241e9fd3658ad6777d289c3fb8512bc9':
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    '0xfa8449189744799ad2ace7e0ebac8bb7575eff47':
      '0xba100000625a3754423978a60c9317c58a424e3d',
    '0xe0c9275e44ea80ef17579d33c55136b7da269aeb':
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0x8c9e6c40d3402480ace624730524facc5482798c':
      '0x6b175474e89094c44da98b954eedeac495271d0f',
    '0x1f1f156e0317167c11aa412e3d1435ea29dc3cce':
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '0x4cb1892fddf14f772b2e39e299f44b2e5da90d04':
      '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
    '0x811151066392fd641fe74a9b55a712670572d161':
      '0xbcca60bb61934080951369a648fb03df4f96263c',
    '0x89534a24450081aa267c79b07411e9617d984052':
      '0x028171bca77440897b824ca71d1c56cac55b68a3',
    '0x829f35cebbcd47d3c120793c12f7a232c903138b':
      '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    '0xff386a3d08f80ac38c77930d173fa56c6286dc8b':
      '0x6810e776880c02933d47db1b9fc05908e5386b96',
  },
};

export const TOKENS_GENERIC: TokenConstants = {
  Popular: {
    Symbols: ['WBTC', 'DAI', 'USDC', 'BAL', 'AAVE', 'WETH'],
  },
  Addresses: {
    nativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wNativeAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0x0000000000000000000000000000000000000000',
    BAL: '0x0000000000000000000000000000000000000000',
  },
};

export const TOKENS_MAP = {
  [Network.GOERLI]: TOKENS_GOERLI,
  [Network.MAINNET]: TOKENS_MAINNET,
  [Network.POLYGON]: TOKENS_POLYGON,
  [Network.ARBITRUM]: TOKENS_ARBITRUM,
  [Network.GNOSIS]: TOKENS_GNOSIS,
  [Network.BSC]: TOKENS_BSC,
  [Network.BSCTESTNET]: TOKENS_BSCTESTNET,
};

export function TOKENS(networkId: Network): TokenConstants {
  const id = networkId as keyof typeof TOKENS_MAP;
  return TOKENS_MAP[id] ? TOKENS_MAP[id] : TOKENS_GENERIC;
}
