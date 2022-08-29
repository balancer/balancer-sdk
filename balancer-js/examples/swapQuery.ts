/**
 *  Example showing how to find a swap for a pair and use queryBatchSwap to check result on Vault.
 */
import dotenv from 'dotenv';
import { BalancerSDK, Network, SwapTypes } from '../src/index';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { ADDRESSES } from '../src/test/lib/constants';

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

    if(swapInfo.returnAmount.isZero()) {
        console.log('No Swap');
        return;
    }

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
        console.log(`Return amounts: `, swapInfo.returnAmount.toString());
        console.log(swapInfo.swaps);
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

// yarn examples:run ./examples/swapQuery.ts
swap();
