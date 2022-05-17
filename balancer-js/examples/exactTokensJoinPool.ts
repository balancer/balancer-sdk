import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { BalancerSDK, BalancerSdkConfig, Network } from '../src/index';
import { USDC, WETH } from './constants';

import { balancerVault } from '../src/lib/constants/config';
import vaultAbi from '../src/lib/abi/Vault.json';

dotenv.config();

/*
Example showing how to use Relayer to chain exitPool followed by batchSwaps using tokens from exit.
User must approve relayer.
Vault must have approvals for tokens.
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

    const txInfo = await balancer.pools.exactTokensJoinPool({
        joiner: wallet.address,
        poolId: '0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004',
        assets: [WETH.address, USDC.address],
        amountsIn: ['40107594979787384', '1000000000'],
        expectedBPTOut: '0', // TODO: validate if the expected output set as 0 actually means no restriction in the output
        slippage: '10000000000000000', // Slippage for join 1%
    });

    const vaultContract = new Contract(balancerVault, vaultAbi, wallet);

    // TODO: make sure this is the proper way to call the transaction
    const tx = await vaultContract
        .connect(wallet)
        .callStatic[txInfo.function](txInfo.params, {
            value: '0',
        });

    // TODO: figure out how to validate the transaction response
    console.log(defaultAbiCoder.decode(['int256[]'], tx[1]).toString());
}

// yarn examples:run ./examples/exactTokensJoinPool.ts
exactTokensJoinPool();
