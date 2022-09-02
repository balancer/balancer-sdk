import dotenv from 'dotenv';
import {
  BalancerSDK,
  Network,
  BalancerSdkConfig,
  BalancerError,
  BalancerErrorCode,
} from '../src/index';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const config: BalancerSdkConfig = {
  network,
  rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
};

const balancer = new BalancerSDK(config);

/*
Uses SDK to find spot price for pair in specific pool.
*/
async function getSpotPricePool() {
  const wethDaiPoolId =
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
  const daiWethPool = await balancer.pools.find(wethDaiPoolId);
  if (!daiWethPool)
    throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const spotPriceEthDai = await daiWethPool.calcSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].WETH.address
  );
  console.log(spotPriceEthDai.toString());

  const balDaiPoolId =
    '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011';

  const balDaiPool = await balancer.pools.find(balDaiPoolId);
  if (!balDaiPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const spotPriceBalDai = await balDaiPool.calcSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].BAL.address
  );
  console.log(spotPriceBalDai.toString());
}

/*
Uses SDK to find most liquid path for a pair and calculate spot price.
*/
async function getSpotPriceMostLiquid() {
  // This will fetch pools information using data provider
  const spotPriceEthDai = await balancer.pricing.getSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].WETH.address
  );
  console.log(spotPriceEthDai.toString());

  // Reuses previously fetched pools data
  const pools = balancer.pricing.getPools();
  const spotPriceBalDai = await balancer.pricing.getSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].BAL.address,
    pools
  );
  console.log(spotPriceBalDai.toString());
}

// yarn examples:run ./examples/spotPrice.ts
getSpotPricePool();
getSpotPriceMostLiquid();
