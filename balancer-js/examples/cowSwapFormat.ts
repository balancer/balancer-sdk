/**
 *  Example showing how to find a swap for a pair and use queryBatchSwap to check result on Vault.
 */
import dotenv from 'dotenv';
import { BalancerSDK, Network, SwapInfo, Swaps, SwapTypes } from '../src/index';
import { parseFixed } from '@ethersproject/bignumber';
import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

// const network = Network.POLYGON;
const network = Network.MAINNET;
// const rpcUrl = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA}`;
const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
const gasPrice = parseFixed('1', 9);
const tokenIn = ADDRESSES[network].DAI.address;
const tokenOut = ADDRESSES[network].USDC.address;
const swapType = SwapTypes.SwapExactOut;
const amount = parseFixed('1', 6);

async function swap() {
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  await balancer.swaps.fetchPools();

  const params = {
    tokenIn,
    tokenOut,
    amount,
    gasPrice: gasPrice,
    maxPools: 4,
  };

  const swapInfo = await balancer.swaps.findRouteGivenOut(params);

  const costToken = ADDRESSES[network].WETH;
  const costAmount = await balancer.sor.getCostOfSwapInToken(costToken.address, costToken.decimals, gasPrice);
  if (swapInfo.returnAmount.isZero()) {
    console.log('No Swap');
    return;
  }
  const output = await balancer.swaps.formatSwapsForGnosis(swapInfo, costToken.address, costAmount, swapType);
  console.log(output);
}

// yarn examples:run ./examples/cowSwapFormat.ts
swap();

