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
const auraBal = '0x616e8bfa43f920657b3497dbf40d6b1a02d4608d';
const tokenIn = auraBal; // ADDRESSES[network].USDC.address;
const tokenOut = ADDRESSES[network].WETH.address; // '0xc45d42f801105e861e86658648e3678ad7aa70f9'; // '0x616e8bfa43f920657b3497dbf40d6b1a02d4608d'; // ADDRESSES[network].DAI.address;
const swapType = SwapTypes.SwapExactIn;
const amount = parseFixed('1', 18);

async function swap() {
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  await balancer.swaps.fetchPools();

  balancer.sor.getPools()
  
  const params = {
    tokenIn,
    tokenOut,
    amount,
    gasPrice: gasPrice,
    maxPools: 4,
    useBpts: true
  };

  const swapInfo = await balancer.swaps.findRouteGivenIn(params);

  const referenceToken = ADDRESSES[network].WETH.address;
  if (swapInfo.returnAmount.isZero()) {
    console.log('No Swap');
    return;
  }
  const output = await balancer.swaps.formatSwapsForGnosis(swapInfo, referenceToken, params.useBpts);
  console.log(output);
}

// yarn examples:run ./examples/cowSwapFormat.ts
swap();

