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
    wNativeAsset: '0x931Bf638fC27499506a4C1446e5f905b0EC73C81',
    WETH: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
    BAL: '0x0000000000000000000000000000000000000000',
  },
  PriceChainMap: {
    /**
     * Addresses must be lower case and map from bsc-testnet to bsc, e.g
     * [bsc-testnet address]: bsc address
     */
    // WBNB
    '0xE906CBeCd4A17DF62B8d6c8C82F3882af25295f5':
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    // DAI
    '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867':
      '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    // USDC
    '0x64544969ed7EBf5f083679233325356EbE738930':
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    // USDT
    '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd':
      '0x55d398326f99059ff775485246999027b3197955',
    // BUSD
    '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee':
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    // BTC
    '0x6ce8dA28E2f864420840cF74474eFf5fD80E65B8':
      '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    // ETH
    '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378':
      '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    // XRP
    '0xa83575490D7df4E2F47b7D38ef351a2722cA45b9':
      '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    // DOT
    '0x5Ba18625A9E42f9E4755c5389Af65070d818542f':
      '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    // DOGE
    '0x92DD70182813CD3Da0f1B1eac914BaD6e0eD7AfD':
      '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
    // ADA
    '0x8197E8f4C358B9be57a09c6063bA4591Ea502E98':
      '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    // AVAX
    '0x14D440Cd12F99B676491cD6E7e606AD0F7ea9C51':
      '0x1CE0c2827e2eF14D5C4f29a091d735A204794041',
    // MATIC
    '0x2397355a668Bb2b8B70A2873F1EB559b21ed1A8d':
      '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
    // LTC
    '0xd11A7f26576dFD64Ca94B7092402642516c7603E':
      '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94',
    // SHIB
    '0xb655afddA2a8f60126DFC8A7Ae2795b100E66178':
      '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D',
    // TRX
    '0xbb4b4004869Ee0A6942A6A5a0657c32a632B38Ed':
      '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B',
    // UNI
    '0x0DCAF36c5774a04eA721069f0244076226aE0968':
      '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    // ATOM
    '0x797DF1c15eB8A1Fdbe81ce118c4A787699Bb0C2E':
      '0x0Eb3a705fc54725037CC9e008bDede697f62F335',
    // LINK
    '0xdf2B91419D08bF3f70EBdaA45175c4485540E3B3':
      '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    // EOS
    '0xfe67F0bC56c3C84fdAC21788799f6dC1952BE683':
      '0x56b6fB708fC5732DEC1Afc8D8556423A2EDcCbD6',
    // CAKE
    '0x243f7a225930392E9C206f25BA9200862F7fe8F8':
      '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    // BCH
    '0x6d81740A0AEF5ba3fa2c3ff8e49438D00a13AFEd':
      '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
    // 1INCH
    '0x5fC243E2A22EeAD26B2Ee1D31ED702F3970fb738':
      '0x111111111117dC0aa78b770fA6A738034120C302',
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
