import { JsonRpcProvider } from '@ethersproject/providers';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { AddressZero } from '@ethersproject/constants';
import { SwapType, BatchSwapStep, FundManagement } from './types';
import { Network } from '../constants/network';
import { balancerVault } from '../constants/contracts';

import vaultAbi from '../abi/Vault.json';

/*
 * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas. Calls to `swap` cannot be
 * simulated directly, but an equivalent `batchSwap` call can and will yield the exact same result.
 *
 * Each element in the array corresponds to the asset at the same index, and indicates the number of tokens (or ETH)
 * the Vault would take from the sender (if positive) or send to the recipient (if negative). The arguments it
 * receives are the same that an equivalent `batchSwap` call would receive.
 *
 * Unlike `batchSwap`, this function performs no checks on the sender or recipient field in the `funds` struct.
 * This makes it suitable to be called by off-chain applications via eth_call without needing to hold tokens,
 * approve them for the Vault, or even know a user's address.
 */
export async function queryBatchSwap(
    swapType: SwapType,
    swaps: BatchSwapStep[],
    assets: string[],
    params: {
        network: Network,
        rpcUrl: string,
        vaultContract?: Contract,
    }
): Promise<BigNumberish[]> {
    const funds: FundManagement = {
        sender: AddressZero,
        recipient: AddressZero,
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    // HOW SHOULD THIS BE HANDLED?
    let vaultContract;
    if(!params.vaultContract){
        const provider = new JsonRpcProvider(params.rpcUrl);
        // TO DO - How to save address constants and abis?
        // ABIs used across all SDK
        // vault always has address and abi
        vaultContract =  new Contract(balancerVault, vaultAbi, provider);;
    } else
        vaultContract = params.vaultContract;

    // Should we try/catch here?
    return await vaultContract.queryBatchSwap(swapType, swaps, assets, funds);
}