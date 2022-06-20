import dotenv from 'dotenv';
import { parseFixed, BigNumber } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  BalancerSdkConfig,
  Network,
  SwapType,
} from '../src/index';
import { ADDRESSES } from '../src/test/lib/constants';

const DAI = ADDRESSES[Network.MAINNET].DAI.address;
const USDC = ADDRESSES[Network.MAINNET].USDC.address;
const USDT = ADDRESSES[Network.MAINNET].USDT.address;
const bbausd = ADDRESSES[Network.MAINNET].bbausd.address;

dotenv.config();

async function runQueryBatchSwapWithSor() {
  const config: BalancerSdkConfig = {
    network: Network.MAINNET,
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
  };
  const balancer = new BalancerSDK(config);

  const poolsFetched = await balancer.swaps.fetchPools();
  if (!poolsFetched) {
    console.log(`Error fetching pools data.`);
    return;
  }

  // Example showing how to join bb-a-usd pool by swapping stables > BPT
  let queryResult = await balancer.swaps.queryBatchSwapWithSor({
    tokensIn: [DAI, USDC, USDT],
    tokensOut: [bbausd, bbausd, bbausd],
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
    tokensIn: [bbausd, bbausd, bbausd],
    tokensOut: [DAI, USDC, USDT],
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
    tokensIn: [bbausd, bbausd, bbausd],
    tokensOut: [DAI, USDC, USDT],
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
