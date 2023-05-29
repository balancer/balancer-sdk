import { Network } from './network';
import { BalancerNetworkConfig } from '@/types';
import addressesByNetwork from './addresses.json';

export const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// Info fetched using npm package slot20
export const BPT_SLOT = 0;
export const BPT_DECIMALS = 18;

export const BALANCER_NETWORK_CONFIG: Record<Network, BalancerNetworkConfig> = {
  [Network.MAINNET]: {
    chainId: Network.MAINNET, //1
    addresses: {
      //Mainnet deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/mainnet.html
      contracts: {
        multicall: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
        lidoRelayer: '0xdcdbf71A870cc60C6F9B621E28a7D3Ffd6Dd4965',
        veBal: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
        veBalProxy: '0x6f5a2eE11E7a772AeB5114A20d0D7c0ff61EB8A0',
        ...addressesByNetwork[Network.MAINNET].contracts,
      },
      tokens: {
        bal: addressesByNetwork[Network.MAINNET].contracts.bal,
        wrappedNativeAsset: addressesByNetwork[Network.MAINNET].contracts.weth,
        bbaUsd: addressesByNetwork[Network.MAINNET].tokens.bb_a_usd,
        lbpRaisingTokens: [
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        ],
        stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        veBal: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
        ...addressesByNetwork[Network.MAINNET].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
      },
    },
    pools: {
      wETHwstETH: {
        id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
        address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
      },
    },
    poolsToIgnore: [
      '0xbd482ffb3e6e50dc1c437557c3bea2b68f3683ee', // a pool made by an external dev who was playing with a novel rate provider mechanism in production.
      '0x0afbd58beca09545e4fb67772faf3858e610bcd0',
      '0xf22ff21e17157340575158ad7394e068048dd98b',
      '0xf71d0774b214c4cf51e33eb3d30ef98132e4dbaa',
    ],
    sorConnectingTokens: [
      {
        symbol: 'wEth',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      {
        symbol: 'wstEth',
        address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      },
      {
        symbol: 'DOLA',
        address: '0x865377367054516e17014CcdED1e7d814EDC9ce4',
      },
    ],
  },
  [Network.POLYGON]: {
    chainId: Network.POLYGON, //137
    addresses: {
      //Polygon deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/polygon.html
      contracts: {
        multicall: '0xa1B2b503959aedD81512C37e9dce48164ec6a94d',
        gaugeClaimHelper: '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33',
        ...addressesByNetwork[Network.POLYGON].contracts,
      },
      tokens: {
        bal: addressesByNetwork[Network.POLYGON].contracts.bal,
        wrappedNativeAsset: addressesByNetwork[Network.POLYGON].contracts.weth,
        lbpRaisingTokens: [
          '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
          '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
        ],
        ...addressesByNetwork[Network.POLYGON].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-prune-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-polygon',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: '',
        platformId: 'polygon-pos',
      },
    },
    pools: {},
    poolsToIgnore: [
      '0x600bd01b6526611079e12e1ff93aba7a3e34226f', // This pool has rateProviders with incorrect scaling
      '0xc31a37105b94ab4efca1954a14f059af11fcd9bb', // Stable pool with Convergence issues
    ],
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      },
      {
        symbol: 'bbrz2',
        address: '0xe22483774bd8611be2ad2f4194078dac9159f4ba',
      }, // Joins Stables<>BRZ via https://app.balancer.fi/#/polygon/pool/0x4a0b73f0d13ff6d43e304a174697e3d5cfd310a400020000000000000000091c
    ],
  },
  [Network.ARBITRUM]: {
    chainId: Network.ARBITRUM, //42161
    //Arbitrum deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/arbitrum.html
    addresses: {
      contracts: {
        multicall: '0x269ff446d9892c9e19082564df3f5e8741e190a1',
        gaugeClaimHelper: '0xa0dabebaad1b243bbb243f933013d560819eb66f',
        ...addressesByNetwork[Network.ARBITRUM].contracts,
      },
      tokens: {
        bal: addressesByNetwork[Network.ARBITRUM].contracts.bal,
        wrappedNativeAsset: addressesByNetwork[Network.ARBITRUM].contracts.weth,
        lbpRaisingTokens: [
          '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
          '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
          '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
        ],
        ...addressesByNetwork[Network.ARBITRUM].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-arbitrum',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'arbitrum-one',
      },
    },
    pools: {},
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      },
    ],
  },
  [Network.KOVAN]: {
    chainId: Network.KOVAN, //42
    addresses: {
      contracts: {
        multicall: '0x2cc8688C5f75E365aaEEb4ea8D6a480405A48D2A',
        veBal: '0x16ba924752EF283C7946db8A122a6742AA35C1DC',
        veBalProxy: '0x98D0d0a65cBeCCaa647a5a95cf27Cf2f00E1231C',
        weightedPoolFactory: '0x8df6EfEc5547e31B0eb7d1291B511FF8a2bf987c',
        balancerRelayer: '',
        ...addressesByNetwork[Network.KOVAN].contracts,
      },
      tokens: {
        wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
        ...addressesByNetwork[Network.KOVAN].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
      },
    },
    pools: {},
  },
  [Network.ROPSTEN]: {
    chainId: Network.ROPSTEN, //3
    addresses: {
      contracts: {
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        multicall: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
        balancerHelpers: '',
        balancerRelayer: '',
      },
      tokens: {
        wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
      },
    },
    urls: {
      subgraph: '',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
      },
    },
    pools: {},
  },
  [Network.RINKEBY]: {
    chainId: Network.RINKEBY, //4
    addresses: {
      contracts: {
        multicall: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
        weightedPoolFactory: '0x8df6EfEc5547e31B0eb7d1291B511FF8a2bf987c',
        balancerRelayer: '',
        ...addressesByNetwork[Network.RINKEBY].contracts,
      },
      tokens: {
        wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
        ...addressesByNetwork[Network.RINKEBY].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-rinkeby-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
      },
    },
    pools: {},
  },
  [Network.GOERLI]: {
    chainId: Network.GOERLI, //5
    //Goerli deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/goerli.html
    addresses: {
      contracts: {
        multicall: '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e',
        veBal: '0x33A99Dcc4C85C014cf12626959111D5898bbCAbF',
        veBalProxy: '0xA1F107D1cD709514AE8A914eCB757E95f9cedB31',
        erc4626LinearPoolFactory: '0xba240c856498e2d7a70af4911aafae0d6b565a5b',
        aaveLinearPoolFactory: '0x76578ecf9a141296ec657847fb45b0585bcda3a6',
        ...addressesByNetwork[Network.GOERLI].contracts,
      },
      tokens: {
        bal: addressesByNetwork[Network.GOERLI].contracts.bal,
        wrappedNativeAsset: addressesByNetwork[Network.GOERLI].contracts.weth,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-goerli',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/blocklytics/goerli-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
      },
    },
    pools: {},
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
      },
    ],
  },
  [Network.OPTIMISM]: {
    chainId: Network.OPTIMISM, //10
    // Optimism deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/optimism.html
    addresses: {
      contracts: {
        multicall: '0x2dc0e2aa608532da689e89e237df582b783e552c',
        ...addressesByNetwork[Network.OPTIMISM].contracts,
      },
      tokens: {
        wrappedNativeAsset: addressesByNetwork[Network.OPTIMISM].contracts.weth,
        lbpRaisingTokens: [
          '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
          '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
          '0x4200000000000000000000000000000000000006', // WETH
        ],
        ...addressesByNetwork[Network.OPTIMISM].tokens,
      },
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'optimism',
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism',
      gaugesSubgraph: '',
    },
    pools: {},
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0x4200000000000000000000000000000000000006',
      },
    ],
  },
  [Network.GNOSIS]: {
    chainId: Network.GNOSIS, //100
    // Gnosis deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/gnosis.html
    addresses: {
      contracts: {
        multicall: '0xbb6fab6b627947dae0a75808250d8b2652952cb5',
        ...addressesByNetwork[Network.GNOSIS].contracts,
      },
      tokens: {
        wrappedNativeAsset: addressesByNetwork[Network.GNOSIS].contracts.weth,
        bal: addressesByNetwork[Network.GNOSIS].contracts.bal,
        ...addressesByNetwork[Network.GNOSIS].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gnosis-chain-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-gnosis-chain',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'xdai',
        platformId: 'xdai',
      },
    },
    pools: {},
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
      },
    ],
  },
  [Network.FANTOM]: {
    chainId: Network.FANTOM, //250
    //Fantom deployment addresses: https://docs.beets.fi/technicals/deployments
    addresses: {
      contracts: {
        vault: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
        multicall: '0x66335d7ad8011f6aa3f48aadcb523b62b38ed961',
        gaugeClaimHelper: '0x0000000000000000000000000000000000000000', // no guages on fantom
        balancerRelayer: '0x419f7925b8c9e409b6ee8792242556fa210a7a09',
        balancerHelpers: '0xfE18C7C70b0a2c6541bEde0367124278BC345Dc8',
        weightedPoolFactory: '0x60467cb225092cE0c989361934311175f437Cf53',
        composableStablePoolFactory:
          '0x44814E3A603bb7F1198617995c5696C232F6e8Ed',
        yearnLinearPoolFactory: '0x1f73ae6ed391a2b1e84ff988a1bb5394b78a4a71',
      },
      tokens: {
        bal: '0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e', //beets
        wrappedNativeAsset: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
        lbpRaisingTokens: [
          '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', // WFTM
          '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', // USDC
          '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E', // DAI
        ],
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-v2-fantom',
      gaugesSubgraph: '', // no guages on fantom
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/beethovenxfi/fantom-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'ftm',
        platformId: 'fantom',
      },
    },
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [
      {
        symbol: 'wftm',
        address: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
      },
    ],
  },
  [Network.SEPOLIA]: {
    chainId: Network.SEPOLIA, //11155111
    addresses: {
      contracts: {
        multicall: '0x25eef291876194aefad0d60dff89e268b90754bb',
        ...addressesByNetwork[Network.SEPOLIA].contracts,
      },
      tokens: {
        bal: addressesByNetwork[Network.SEPOLIA].contracts.bal,
        wrappedNativeAsset: addressesByNetwork[Network.SEPOLIA].contracts.weth,
        ...addressesByNetwork[Network.SEPOLIA].tokens,
      },
    },
    urls: {
      subgraph:
        'https://api.studio.thegraph.com/proxy/24660/balancer-sepolia-v2/v0.0.1',
    },
    thirdParty: {
      // There is no support for Sepolia Network in coingecko
      coingecko: {
        platformId: '',
        nativeAssetId: '',
      },
    },
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [],
  },
  [Network.ZKEVM]: {
    chainId: Network.ZKEVM, //1101
    addresses: {
      contracts: {
        aaveLinearPoolFactory: '0x4b7b369989e613ff2C65768B7Cf930cC927F901E',
        balancerHelpers: '0x8E9aa87E45e92bad84D5F8DD1bff34Fb92637dE9',
        balancerMinterAddress: '0x475D18169BE8a89357A9ee3Ab00ca386d20fA229',
        composableStablePoolFactory:
          '0x8eA89804145c007e7D226001A96955ad53836087',
        erc4626LinearPoolFactory: '0x6B1Da720Be2D11d95177ccFc40A917c2688f396c',
        feeDistributor: '',
        gaugeController: '',
        gearboxLinearPoolFactory: '0x687b8C9b41E01Be8B591725fac5d5f52D0564d79',
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
        protocolFeePercentagesProvider:
          '0x1802953277FD955f9a254B80Aa0582f193cF1d77',
        balancerRelayer: '0x4678731DC41142A902a114aC5B2F77b63f4a259D',
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weightedPoolFactory: '0x03F3Fb107e74F2EAC9358862E91ad3c692712054',
        yearnLinearPoolFactory: '',
      },
      tokens: {
        bal: '0x120eF59b80774F02211563834d8E3b72cb1649d6',
        wrappedNativeAsset: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
      },
    },
    urls: {
      subgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-polygon-zkevm-v2/v0.0.2',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'polygon-zkevm',
      },
    },
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [],
  },
};

export const networkAddresses = (
  chainId: number
): BalancerNetworkConfig['addresses'] =>
  BALANCER_NETWORK_CONFIG[chainId as Network].addresses;
