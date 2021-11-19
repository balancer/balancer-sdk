
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { AddressZero } from '@ethersproject/constants';
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