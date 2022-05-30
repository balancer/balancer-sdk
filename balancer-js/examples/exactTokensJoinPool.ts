import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { defaultAbiCoder } from '@ethersproject/abi';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK, BalancerSdkConfig, Network } from '../src/index';
import { USDC, WETH } from './constants';

import { balancerVault } from '../src/lib/constants/config';

dotenv.config();

/*
Example showing how to use Pools module to join pools with exact tokens in method.
*/
async function exactTokensJoinPool() {
    const config: BalancerSdkConfig = {
        network: Network.KOVAN,
        rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
    };

    const provider = new JsonRpcProvider(config.rpcUrl);
    const key: any = process.env.TRADER_KEY;
    const wallet = new Wallet(key, provider);

    const balancer = new BalancerSDK(config);

    const txInfo = await balancer.pools.join.exactTokensJoinPool(
        wallet.address,
        '0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004', // BAL50-WETH50 pool on kovan https://kovan.etherscan.io/token/0x3A19030Ed746bD1C3f2B0f996FF9479aF04C5F0A
        [USDC.address, WETH.address],
        ['1000', '0.0404635786916841'],
        '0.01'
    );

    const tx = await wallet.call({
        data: txInfo,
        to: balancerVault,
        // gasPrice: '6000000000', // gas inputs are optional
        // gasLimit: '2000000', // gas inputs are optional
    });
}

// yarn examples:run ./examples/exactTokensJoinPool.ts
exactTokensJoinPool();
