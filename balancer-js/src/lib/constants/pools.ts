import { Network } from './network';

export type PoolReference = {
    id: string;
    address: string;
};

export type NetworkPools = {
    staBal3Pool?: PoolReference;
    wethStaBal3?: PoolReference;
};

export const POOLS: Record<Network, NetworkPools> = {
    [Network.MAINNET]: {
        staBal3Pool: {
            id: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
            address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
        },
    },
    [Network.KOVAN]: {
        staBal3Pool: {
            id: '0x8fd162f338b770f7e879030830cde9173367f3010000000000000000000004d8',
            address: '0x8fd162f338b770f7e879030830cde9173367f301',
        },
        wethStaBal3: {
            id: '0x6be79a54f119dbf9e8ebd9ded8c5bd49205bc62d00020000000000000000033c',
            address: '0x6be79a54f119dbf9e8ebd9ded8c5bd49205bc62d',
        },
    },
    [Network.ARBITRUM]: {},
    [Network.POLYGON]: {},
    [Network.GÖRLI]: {},
    [Network.RINKEBY]: {},
    [Network.ROPSTEN]: {},
};
