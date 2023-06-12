/**
 * Example showing how to use SDK to get price impact for a join or exit operation.
 * 
 * Run with:
 * yarn example ./examples/pools/price-impact.ts
 */
import {
  BalancerSDK,
  Network,
  BalancerErrorCode,
  BalancerError,
} from '@balancer-labs/sdk'

async function getPriceImpact() {
  const network = Network.MAINNET;
  const rpcUrl = 'https://rpc.ankr.com/eth';

  const WBTCWETHId =
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // 50/50 WBTC/WETH Pool
  const staBal3Id =
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);

  // Use SDK to find pool info
  const pool = await balancer.pools.find(WBTCWETHId);
  if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const priceImpactWBTCWETH = await pool.calcPriceImpact(
    ['100000000000000000000', '100000000'],
    '99430576622436571714692',
    true
  );
  console.log(priceImpactWBTCWETH);

  const pool2 = await balancer.pools.find(staBal3Id);
  console.log(pool2);
  if (!pool2) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

  const priceImpactStaBal3 = await pool2.calcPriceImpact(
    ['100000000000000000000', '100000000', '190000000'],
    '376972471880969684010',
    true
  );
  console.log(priceImpactStaBal3);
}

getPriceImpact();
