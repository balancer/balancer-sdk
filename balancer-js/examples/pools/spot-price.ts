/**
 * Uses SDK to find spot price for pair in specific pool.
 * Uses SDK to find most liquid path for a pair and calculate spot price.
 *
 * Run with:
 * yarn example ./examples/pools/spot-price.ts
 */
import {
  BalancerSDK,
  Network,
  BalancerSdkConfig,
  BalancerError,
  BalancerErrorCode,
} from '@balancer-labs/sdk';

const config: BalancerSdkConfig = {
  network: Network.MAINNET,
  rpcUrl: 'https://rpc.ankr.com/eth',
  enableLogging: true
};

const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const bal = '0xba100000625a3754423978a60c9317c58a424e3d';

const balancer = new BalancerSDK(config);

async function getSpotPricePool() {
  const wethDaiPoolId =
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
  const daiWethPool = await balancer.pools.find(wethDaiPoolId);
  if (!daiWethPool)
    throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const spotPriceEthDai = daiWethPool.calcSpotPrice(dai, weth);
  console.log('spotPriceEthDai', spotPriceEthDai.toString());

  const balDaiPoolId =
    '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011';

  const balDaiPool = await balancer.pools.find(balDaiPoolId);
  if (!balDaiPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const spotPriceBalDai = balDaiPool.calcSpotPrice(dai, bal);
  console.log('spotPriceBalDai', spotPriceBalDai.toString());
}

async function getSpotPriceMostLiquid() {
  // This will fetch pools information using data provider
  const spotPriceEthDai = await balancer.pricing.getSpotPrice(dai, weth);
  console.log('spotPriceEthDai', spotPriceEthDai.toString());

  // Reuses previously fetched pools data
  const pools = balancer.pricing.getPools();
  const spotPriceBalDai = await balancer.pricing.getSpotPrice(dai, bal, pools);
  console.log('spotPriceBalDai', spotPriceBalDai.toString());
}

async function test() {
let pool = await balancer.pools.find('0xb9debddf1d894c79d2b2d09f819ff9b856fca55200000000000000000000062a');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Every 5 seconds, log rate weWETH / WETH
// eslint-disable-next-line no-constant-condition
while (true) {
  await sleep(5_000);
  // Refresh pool
  if (!pool) throw new Error('Pool not found');
  pool = await balancer.pools.refresh(pool.id);
  if (!pool) throw new Error('Pool not found');
  const res = pool.calcSpotPrice('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee');
  console.log(`timestamp: ${Date.now()} | rate = ${res}`);
}
}

test();
// getSpotPricePool();
// getSpotPriceMostLiquid();
