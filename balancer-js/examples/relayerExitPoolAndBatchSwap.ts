import dotenv from 'dotenv';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { MaxUint256 } from '@ethersproject/constants';

import {
    BalancerSDK,
    Network,
    ConfigSdk,
    SUBGRAPH_URLS,
    EncodeExitPoolInput,
    ExitPoolRequest,
    StablePoolEncoder,
} from '../src/index';
import { FundManagement } from '../src/swapsService/types';
import { AAVE_DAI, AAVE_USDC, AAVE_USDT, STABAL3PHANTOM } from './constants';

import balancerRelayerAbi from '../src/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
ExactOut - Exact amount of tokens out are used for swaps.
User must approve relayer
Vault must have approvals for tokens
*/
async function relayerExitPoolAndBatchSwap() {
    const config: ConfigSdk = {
        network: Network.KOVAN,
        rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
        subgraphUrl: SUBGRAPH_URLS[Network.KOVAN],
    };

    const provider = new JsonRpcProvider(config.rpcUrl);
    const key: any = process.env.TRADER_KEY;
    const relayerAddress = '0x3C255DE4a73Dd251A33dac2ab927002C964Eb2cB';
    const wallet = new Wallet(key, provider);

    const balancer = new BalancerSDK(config);

    /*
    Actual amounts for swap will be exact amounts received from exitPool call but an accurate
    input here will mean limits and amountsOut returned is more accurate.
    */
    const exactPoolTokensOut = ['1000000000000000', '1000000', '1000000'];

    const exitPoolRequest: ExitPoolRequest = {
        assets: [AAVE_DAI.address, AAVE_USDC.address, AAVE_USDT.address],
        minAmountsOut: exactPoolTokensOut,
        userData: StablePoolEncoder.exitBPTInForExactTokensOut(
            exactPoolTokensOut,
            MaxUint256
        ), // TO DO - Check case for: StablePoolEncoder.exitExactBPTInForTokensOut(bptAmountIn) needs helper to find minAmountsOut. Must be in front-end already?
        toInternalBalance: true, // We do initial exit to internal balance to save gas for following swaps
    };

    const exitPoolInput: EncodeExitPoolInput = {
        poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063', // TO DO - Needs deployed pool
        poolKind: 0, // This will always be 0 for now
        sender: wallet.address,
        recipient: wallet.address,
        outputReferences: [], // TO DO - Overwrite this in function?
        exitPoolRequest: exitPoolRequest,
    };

    // Creates fund management info for swap part of call
    const funds: FundManagement = {
        sender: wallet.address,
        recipient: wallet.address,
        fromInternalBalance: true,
        toInternalBalance: false,
    };

    const txInfo = await balancer.relayer.exitPoolAndBatchSwap(
        exitPoolInput,
        [
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
        ],
        funds,
        '50000000000000000' // Slippage for swap 5%
    );

    console.log(`Return amounts:`);
    console.log(txInfo.outputs.amountsOut.toString());

    const relayerContract = new Contract(
        relayerAddress,
        balancerRelayerAbi,
        provider
    );
    const tx = await relayerContract
        .connect(wallet)
        .callStatic[txInfo.function](txInfo.params, {
            value: '0',
            gasPrice: '6000000000',
            // gasLimit: '200000',
        });
    console.log(tx);
}

// TS_NODE_PROJECT='tsconfig.testing.json' ts-node ./examples/relayerExitPoolAndBatchSwap.ts
relayerExitPoolAndBatchSwap();
