
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { AddressZero, Zero } from '@ethersproject/constants';
import { SOR, SwapTypes, SwapInfo } from 'sor-linear';
import { SwapType, BatchSwapStep, FundManagement } from './types';


/*
 * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas. Calls to `swap` cannot be
 * simulated directly, but an equivalent `batchSwap` call can and will yield the exact same result.
 *
 * Each element in the array corresponds to the asset at the same index, and indicates the number of tokens (or ETH)
 * the Vault would take from the sender (if positive) or send to the recipient (if negative). The arguments it
 * receives are the same that an equivalent `batchSwap` call would receive.
 */
export async function queryBatchSwap(
    vaultContract: Contract,
    swapType: SwapType,
    swaps: BatchSwapStep[],
    assets: string[]
): Promise<BigNumberish[]> {
    const funds: FundManagement = {
        sender: AddressZero,
        recipient: AddressZero,
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    try {
        return await vaultContract.queryBatchSwap(swapType, swaps, assets, funds);
    } catch (err) {
        throw `queryBatchSwap call error`;
    }
}

/*
Uses SOR to create and query a batchSwap for multiple tokens in > single tokenOut.
For example can be used to join staBal3 with DAI/USDC/USDT.
*/
export async function queryBatchSwapTokensIn(
    sor: SOR,
    vaultContract: Contract,
    tokensIn: string[],
    amountsIn: BigNumberish[],
    tokenOut: string,
    fetchPools: boolean
): Promise<{ amountTokenOut: BigNumberish; swaps: BatchSwapStep[]; assets: string[] }> {

    if(fetchPools)
        await sor.fetchPools([], false);

    const swaps: BatchSwapStep[][] = [];
    const assetArray: string[][] = [];
    // get path information for each tokenIn
    for (let i = 0; i < tokensIn.length; i++) {
        const swap = await getSorSwapInfo(
            tokensIn[i],
            tokenOut,
            SwapType.SwapExactIn,
            amountsIn[i].toString(),
            sor
        );
        swaps.push(swap.swaps);
        assetArray.push(swap.tokenAddresses);
    }

    // Join swaps and assets together correctly
    const batchedSwaps = batchSwaps(assetArray, swaps);

    let amountTokenOut: BigNumberish = Zero;
    try {
        // Onchain query
        const deltas = await queryBatchSwap(
            vaultContract,
            SwapType.SwapExactIn,
            batchedSwaps.swaps,
            batchedSwaps.assets
        );
        amountTokenOut =
            deltas[batchedSwaps.assets.indexOf(tokenOut.toLowerCase())] ?? '0';
    } catch (err) {
        console.error(`queryBatchSwapTokensIn error: ${err}`);
    }

    return {
        amountTokenOut,
        swaps: batchedSwaps.swaps,
        assets: batchedSwaps.assets,
    };
}

/*
Uses SOR to create and query a batchSwap for a single token in > multiple tokens out.
For example can be used to exit staBal3 to DAI/USDC/USDT.
*/
export async function queryBatchSwapTokensOut(
    sor: SOR,
    vaultContract: Contract,
    tokenIn: string,
    amountsIn: BigNumberish[],
    tokensOut: string[],
    fetchPools: boolean
): Promise<{ amountTokensOut: string[]; swaps: BatchSwapStep[]; assets: string[] }> {

    if (fetchPools)
        await sor.fetchPools([], false);

    const swaps: BatchSwapStep[][] = [];
    const assetArray: string[][] = [];
    // get path information for each tokenOut
    for (let i = 0; i < tokensOut.length; i++) {
        const swap = await getSorSwapInfo(
            tokenIn,
            tokensOut[i],
            SwapType.SwapExactIn,
            amountsIn[i].toString(),
            sor
        );
        swaps.push(swap.swaps);
        assetArray.push(swap.tokenAddresses);
    }

    // Join swaps and assets together correctly
    const batchedSwaps = batchSwaps(assetArray, swaps);
    const amountTokensOut = Array(tokensOut.length).fill('0');
    try {
        // Onchain query
        const deltas = await queryBatchSwap(
            vaultContract,
            SwapType.SwapExactIn,
            batchedSwaps.swaps,
            batchedSwaps.assets
        );

        tokensOut.forEach((t, i) => {
            const amount = deltas[batchedSwaps.assets.indexOf(t.toLowerCase())];
            if (amount) amountTokensOut[i] = amount.toString();
        });
    } catch (err) {
        console.error(`queryBatchSwapTokensOut error: ${err}`);
    }

    return {
        amountTokensOut,
        swaps: batchedSwaps.swaps,
        assets: batchedSwaps.assets,
    };
}

/*
Use SOR to get swapInfo for tokenIn>tokenOut.
SwapInfos.swaps has path information.
*/
async function getSorSwapInfo(
    tokenIn: string,
    tokenOut: string,
    swapType: SwapType,
    amount: string,
    sor: SOR
): Promise<SwapInfo> {
    const swapTypeSOR: SwapTypes = swapType === SwapType.SwapExactIn ? SwapTypes.SwapExactIn : SwapTypes.SwapExactOut;
    const swapInfo = await sor.getSwaps(
        tokenIn.toLowerCase(),
        tokenOut.toLowerCase(),
        swapTypeSOR,
        amount
    );
    return swapInfo;
}

/*
Format multiple individual swaps/assets into a single swap/asset.
*/
function batchSwaps(
    assetArray: string[][],
    swaps: BatchSwapStep[][]
): { swaps: BatchSwapStep[]; assets: string[] } {
    // assest addresses without duplicates
    const newAssetArray = [...new Set(assetArray.flat())];

    // Update indices of each swap to use new asset array
    swaps.forEach((swap, i) => {
        swap.forEach((poolSwap) => {
            poolSwap.assetInIndex = newAssetArray.indexOf(
                assetArray[i][poolSwap.assetInIndex]
            );
            poolSwap.assetOutIndex = newAssetArray.indexOf(
                assetArray[i][poolSwap.assetOutIndex]
            );
        });
    });

    // Join Swaps into a single batchSwap
    const batchedSwaps = swaps.flat();
    return { swaps: batchedSwaps, assets: newAssetArray };
}