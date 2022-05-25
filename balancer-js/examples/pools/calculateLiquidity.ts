import {
    BalancerSDK,
    BalancerSdkConfig,
    Network,
    StaticTokenProvider,
    Pools,
} from '../../src';
import { Liquidity } from '../../src/modules/liquidity/liquidity.module';
import POOLS from './pools-subset.json';
import DECORATED_POOLS from './decorated-pools.json';
import TOKENS from './tokens.json';

const config: BalancerSdkConfig = {
    network: Network.MAINNET,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
};

/**
 * Grab pool information from the local DDB table and put as JSON here.
 * Only existing pool info that is in the API layer should be neccessary to calculate total liquidity.
 * So that users can just query the subgraph, get pool information, then pass it into these functions to get all extra information neccessary
 * No manual on-chain calls should be needed before being able to calculate this total liquidity.
 **/

// balancer.pools.weighted.liquidity.calcTotal(...);
// balancer.pools.stable.liquidity.calcTotal(...);

// or with pools module directly
// const pools = new Pools(...configParams);

// pools.weighted.liquidity.calcTotal(...);
// pools.stable.liquidity.calcTotal(...);

const staticTokenProvider = new StaticTokenProvider(TOKENS);
const liquidity = new Liquidity(config, staticTokenProvider);

const poolIds = [
    '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
    '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
    '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
    '0x90291319f1d4ea3ad4db0dd8fe9e12baf749e84500020000000000000000013c',
    '0x186084ff790c65088ba694df11758fae4943ee9e000200000000000000000013',
    '0xf4c0dd9b82da36c07605df83c8a416f11724d88b000200000000000000000026',
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a',
];

const selectedPools = poolIds.map((id) => POOLS.find((p) => p.id === id));

// console.log('Selected pools: ', selectedPools);

selectedPools.forEach(async (pool) => {
    if (!pool) return;

    const totalLiquidity = await liquidity.getLiquidity(pool);
    const decoratedPool = DECORATED_POOLS.find((p) => p.id == pool.id);

    console.log(`Pool:  ${pool.id} - ${pool.symbol} - ${pool.poolType}`);
    console.log('Calculated liquidity: ', totalLiquidity);
    console.log('Pool Liqudidity: ', pool.totalLiquidity);
    console.log('Decorated Pool Liqudity: ', decoratedPool?.totalLiquidity);
    console.log('---');
});
