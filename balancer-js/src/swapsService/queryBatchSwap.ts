
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
Uses SOR to create a batchSwap which is then queried onChain.
*/
export async function queryBatchSwapWithSor(
    sor: SOR,
    vaultContract: Contract,
    tokensIn: string[],
    tokensOut: string[],
    swapType: SwapType,
    amounts: BigNumberish[],
    fetchPools: boolean
): Promise<{ returnAmounts: BigNumberish[]; swaps: BatchSwapStep[]; assets: string[] }> {

    if(fetchPools)
        await sor.fetchPools([], false);

    const swaps: BatchSwapStep[][] = [];
    const assetArray: string[][] = [];
    // get path information for each tokenIn
    for (let i = 0; i < tokensIn.length; i++) {
        const swap = await getSorSwapInfo(
            tokensIn[i],
            tokensOut[i],
            swapType,
            amounts[i].toString(),
            sor
        );
        swaps.push(swap.swaps);
        assetArray.push(swap.tokenAddresses);
    }

    // Join swaps and assets together correctly
    const batchedSwaps = batchSwaps(assetArray, swaps);

    const returnTokens = swapType === SwapType.SwapExactIn ? tokensOut : tokensIn;
    const returnAmounts: BigNumberish[] = Array(returnTokens.length).fill(Zero);
    try {
        // Onchain query
        const deltas = await queryBatchSwap(
            vaultContract,
            swapType,
            batchedSwaps.swaps,
            batchedSwaps.assets
        );

        returnTokens.forEach((t, i) => returnAmounts[i] = deltas[batchedSwaps.assets.indexOf(t.toLowerCase())] ?? Zero)
    } catch (err) {
        console.error(`queryBatchSwapTokensIn error: ${err}`);
    }

    return {
        returnAmounts,
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
    // asset addresses without duplicates
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