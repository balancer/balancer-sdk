import dotenv from 'dotenv';
import { defaultAbiCoder } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

import {
    BalancerSDK,
    Network,
    ConfigSdk,
    SUBGRAPH_URLS,
    AaveHelpers,
} from '../src/index';
import { FundManagement } from '../src/swapsService/types';
import {
    WRAPPED_AAVE_DAI,
    WRAPPED_AAVE_USDC,
    WRAPPED_AAVE_USDT,
    STABAL3PHANTOM,
} from './constants';

import balancerRelayerAbi from '../src/abi/BalancerRelayer.json';

dotenv.config();

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
ExactIn - Exact amount of tokenIn to use in swap.
User must approve relayer
Vault must have approvals for tokens
*/
async function runRelayerSwapUnwrapExactIn() {
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

    // Creates fund management info for swap part of call
    const funds: FundManagement = {
        sender: wallet.address,
        recipient: relayerAddress, // Note relayer is recipient of swaps
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    // This is using a helper function to get the up to date rates for the Aave tokens
    const daiRate = await AaveHelpers.getRate(
        '0x26575a44755e0aaa969fdda1e4291df22c5624ea',
        provider
    );
    const usdcRate = await AaveHelpers.getRate(
        '0x26743984e3357eFC59f2fd6C1aFDC310335a61c9',
        provider
    );
    const usdtRate = await AaveHelpers.getRate(
        '0xbfd9769b061e57e478690299011a028194d66e3c',
        provider
    );

    const txInfo = await balancer.relayer.swapUnwrapAaveStaticExactIn(
        [
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
        ],
        [
            WRAPPED_AAVE_DAI.address,
            WRAPPED_AAVE_USDC.address,
            WRAPPED_AAVE_USDT.address,
        ],
        [
            parseFixed('1', 16).toString(),
            parseFixed('1', 16).toString(),
            parseFixed('1', 16).toString(),
        ],
        [daiRate, usdcRate, usdtRate],
        funds,
        '50000000000000000' // Slippage 5%
    );

    const relayerContract = new Contract(
        relayerAddress,
        balancerRelayerAbi,
        provider
    );
    const tx = await relayerContract
        .connect(wallet)
        .callStatic[txInfo.function](txInfo.params, {
            value: '0',
            // gasLimit: '2000000',
        });

    console.log(`Swap Deltas:`);
    console.log(defaultAbiCoder.decode(['int256[]'], tx[0]).toString());
    console.log(`Unwrapped Amounts Out:`);
    console.log(txInfo.outputs.amountsOut.toString());
}

/*
Example showing how to exit bb-a-USDC to stables via Relayer.
ExactOut - Exact amount of tokens out are used for swaps.
User must approve relayer
Vault must have approvals for tokens
*/
async function runRelayerSwapUnwrapExactOut() {
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

    // Creates fund management info for swap part of call
    const funds: FundManagement = {
        sender: wallet.address,
        recipient: relayerAddress, // Note relayer is recipient of swaps
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    // This is using a helper function to get the up to date rates for the Aave tokens
    const daiRate = await AaveHelpers.getRate(
        '0x26575a44755e0aaa969fdda1e4291df22c5624ea',
        provider
    );
    const usdcRate = await AaveHelpers.getRate(
        '0x26743984e3357eFC59f2fd6C1aFDC310335a61c9',
        provider
    );
    const usdtRate = await AaveHelpers.getRate(
        '0xbfd9769b061e57e478690299011a028194d66e3c',
        provider
    );

    const txInfo = await balancer.relayer.swapUnwrapAaveStaticExactOut(
        [
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
            STABAL3PHANTOM.address,
        ],
        [
            WRAPPED_AAVE_DAI.address,
            WRAPPED_AAVE_USDC.address,
            WRAPPED_AAVE_USDT.address,
        ],
        [parseFixed('1', 16).toString(), '1000', '1000'], // Amount of unwrapped Aave token we want to receive
        [daiRate, usdcRate, usdtRate],
        funds,
        '50000000000000000' // Slippage 5%
    );

    const relayerContract = new Contract(
        relayerAddress,
        balancerRelayerAbi,
        provider
    );
    const tx = await relayerContract
        .connect(wallet)
        .callStatic[txInfo.function](txInfo.params, {
            value: '0',
            // gasLimit: '2000000',
        });

    console.log(`Swap Deltas:`);
    console.log(defaultAbiCoder.decode(['int256[]'], tx[0]).toString());
    console.log(`Amounts In:`);
    console.log(txInfo.outputs.amountsIn);
}

// TS_NODE_PROJECT='tsconfig.testing.json' ts-node ./examples/relayerSwapUnwrap.ts
// runRelayerSwapUnwrapExactOut();
runRelayerSwapUnwrapExactIn();
