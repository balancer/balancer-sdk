import dotenv from 'dotenv';
import { BalancerSDK, Network, BalancerSdkConfig } from '../src/index';

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

  const staBal3Id =
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
  const balWeth2080Id =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

  // This will fetch pools information using data provider
  await balancer.pricing.fetchPools();
  const pools = balancer.pricing.getPools();
  const pool = pools.find((pool) => pool.id == balWeth2080Id);
  if (pool) {
    const priceImpact = await balancer.pricing.getPriceImpact(
      ['100123412300000000000', '1234123141234000000000000'],
      '9985699091293629856742758',
      '',
      pool
    );
    console.log(priceImpact);
  }
  const priceImpactStaBal3 = await balancer.pricing.getPriceImpact(
    ['100000000000000000000', '100000000', '100000000000'],
    '99430576622436571714692',
    staBal3Id
  );
  console.log(priceImpactStaBal3);
}

// yarn examples:run ./examples/priceImpact.ts
getPriceImpact();
