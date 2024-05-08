import { Network } from './network';
import type { BalancerNetworkConfig } from '@/types';

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
        poolDataQueries: '0xf5CDdF6feD9C589f1Be04899F48f9738531daD59',
        lidoRelayer: '0xdcdbf71A870cc60C6F9B621E28a7D3Ffd6Dd4965',
        veBal: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
        gaugeControllerCheckpointer:
          '0x8e5698dc4897dc12243c8642e77b4f21349db97c',
        veBalProxy: '0x6f5a2eE11E7a772AeB5114A20d0D7c0ff61EB8A0',
        gyroConfigProxy: '0xac89cc9d78bbad7eb3a02601b4d65daa1f908aa6',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '0x5addcca35b7a0d07c74063c48700c8590e87864e',
        balancerMinter: '0x239e55f427d44c3cc793f49bfb507ebe76638a2b',
        balancerRelayer: '0xfea793aa415061c483d2390414275ad314b3f621',
        gaugeController: '0xc128468b7ce63ea702c1f104d55a2566b13d3abd',
        feeDistributor: '0xd3cf852898b21fc233251427c2dc93d3d604f3bb',
        protocolFeePercentagesProvider:
          '0x97207b095e4d5c9a6e4cfbfcd2c3358e03b90c4a',
        weightedPoolFactory: '0x897888115ada5773e02aa29f775430bfb5f34c51',
        composableStablePoolFactory:
          '0xfada0f4547ab2de89d1304a668c39b3e09aa7c76',
        aaveLinearPoolFactory: '0x0b576c1245f479506e7c8bbc4db4db07c1cd31f9',
        erc4626LinearPoolFactory: '0x813ee7a840ce909e7fea2117a44a90b8063bd4fd',
        eulerLinearPoolFactory: '0x5f43fba61f63fa6bff101a0a0458cea917f6b347',
        gearboxLinearPoolFactory: '0x39a79eb449fc05c92c39aa6f0e9bfac03be8de5b',
        yearnLinearPoolFactory: '0x5f5222ffa40f2aed6380d022184d6ea67c776ee0',
      },
      tokens: {
        bal: '0xba100000625a3754423978a60c9317c58a424e3d',
        wrappedNativeAsset: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        bbaUsd: '0xa13a9247ea42d743238089903570127dda72fe44',
        lbpRaisingTokens: [
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        ],
        stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        veBal: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
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
      '0xbd482ffb3e6e50dc1c437557c3bea2b68f3683ee0000000000000000000003c6', // a pool made by an external dev who was playing with a novel rate provider mechanism in production.
      '0x0afbd58beca09545e4fb67772faf3858e610bcd00000000000000000000004b9',
      '0xf22ff21e17157340575158ad7394e068048dd98b0000000000000000000004b8',
      '0xf71d0774b214c4cf51e33eb3d30ef98132e4dbaa00000000000000000000046e',
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
      {
        symbol: 'rEth',
        address: '0xae78736cd615f374d3085123a210448e74fc6393',
      },
      {
        symbol: 'ETHx',
        address: '0xa35b1b31ce002fbf2058d22f30f95d405200a15b',
      },
    ],
    sorTriPathMidPoolIds: [
      '0x1e19cf2d73a72ef1332c882f20534b6519be0276000200000000000000000112', // rETH/WETH
    ],
  },
  [Network.POLYGON]: {
    chainId: Network.POLYGON, //137
    addresses: {
      //Polygon deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/polygon.html
      contracts: {
        multicall: '0xa1B2b503959aedD81512C37e9dce48164ec6a94d',
        poolDataQueries: '0x84813aA3e079A665C0B80F944427eE83cBA63617',
        gaugeClaimHelper: '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33',
        gyroConfigProxy: '0xfdc2e9e03f515804744a40d0f8d25c16e93fbe67',

        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '0x239e55f427d44c3cc793f49bfb507ebe76638a2b',
        balancerRelayer: '0xd18d5d377eb23362e54fa496597d7e962d56c554',
        protocolFeePercentagesProvider:
          '0x42ac0e6fa47385d55aff070d79ef0079868c48a6',
        weightedPoolFactory: '0xfc8a407bba312ac761d8bfe04ce1201904842b76',
        composableStablePoolFactory:
          '0x6ab5549bbd766a43afb687776ad8466f8b42f777',
        aaveLinearPoolFactory: '0xab2372275809e15198a7968c7f324053867cdb0c',
        erc4626LinearPoolFactory: '0x5c5fcf8fbd4cd563ced27e7d066b88ee20e1867a',
        yearnLinearPoolFactory: '0x0b576c1245f479506e7c8bbc4db4db07c1cd31f9',
      },
      tokens: {
        bal: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
        wrappedNativeAsset: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        lbpRaisingTokens: [
          '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
          '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
        ],
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
      '0x600bd01b6526611079e12e1ff93aba7a3e34226f0000000000000000000009e4', // This pool has rateProviders with incorrect scaling
      '0xc31a37105b94ab4efca1954a14f059af11fcd9bb000000000000000000000455', // Stable pool with Convergence issues
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
        poolDataQueries: '0x7Ba29fE8E83dd6097A7298075C4AFfdBda3121cC',
        gaugeClaimHelper: '0xa0dabebaad1b243bbb243f933013d560819eb66f',
        gyroConfigProxy: '0x9b683ca24b0e013512e2566b68704dbe9677413c',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '0x77d46184d22ca6a3726a2f500c776767b6a3d6ab',
        balancerRelayer: '0x598ce0f1ab64b27256759ef99d883ee51138b9bd',
        protocolFeePercentagesProvider:
          '0x5ef4c5352882b10893b70dbcaa0c000965bd23c5',
        weightedPoolFactory: '0xc7e5ed1054a24ef31d827e6f86caa58b3bc168d7',
        composableStablePoolFactory:
          '0x2498a2b0d6462d2260eac50ae1c3e03f4829ba95',
        aaveLinearPoolFactory: '0x7396f99b48e7436b152427bfa3dd6aa8c7c6d05b',
        erc4626LinearPoolFactory: '0x7adbdabaa80f654568421887c12f09e0c7bd9629',
        yearnLinearPoolFactory: '0x19dfef0a828eec0c85fbb335aa65437417390b85',
      },
      tokens: {
        bal: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
        wrappedNativeAsset: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        lbpRaisingTokens: [
          '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
          '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
          '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
        ],
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
    sorTriPathMidPoolIds: [
      '0x178e029173417b1f9c8bc16dcec6f697bc323746000200000000000000000158', // wstEth/USDC.e to open up auraBAL/USDC
      '0x0052688295413b32626d226a205b95cdb337de860002000000000000000003d1', // arb/USDC.e to open up aura/USDC
      '0xa1a8bf131571a2139feb79401aa4a2e9482df6270002000000000000000004b4', // wstEth/Stable4Pool
    ],
  },
  [Network.GOERLI]: {
    chainId: Network.GOERLI, //5
    //Goerli deployment addresses: https://docs.balancer.fi/reference/contracts/deployment-addresses/goerli.html
    addresses: {
      contracts: {
        multicall: '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e',
        poolDataQueries: '0x6d3197d069F8F9f1Fe7e23665Bc64CB77ED8b089',
        veBal: '0x33A99Dcc4C85C014cf12626959111D5898bbCAbF',
        veBalProxy: '0xA1F107D1cD709514AE8A914eCB757E95f9cedB31',
        erc4626LinearPoolFactory: '0xba240c856498e2d7a70af4911aafae0d6b565a5b',
        aaveLinearPoolFactory: '0x76578ecf9a141296ec657847fb45b0585bcda3a6',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '0x5addcca35b7a0d07c74063c48700c8590e87864e',
        balancerRelayer: '0x03f1ab8b19bce21eb06c364aec9e40322572a1e9',
        gaugeController: '0xbb1ce49b16d55a1f2c6e88102f32144c7334b116',
        feeDistributor: '0x42b67611b208e2e9b4cc975f6d74c87b865ae066',
        protocolFeePercentagesProvider:
          '0x0f3e0c4218b7b0108a3643cfe9d3ec0d4f57c54e',
        weightedPoolFactory: '0x230a59f4d9adc147480f03b0d',
        composableStablePoolFactory:
          '0x1802953277fd955f9a254b80aa0582f193cf1d77',
      },
      tokens: {
        bal: '',
        wrappedNativeAsset: '',
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
        poolDataQueries: '0x6B5dA774890Db7B7b96C6f44e6a4b0F657399E2e',
        gyroConfigProxy: '0x32acb44fc929339b9f16f0449525cc590d2a23f3',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
        balancerRelayer: '0x03f1ab8b19bce21eb06c364aec9e40322572a1e9',
        protocolFeePercentagesProvider:
          '0xacaac3e6d6df918bf3c809dfc7d42de0e4a72d4c',
        weightedPoolFactory: '0x230a59f4d9adc147480f03b0d3fffecd56c3289a',
        composableStablePoolFactory:
          '0x1802953277fd955f9a254b80aa0582f193cf1d77',
        aaveLinearPoolFactory: '0x7396f99b48e7436b152427bfa3dd6aa8c7c6d05b',
        erc4626LinearPoolFactory: '0x7adbdabaa80f654568421887c12f09e0c7bd9629',
        yearnLinearPoolFactory: '0x19dfef0a828eec0c85fbb335aa65437417390b85',
      },
      tokens: {
        bal: '0xfe8b128ba8c78aabc59d4c64cee7ff28e9379921',
        wrappedNativeAsset: '0x4200000000000000000000000000000000000006',
        lbpRaisingTokens: [
          '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
          '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
          '0x4200000000000000000000000000000000000006', // WETH
        ],
      },
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'optimistic-ethereum',
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-optimism',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/lyra-finance/optimism-mainnet-blocks',
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
        poolDataQueries: '0x3f170631ed9821Ca51A59D996aB095162438DC10',
        aaveLinearPoolFactory: '0x62aab12865d7281048c337d53a4dde9d770321e6',
        balancerHelpers: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
        balancerRelayer: '0x3536fd480ca495ac91e698a703248a8915c137a3',
        protocolFeePercentagesProvider:
          '0x41b953164995c11c81da73d212ed8af25741b7ac',
        weightedPoolFactory: '0x6cad2ea22bfa7f4c14aae92e47f510cd5c509bc7',
        composableStablePoolFactory:
          '0xd87f44df0159dc78029ab9ca7d7e57e7249f5acd',
        yearnLinearPoolFactory: '0x19dfef0a828eec0c85fbb335aa65437417390b85',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
      },
      tokens: {
        wrappedNativeAsset: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
        bal: '0x7eF541E2a22058048904fE5744f9c7E4C57AF717',
        wstETH: '0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6',
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
    averageBlockTime: 5,
    pools: {},
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
      },
      {
        symbol: 'wsEth',
        address: '0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6',
      },
    ],
    sorTriPathMidPoolIds: [
      '0xeb30c85cc528537f5350cf5684ce6a4538e13394000200000000000000000059', // 3POOL_BPT/wstETH
      '0x7644fa5d0ea14fcf3e813fdf93ca9544f8567655000000000000000000000066', // sBAL3
    ],
  },
  [Network.FANTOM]: {
    chainId: Network.FANTOM, //250
    //Fantom deployment addresses: https://docs.beets.fi/technicals/deployments
    addresses: {
      contracts: {
        vault: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
        multicall: '0x66335d7ad8011f6aa3f48aadcb523b62b38ed961',
        poolDataQueries: '0xb132F1E145DcC085980C531e2dA81f2b84efc14F',
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
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
        poolDataQueries: '0x9805dcfD25e6De36bad8fe9D3Fe2c9b44B764102',
        aaveLinearPoolFactory: '0xdf9b5b00ef9bca66e9902bd813db14e4343be025',
        balancerHelpers: '0xdae7e32adc5d490a43ccba1f0c736033f2b4efca',
        balancerMinter: '0x1783cd84b3d01854a96b4ed5843753c2ccbd574a',
        balancerRelayer: '0x6d5342d716c13d9a3f072a2b11498624ade27f90',
        gaugeController: '0x577e5993b9cc480f07f98b5ebd055604bd9071c4',
        feeDistributor: '0xa6971317fb06c76ef731601c64433a4846fca707',
        protocolFeePercentagesProvider:
          '0xf7d5dce55e6d47852f054697bab6a1b48a00ddbd',
        weightedPoolFactory: '0x7920bfa1b2041911b354747ca7a6cdd2dfc50cfd',
        composableStablePoolFactory:
          '0xa3fd20e29358c056b727657e83dfd139abbc9924',
        yearnLinearPoolFactory: '0xacf05be5134d64d150d153818f8c67ee36996650',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
      },
      tokens: {
        bal: '0xb19382073c7a0addbb56ac6af1808fa49e377b75',
        wrappedNativeAsset: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
      },
    },
    urls: {
      subgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-sepolia-v2/version/latest',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'ethereum',
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
        balancerMinter: '0x475D18169BE8a89357A9ee3Ab00ca386d20fA229',
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
        poolDataQueries: '0xF24917fB88261a37Cc57F686eBC831a5c0B9fD39',
        aaveLinearPoolFactory: '0x4b7b369989e613ff2c65768b7cf930cc927f901e',
        protocolFeePercentagesProvider:
          '0x1802953277fd955f9a254b80aa0582f193cf1d77',
        weightedPoolFactory: '0x03f3fb107e74f2eac9358862e91ad3c692712054',
        yearnLinearPoolFactory: '0x44d33798dddcdabc93fe6a40c80588033dc502d3',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerHelpers: '', // TODO
        balancerRelayer: '', // TODO
      },
      tokens: {
        bal: '0x120ef59b80774f02211563834d8e3b72cb1649d6',
        wrappedNativeAsset: '0x4f9a0e7fd2bf6067db6994cf12e4495df938e6e9',
        wstETH: '0x5d8cff95d7a57c0bf50b30b43c7cc0d52825d4a9',
      },
    },
    urls: {
      subgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-polygon-zk-v2/version/latest',
      gaugesSubgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-gauges-polygon-zk/version/latest',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'polygon-zkevm',
      },
    },
    averageBlockTime: 4,
    multicallBatchSize: 128,
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9',
      },
      {
        symbol: 'wsEth',
        address: '0x5D8cfF95D7A57c0BF50B30b43c7CC0D52825D4a9',
      },
    ],
  },
  [Network.AVALANCHE]: {
    chainId: Network.AVALANCHE, //43114
    addresses: {
      contracts: {
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        balancerMinter: '0xEa924b45a3fcDAAdf4E5cFB1665823B8F8F2039B',
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
        poolDataQueries: '0x67af5D428d38C5176a286a2371Df691cDD914Fb8',
        aaveLinearPoolFactory: '0x6caf662b573f577de01165d2d38d1910bba41f8a',
        balancerHelpers: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
        balancerRelayer: '0x03f1ab8b19bce21eb06c364aec9e40322572a1e9',
        protocolFeePercentagesProvider:
          '0x239e55f427d44c3cc793f49bfb507ebe76638a2b',
        weightedPoolFactory: '0x230a59f4d9adc147480f03b0d3fffecd56c3289a',
        composableStablePoolFactory:
          '0x3b1eb8eb7b43882b385ab30533d9a2bef9052a98',
        erc4626LinearPoolFactory: '0x4507d91cd2c0d51d9b4f30bf0b93afc938a70ba5',
        eulerLinearPoolFactory: '',
        gearboxLinearPoolFactory: '',
        yearnLinearPoolFactory: '',
      },
      tokens: {
        bal: '0xe15bcb9e0ea69e6ab9fa080c4c4a5632896298c3',
        wrappedNativeAsset: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
      },
    },
    urls: {
      subgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-avalanche-v2',
      gaugesSubgraph:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-avalanche',
      blockNumberSubgraph:
        'https://api.thegraph.com/subgraphs/name/iliaazhel/avalanche-blocks',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'avalanche-2',
        platformId: 'avalanche',
      },
    },
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [
      {
        symbol: 'WAVAX',
        address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
      },
      {
        symbol: 'sAVAX',
        address: '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be',
      },
    ],
  },
  [Network.BASE]: {
    chainId: Network.BASE, //8453
    addresses: {
      contracts: {
        balancerMinter: '0xc7E5ED1054A24Ef31D827E6F86caA58B3Bc168d7',
        multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
        poolDataQueries: '',
        balancerHelpers: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
        balancerRelayer: '0x76f7204b62f554b79d444588edac9dfa7032c71a',
        protocolFeePercentagesProvider:
          '0xded7fef7d8ecdcb74f22f0169e1a9ec696e6695d',
        weightedPoolFactory: '0x4c32a8a8fda4e24139b51b456b42290f51d6a1c4',
        composableStablePoolFactory:
          '0x8df317a729fcaa260306d7de28888932cb579b88',
        aaveLinearPoolFactory: '0x687b8c9b41e01be8b591725fac5d5f52d0564d79',
        erc4626LinearPoolFactory: '0x161f4014c27773840ccb4ec1957113e6dd028846',
        yearnLinearPoolFactory: '0x44d33798dddcdabc93fe6a40c80588033dc502d3',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
      },
      tokens: {
        bal: '0x4158734d47fc9692176b5085e0f52ee0da5d47f1',
        wrappedNativeAsset: '0x4200000000000000000000000000000000000006',
      },
    },
    urls: {
      subgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-base-v2/version/latest',
      gaugesSubgraph:
        'https://api.studio.thegraph.com/query/24660/balancer-gauges-base/version/latest',
      blockNumberSubgraph:
        'https://api.studio.thegraph.com/query/48427/bleu-base-blocks/version/latest',
    },
    thirdParty: {
      coingecko: {
        nativeAssetId: 'eth',
        platformId: 'base',
      },
    },
    averageBlockTime: 2,
    pools: {},
    poolsToIgnore: [],
    sorConnectingTokens: [
      {
        symbol: 'weth',
        address: '0x4200000000000000000000000000000000000006',
      },
    ],
    sorTriPathMidPoolIds: [
      '0x2db50a0e0310723ef0c2a165cb9a9f80d772ba2f00020000000000000000000d', // weth/staBal
    ],
  },
};

export const networkAddresses = (
  chainId: number
): BalancerNetworkConfig['addresses'] =>
  BALANCER_NETWORK_CONFIG[chainId as Network].addresses;
