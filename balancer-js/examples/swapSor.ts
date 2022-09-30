/**
 *  Example showing how to find a swap for a pair and use queryBatchSwap to check result on Vault.
 */
import dotenv from 'dotenv';
import { BalancerSDK, Network, SwapTypes } from '../src/index';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { ADDRESSES } from '../src/test/lib/constants';
import { buildCalls, someJoinExit } from '../src/modules/swaps/joinAndExit';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
const tokenIn = ADDRESSES[network].BAL.address;
// const tokenOut = ADDRESSES[network].BAL8020BPT?.address;
const tokenOut = ADDRESSES[network].auraBal?.address;
const swapType = SwapTypes.SwapExactIn;
const amount = parseFixed('1', 18);

async function swap() {

    const balancer = new BalancerSDK({
        network,
        rpcUrl,
    });
    
    await balancer.swaps.sor.fetchPools();

    const swapInfo = await balancer.swaps.sor.getSwaps(
        tokenIn,
        tokenOut!,
        swapType,
        amount,
        undefined,
        true
    );

    if(swapInfo.returnAmount.isZero()) {
        console.log('No Swap');
        return;
    }

    console.log(swapInfo.swaps);

    const signerAddr = '0xdf330Ccb1d8fE97D176850BC127D0101cBe4e932';
    const pools = balancer.swaps.sor.getPools();
    const callData = buildCalls(
        pools,
        tokenIn,
        tokenOut!,
        swapInfo,
        signerAddr,
        undefined,
        swapType
    );

    console.log(callData.data);

    // const userAddress = AddressZero;
    // const deadline = BigNumber.from(`${Math.ceil(Date.now() / 1000) + 60}`); // 60 seconds from now
    // const maxSlippage = 50; // 50 bsp = 0.5%

    // const transactionAttributes = balancer.swaps.buildSwap({
    //     userAddress,
    //     swapInfo,
    //     kind: 0,
    //     deadline,
    //     maxSlippage,
    // });

    // const { attributes } = transactionAttributes;

    // try {
    //     console.log(`Return amounts: `, swapInfo.returnAmount.toString());
    //     console.log(swapInfo.swaps);
    //     // Simulates a call to `batchSwap`, returning an array of Vault asset deltas.
    //     const deltas = await balancer.contracts.vault.callStatic.queryBatchSwap(
    //         swapType,
    //         swapInfo.swaps,
    //         swapInfo.tokenAddresses,
    //         attributes.funds
    //     );
    //     console.log(deltas.toString());
    // } catch (err) {
    //     console.log(err);
    // }
}

// yarn examples:run ./examples/swapSor.ts
swap();
