/**
 *  Example showing how to find a swap for a pair and use queryBatchSwap to check result on Vault.
 */
import dotenv from 'dotenv';
import { BalancerSDK, Network, PoolModel, SwapTypes } from '../src/index';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { ADDRESSES } from '../src/test/lib/constants';
import {
  bnum,
  parseToPoolsDict,
  PoolBase,
  SubgraphPoolBase,
} from '@balancer-labs/sor';
import { BigNumber as OldBigNumber } from 'bignumber.js';

dotenv.config();

const network = Network.POLYGON;
// const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
const rpcUrl = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA}`;
const tokenIn = ADDRESSES[network].DAI.address;
const tokenOut = ADDRESSES[network].USDC.address;
const swapType = SwapTypes.SwapExactIn;
const amount = parseFixed('1', 18);

async function swap() {
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  await balancer.swaps.fetchPools();

  const swapInfo = await balancer.swaps.findRouteGivenIn({
    tokenIn,
    tokenOut,
    amount,
    gasPrice: parseFixed('1', 9),
    maxPools: 4,
  });

  if (swapInfo.returnAmount.isZero()) {
    console.log('No Swap');
    return;
  }

  const poolsProvider = balancer.poolsProvider;
  const swaps = swapInfo.swaps;
  for (const swap of swaps) {
    const pool = (await poolsProvider.find(swap.poolId)) as PoolModel;
    const subgraphPoolBase = pool as SubgraphPoolBase;
    const parsedPool = parseToPoolsDict([subgraphPoolBase], 0)[pool.id];
    const tokenIn = swapInfo.tokenAddresses[swap.assetInIndex];
    const tokenOut = swapInfo.tokenAddresses[swap.assetOutIndex];
    const amount = swap.amount;
    const fee = pool.swapFee;
    const poolPairData = parsedPool.parsePoolPairData(tokenIn, tokenOut);
    const reserves: {[token: string]: string} = getReserves(parsedPool);

    // The following code might need to be modified to support the case swapExactOut 
    const amountOut = parsedPool._exactTokenInForTokenOut(
      poolPairData,
      bnum(amount)
    );
    const index = swapInfo.swaps.indexOf(swap);
    if (index < swaps.length - 1) {
      if (swaps[index + 1].amount == '0') {
        swaps[index + 1].amount = amountOut.toString();
      }
    }
    const execution = [
      {
        buy_token: tokenOut,
        exec_buy_amount: amountOut,
        exec_plan: {
          position: 0,
          sequence: 0,
        },
        exec_sell_amount: amount,
        sell_token: tokenIn,
      },
    ];
    const cowSwapOrder = {
      [index]: {
        cost: {
          amount: ' ',
          token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        },
        execution: execution,
        fee: fee,
        kind: pool.poolType,
        mandatory: '',
        reserves: reserves
      },
    };
    console.log(JSON.stringify(cowSwapOrder, null, 2));
  }
}

function getReserves(parsedPool: PoolBase): { [token: string]: string; } {
  const reserves: {[token: string]: string} = {};
  const tokensList = parsedPool.tokensList;
  const balances: string[] = [];
  for (let i = 0; i < tokensList.length - 1; i++) {
    const poolPairData = parsedPool.parsePoolPairData(tokensList[i], tokensList[i + 1]);
    balances.push(poolPairData.balanceIn.toString());
    if (i == tokensList.length - 2) {
      balances.push(poolPairData.balanceOut.toString());
    }
  }
  tokensList.forEach((token, i) => reserves[token] = balances[i]);
  return reserves;
}

// yarn examples:run ./examples/cowSwapFormat.ts
swap();

