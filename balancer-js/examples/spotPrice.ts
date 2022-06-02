import dotenv from 'dotenv';
import { BalancerSDK, Network, BalancerSdkConfig } from '../src/index';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();


/*
Example showing how to use SDK to get spot price for a pair.
*/
async function getSpotPrice() {
  const network = Network.MAINNET;
  const config: BalancerSdkConfig = {
    network,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
  };

  const balancer = new BalancerSDK(config);

  const wethDaiPoolId =
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
  // This will fetch pools information using data provider
  const spotPriceEthDai = await balancer.pricing.getSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].WETH.address,
    wethDaiPoolId
  );
  console.log(spotPriceEthDai.toString());

  const balDaiPoolId =
    '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011';
  // Reuses previously fetched pools data
  const pools = balancer.pricing.getPools();
  const spotPriceBalDai = await balancer.pricing.getSpotPrice(
    ADDRESSES[network].DAI.address,
    ADDRESSES[network].BAL.address,
    balDaiPoolId,
    pools
  );
  console.log(spotPriceBalDai.toString());
}

// yarn examples:run ./examples/spotPrice.ts
getSpotPrice();
