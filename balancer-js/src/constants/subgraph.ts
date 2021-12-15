import { Network } from './network';

export const SUBGRAPH_URLS = {
    [Network.MAINNET]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    [Network.GÖRLI]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
    [Network.KOVAN]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
    [Network.POLYGON]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    [Network.ARBITRUM]: `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2`,
};