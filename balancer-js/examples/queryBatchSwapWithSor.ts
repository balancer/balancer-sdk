import dotenv from 'dotenv';
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  BalancerSdkConfig,
  Network,
  SwapType,
} from '../src/index';
import { AAVE_DAI, AAVE_USDC, AAVE_USDT, bbausd } from './constants';

dotenv.config();

async function runQueryBatchSwapWithSor() {
  const config: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  };
  const balancer = new BalancerSDK(config);

  const poolsFetched = await balancer.swaps.fetchPools();
  if (!poolsFetched) {
    console.log(`Error fetching pools data.`);
    return;
  }

  // Example showing how to join bb-a-usd pool by swapping stables > BPT
  let queryResult = await balancer.swaps.queryBatchSwapWithSor({
    tokensIn: [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
    tokensOut: [bbausd.address, bbausd.address, bbausd.address],
    swapType: SwapType.SwapExactIn,
    amounts: [
      parseFixed('100', 18).toString(),
      parseFixed('100', 6).toString(),
      parseFixed('100', 6).toString(),
    ],
    fetchPools: {
      fetchPools: false, // Because pools were previously fetched we can reuse to speed things up
      fetchOnChain: false,
    },
  });
  console.log(`\n******* stables > BPT ExactIn`);
  console.log(queryResult.swaps);
  console.log(queryResult.assets);
  console.log(queryResult.deltas.toString());
  console.log(queryResult.returnAmounts.toString());

  // Example showing how to exit bb-a-usd pool by swapping BPT > stables
  queryResult = await balancer.swaps.queryBatchSwapWithSor({
    tokensIn: [bbausd.address, bbausd.address, bbausd.address],
    tokensOut: [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
    swapType: SwapType.SwapExactIn,
    amounts: [
      parseFixed('1', 18).toString(),
      parseFixed('1', 18).toString(),
      parseFixed('1', 18).toString(),
    ],
    fetchPools: {
      fetchPools: false,
      fetchOnChain: false,
    },
  });
  console.log(`\n******* BPT > stables ExactIn`);
  console.log(queryResult.swaps);
  console.log(queryResult.assets);
  console.log(queryResult.deltas.toString());
  console.log(queryResult.returnAmounts.toString());

  queryResult = await balancer.swaps.queryBatchSwapWithSor({
    tokensIn: [bbausd.address, bbausd.address, bbausd.address],
    tokensOut: [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
    swapType: SwapType.SwapExactOut,
    amounts: queryResult.returnAmounts.map((amt) =>
      BigNumber.from(amt).abs().toString()
    ),
    fetchPools: {
      fetchPools: false,
      fetchOnChain: false,
    },
  });
  console.log(`\n******* BPT > stables Exact Out`);
  console.log(queryResult.swaps);
  console.log(queryResult.assets);
  console.log(queryResult.deltas.toString());
  console.log(queryResult.returnAmounts.toString());
}

// yarn examples:run ./examples/queryBatchSwapWithSor.ts
runQueryBatchSwapWithSor();
