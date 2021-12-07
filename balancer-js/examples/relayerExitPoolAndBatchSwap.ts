import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
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
import { AAVE_DAI, AAVE_USDT, STABAL3PHANTOM } from './constants';

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
    This creates pool request for exactTokensOut.
    Here minAmoutsOut is known because it just matches the exact out amounts.
    maxBptIn should set to a known amount based on pool balances, etc.
    */
    const exactPoolTokensOut = ['100000', '100000000000000000'];
    const maxBptIn = MaxUint256;

    const exitPoolRequestExactTokensOut: ExitPoolRequest = {
        assets: [AAVE_USDT.address, AAVE_DAI.address],
        minAmountsOut: exactPoolTokensOut,
        userData: StablePoolEncoder.exitBPTInForExactTokensOut(
            exactPoolTokensOut,
            maxBptIn
        ),
        toInternalBalance: true, // We do initial exit to internal balance to save gas for following swaps
    };

    /*
    This creates pool request for exactBPTIn.
    minAmountsOut should be set to a known/realistic value as this is used to estimate swap/limit amounts and can cause issues if off.
    */
    const bptAmountIn = '2049658696117824796';
    const minAmountsOut = ['1019700', '1029989699999948233'];

    const exitPoolRequestExactBptIn: ExitPoolRequest = {
        assets: [AAVE_USDT.address, AAVE_DAI.address],
        minAmountsOut: minAmountsOut,
        userData: StablePoolEncoder.exitExactBPTInForTokensOut(bptAmountIn),
        toInternalBalance: true, // We do initial exit to internal balance to save gas for following swaps
    };

    const exitPoolInput: EncodeExitPoolInput = {
        poolId: '0xf5f6fb82649df7991054ef796c39da81b93364df0002000000000000000004a5', // USDT/DAI pool
        poolKind: 0, // This will always be 0 for now
        sender: wallet.address,
        recipient: wallet.address,
        outputReferences: [], // This is overwritten in function to include correct refs
        exitPoolRequest: exitPoolRequestExactBptIn,
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
        [STABAL3PHANTOM.address, STABAL3PHANTOM.address], // TO DO - This is confusing?
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
            // gasPrice: '6000000000',
            // gasLimit: '2000000',
        });

    console.log(`Swap Deltas:`);
    console.log(defaultAbiCoder.decode(['int256[]'], tx[1]).toString());
}

// TS_NODE_PROJECT='tsconfig.testing.json' ts-node ./examples/relayerExitPoolAndBatchSwap.ts
relayerExitPoolAndBatchSwap();
