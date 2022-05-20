/**
 *  Example showing how to find a swap and send it using ethers.
 */

import dotenv from 'dotenv';
import { BigNumber } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { InfuraProvider } from '@ethersproject/providers';
import { BalancerSDK, Network } from '../src/index';

dotenv.config();

const { TRADER_KEY, TRADER_ADDRESS, INFURA_PROJECT_ID } = process.env;
const rpcUrl = `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`;

const balancer = new BalancerSDK({
    network: Network.KOVAN,
    rpcUrl,
});

const provider = new InfuraProvider(Network.KOVAN, INFURA_PROJECT_ID);
const wallet = new Wallet(TRADER_KEY as string, provider);

async function executeSwapWithEthers() {
    const userAddress =
        TRADER_ADDRESS || '0x0000000000000000000000000000000000000000';
    const eth = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // ETH
    const usdc = '0xc2569dd7d0fd715b054fbf16e75b001e5c0c1115'; // 6 decimals
    const dai = '0x04df6e4121c27713ed22341e7c7df330f56f289b'; // 18 decimals
    const amount = BigNumber.from('1000000000000000000');
    const gasPrice = BigNumber.from('10000000000000');
    const maxPools = 4;
    const deadline = BigNumber.from(`${Math.ceil(Date.now() / 1000) + 60}`) // 60 seconds from now
    const maxSlippage = 50; // 50 bsp = 0.5%

    await balancer.swaps.fetchPools();

    const route = await balancer.swaps.findRouteGivenIn({
        tokenIn: dai,
        tokenOut: usdc,
        amount,
        gasPrice,
        maxPools,
    });

    console.log(route);

    // Prepares transaction attributes based on the route
    const transactionAttributes = balancer.swaps.buildSwap({
        userAddress,
        swapInfo: route,
        kind: 0, // 0 - givenIn, 1 - givenOut
        deadline,
        maxSlippage,
    });

    // Extract parameters required for sendTransaction
    const { to, data, value } = transactionAttributes;

    // Execution with ethers.js
    const transactionResponse = await wallet.sendTransaction({
        to,
        data,
        value,
    });

    console.log(transactionResponse);
}

// yarn examples:run ./examples/swap.ts
executeSwapWithEthers();
