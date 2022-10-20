/**
 *  Example showing how to find a swap for a pair and use queryBatchSwap to check result on Vault.
 */
import dotenv from 'dotenv';
import { BalancerSDK, Network, SwapTypes } from '../src/index';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { ADDRESSES } from '../src/test/lib/constants';
import { someJoinExit, buildRelayerCalls } from '../src/modules/swaps/joinAndExit';
import { Wallet } from 'ethers';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;
const tokenIn = ADDRESSES[network].WETH.address;
const tokenOut = ADDRESSES[network].auraBal?.address;
const swapType = SwapTypes.SwapExactIn;
const amount = parseFixed('0.84', 18);

async function swap() {

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
        swapType === SwapTypes.SwapExactIn // join/exit paths currently only supported for ExactIn
    );

    if(swapInfo.returnAmount.isZero()) {
        console.log('No Swap');
        return;
    }

    // console.log(swapInfo.swaps);
    const pools = balancer.swaps.sor.getPools();

    if (swapType === SwapTypes.SwapExactIn && someJoinExit(pools, swapInfo.swaps, swapInfo.tokenAddresses)) {
        const key: any = process.env.TRADER_KEY;
        const wallet = new Wallet(key, balancer.sor.provider);
        console.log(`Swaps with join/exit paths. Must submit via Relayer.`);
        console.log(`Return amount: `, swapInfo.returnAmount.toString());
        // console.log(swapInfo.tokenAddresses);
        const signerAddr = '0xdf330Ccb1d8fE97D176850BC127D0101cBe4e932';
        const relayerV4Address = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';
        const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        const slippage = '50'; // 50 bsp = 0.5%
        const relayerCallData = buildRelayerCalls(swapInfo, swapType, pools, signerAddr, relayerV4Address, wethAddress, slippage, undefined);
        // console.log(relayerCallData.data); // Can be used to simulate tx on Tenderly
        const result = await balancer.contracts.relayerV4?.connect(wallet).callStatic.multicall(relayerCallData.rawCalls);
        console.log(result); // Doesn't return any useful result but will allow confirmation tx is ok
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
            console.log(`Return amounts: `, swapInfo.returnAmount.toString());
            console.log(swapInfo.swaps);
            console.log(swapInfo.tokenAddresses);
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
