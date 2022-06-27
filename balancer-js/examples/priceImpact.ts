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

  const wethDaiId =
    '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
  const staBal3Id =
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
  const balWeth2080Id =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';
  const bbausdPoolId =
    '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';
  // This will fetch pools information using data provider
  await balancer.pricing.fetchPools();
  const pools = balancer.pricing.getPools();
  const pool = pools.find((pool) => pool.id == balWeth2080Id);
  if (pool) {
    const priceImpact = await balancer.pricing.getPriceImpact(
      ['100.1234123', '1234123.141234', '1230000.141234'],
      true,
      false,
      '',
      pool
    );
    console.log(priceImpact);
  }
  const priceImpactStaBal3 = await balancer.pricing.getPriceImpact(
    ['100', '100', '100000'],
    true,
    false,
    staBal3Id
  );
  console.log(priceImpactStaBal3);
}

// yarn examples:run ./examples/priceImpact.ts
getPriceImpact();
