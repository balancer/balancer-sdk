import {
  Liquidity,
  StaticTokenPriceProvider,
  Pool,
  TokenPrices,
} from '../../src';
import { findable } from '../../src/test/factories/data';
import { formatFixed } from '@ethersproject/bignumber';
import { parseFixed } from '../../src/lib/utils/math';
import POOLS from './pools.json';
import DECORATED_POOLS from './decorated-pools.json';
import TOKENS from './tokens.json';

const tokenPrices: TokenPrices = {};
TOKENS.forEach((token) => {
  // Strip price down to max 18 decimals.
  if (token.price) {
    const tokenPriceMatch = token.price.match(/[0-9]+\.[0-9]{0,18}/);
    const tokenPrice = tokenPriceMatch ? tokenPriceMatch[0] : '';
    const priceInETH = formatFixed(
      parseFixed('1', 36).div(parseFixed(tokenPrice, 18)),
      18
    );
    tokenPrices[token.address] = {
      eth: priceInETH,
    };
  }
});

const pools = new Map<string, Pool>();
POOLS.forEach((pool) => pools.set(pool.id, {...pool, poolTypeVersion: 1, protocolYieldFeeCache: '0'} as Pool));
const poolProvider = findable<Pool>(pools);
const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);

const liquidity = new Liquidity(poolProvider, tokenPriceProvider);

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

const staticPools: Record<string, any> = {};
poolIds.forEach((poolId) => {
  staticPools[poolId] = POOLS.find((p) => p.id === poolId);
});

async function getLiquidity(poolIds: string[]) {
  for (const poolId of poolIds) {
    const pool = await poolProvider.find(poolId);
    if (!pool) {
      console.error('Could not find pool: ' + poolId);
      continue;
    }

    const totalLiquidity = await liquidity.getLiquidity(pool);
    const decoratedPool = DECORATED_POOLS.find((p) => p.id == pool.id);

    console.log(
      `Pool:  ${pool.id} - ${staticPools[poolId].symbol} - ${pool.poolType}`
    );
    console.log('Calculated liquidity: \t\t', totalLiquidity);
    console.log('Pool Liqudidity: \t\t', staticPools[poolId].totalLiquidity);
    console.log('Decorated Pool Liqudity: \t', decoratedPool?.totalLiquidity);
    console.log('---');
  }

  process.exit(0);
}

// yarn examples:run ./examples/pools/calculateLiquidity.ts
getLiquidity(poolIds);
