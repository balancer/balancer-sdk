import dotenv from 'dotenv';
import { BalancerSDK, Network, BalancerSdkConfig } from '../src/index';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

/*
Example showing how to use SDK to get price impact for a join or ...
*/
async function getPriceImpact() {
  const network = Network.MAINNET;
  const config: BalancerSdkConfig = {
    network,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
  };

  const balancer = new BalancerSDK(config);

  const wethDaiPoolId =
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
  const staBal3Id = '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
    '';
  // This will fetch pools information using data provider
  await balancer.pricing.fetchPools();
  const pools = balancer.pricing.getPools();
  const pool = pools.find((pool) => pool.id == staBal3Id);
  /* if (pool) {
    const priceImpact = await balancer.pricing.getPriceImpact(
      ['12341234.1234123', '1234123.141234', '1230000.141234'],
      true,
      false,
      '',
      pool
    );
    console.log(priceImpact);
  } */
  const priceImpactEthDai = await balancer.pricing.getPriceImpact(
    ['100', '100'],
    true,
    false,
    wethDaiPoolId
  );
  console.log(priceImpactEthDai);
}

// yarn examples:run ./examples/priceImpact.ts
getPriceImpact();
