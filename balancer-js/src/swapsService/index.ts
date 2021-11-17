import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { BigNumberish } from '@ethersproject/bignumber';

import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapType, BatchSwapStep } from './types';
import { queryBatchSwap } from './queryBatchSwap';
import { balancerVault } from '../constants/contracts';

import vaultAbi from '../abi/Vault.json';

export class SwapsService {
    network: Network;
    rpcUrl: string;

    constructor(config: ConfigSdk) {
        this.network = config.network;
        this.rpcUrl = config.rpcUrl;
    }

    /**
     * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
     * @param swapType - either exactIn or exactOut.
     * @param swaps - sequence of swaps.
     * @param assets - array contains the addresses of all assets involved in the swaps.
     * @returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
     * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
     * the same index in the `assets` array.
     */
    async queryBatchSwap(
        swapType: SwapType,
        swaps: BatchSwapStep[],
        assets: string[]): Promise<BigNumberish[]> {

        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);;

        return await queryBatchSwap(
            vaultContract,
            swapType,
            swaps,
            assets
        );
    }
}