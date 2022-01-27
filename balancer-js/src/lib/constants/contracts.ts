import { Network } from './network';
import { BalancerNetworkConfig } from '../types';

export const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

export const BALANCER_NETWORK_CONFIG: Record<Network, BalancerNetworkConfig> = {
    [Network.MAINNET]: {
        chainId: Network.MAINNET, //1
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        multicall: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
        staBal3Pool: {
            id: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
            address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
        },
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    },
    [Network.ROPSTEN]: {
        chainId: Network.ROPSTEN, //3
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
        multicall: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
        subgraphUrl: '',
    },
    [Network.RINKEBY]: {
        chainId: Network.RINKEBY, //4
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
        multicall: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-rinkeby-v2',
    },
    [Network.GÖRLI]: {
        chainId: Network.GÖRLI, //5
        vault: '0x65748E8287Ce4B9E6D83EE853431958851550311',
        weth: '0x9A1000D492d40bfccbc03f413A48F5B6516Ec0Fd',
        multicall: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
    },
    [Network.KOVAN]: {
        chainId: Network.KOVAN, //42
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
        multicall: '0x2cc8688C5f75E365aaEEb4ea8D6a480405A48D2A',
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
        staBal3Pool: {
            id: '0x8fd162f338b770f7e879030830cde9173367f3010000000000000000000004d8',
            address: '0x8fd162f338b770f7e879030830cde9173367f301',
        },
        wethStaBal3: {
            id: '0x6be79a54f119dbf9e8ebd9ded8c5bd49205bc62d00020000000000000000033c',
            address: '0x6be79a54f119dbf9e8ebd9ded8c5bd49205bc62d',
        },
    },
    [Network.POLYGON]: {
        chainId: Network.POLYGON, //137
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        multicall: '0xa1B2b503959aedD81512C37e9dce48164ec6a94d',
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    },
    [Network.ARBITRUM]: {
        chainId: Network.ARBITRUM, //42161
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        multicall: '0x269ff446d9892c9e19082564df3f5e8741e190a1',
        subgraphUrl:
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
    },
};
