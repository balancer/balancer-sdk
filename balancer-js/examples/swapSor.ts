/**
 *  Example showing how to find a swap for a pair using SOR directly
 *  - Path only uses swaps: use queryBatchSwap on Vault to see result
 *  - Path use join/exit: Use SDK functions to build calls to submit tx via Relayer
 */
import dotenv from 'dotenv';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Wallet } from '@ethersproject/wallet';
import { AddressZero } from '@ethersproject/constants';
import { BalancerSDK, Network, SwapTypes, someJoinExit, buildRelayerCalls } from '../src/index';

import { ADDRESSES } from '../src/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
const tokenIn = ADDRESSES[network].WETH.address;
const tokenOut = ADDRESSES[network].auraBal?.address;
const swapType = SwapTypes.SwapExactIn;
const amount = parseFixed('18.7777777', 18);

async function swap() {
    // The SOR will find paths including Weighted pool join/exits (currently only supported for ExactIn swap type)
    const useJoinExitPaths = true;

    const balancer = new BalancerSDK({
        network,
        rpcUrl,
    });
    
    await balancer.swaps.sor.fetchPools();

    const swapInfo = await balancer.swaps.sor.getSwaps(
        tokenIn!,
        tokenOut!,
        swapType,
        amount,
        undefined,
        (useJoinExitPaths && swapType === SwapTypes.SwapExactIn) // join/exit paths currently only supported for ExactIn
    );

    if(swapInfo.returnAmount.isZero()) {
        console.log('No Swap');
        return;
    }
    // console.log(swapInfo.swaps);
    // console.log(swapInfo.tokenAddresses);
    console.log(`Return amount: `, swapInfo.returnAmount.toString());

    const pools = balancer.swaps.sor.getPools();

    if (swapType === SwapTypes.SwapExactIn && someJoinExit(pools, swapInfo.swaps, swapInfo.tokenAddresses)) {
        console.log(`Swaps with join/exit paths. Must submit via Relayer.`);
        const key: any = process.env.TRADER_KEY;
        const wallet = new Wallet(key, balancer.sor.provider);
        const slippage = '50'; // 50 bsp = 0.5%
        const relayerCallData = buildRelayerCalls(
            swapInfo, 
            swapType, 
            pools, 
            wallet.address, 
            balancer.contracts.relayerV4!.address, 
            balancer.networkConfig.addresses.tokens.wrappedNativeAsset, 
            slippage, 
            undefined
        );
        // Static calling Relayer doesn't return any useful values but will allow confirmation tx is ok
        // relayerCallData.data can be used to simulate tx on Tenderly to see token balance change, etc
        // console.log(relayerCallData.data);
        const result = await balancer.contracts.relayerV4?.connect(wallet).callStatic.multicall(relayerCallData.rawCalls);
        console.log(result);
    } else {
        console.log(`Swaps via Vault.`)
        const userAddress = AddressZero;
        const deadline = BigNumber.from(`${Math.ceil(Date.now() / 1000) + 60}`); // 60 seconds from now
        const maxSlippage = 50; // 50 bsp = 0.5%

        const transactionAttributes = balancer.swaps.buildSwap({
            userAddress,
            swapInfo,
            kind: 0,
            deadline,
            maxSlippage,
        });

        const { attributes } = transactionAttributes;

        try {
            // Simulates a call to `batchSwap`, returning an array of Vault asset deltas.
            const deltas = await balancer.contracts.vault.callStatic.queryBatchSwap(
                swapType,
                swapInfo.swaps,
                swapInfo.tokenAddresses,
                attributes.funds
            );
            console.log(deltas.toString());
        } catch (err) {
            console.log(err);
        }
    }
}

// yarn examples:run ./examples/swapSor.ts
swap();
