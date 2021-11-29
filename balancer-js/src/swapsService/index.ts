import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { BigNumberish } from '@ethersproject/bignumber';
import { SOR } from 'sor-linear';

import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapType, BatchSwapStep, QueryWithSor, BatchSwap } from './types';
import { queryBatchSwap, queryBatchSwapWithSor } from './queryBatchSwap';
import { balancerVault } from '../constants/contracts';
import { getLimitsForSlippage } from './helpers';

import vaultAbi from '../abi/Vault.json';

export class SwapsService {
    network: Network;
    rpcUrl: string;
    sor: SOR;

    constructor(config: ConfigSdk) {
        this.network = config.network;
        this.rpcUrl = config.rpcUrl;
        const provider = new JsonRpcProvider(this.rpcUrl);
        this.sor = new SOR(provider, this.network, config.subgraphUrl);
    }

    static getLimitsForSlippage(
        tokensIn: string[],
        tokensOut: string[],
        swapType: SwapType,
        amountsTokenIn: BigNumberish[],
        amountsTokenOut: BigNumberish[],
        assets: string[],
        slippage: BigNumberish
    ): BigNumberish[] {
        // TO DO - Check best way to do this?
        return getLimitsForSlippage(
            tokensIn,
            tokensOut,
            swapType,
            amountsTokenIn,
            amountsTokenOut,
            assets,
            slippage
        );
    }

    /**
     * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
     * @param batchSwap - BatchSwap information used for query.
     * @param batchSwap.kind - either exactIn or exactOut.
     * @param batchSwap.swaps - sequence of swaps.
     * @param batchSwap.assets - array contains the addresses of all assets involved in the swaps.
     * @returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
     * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
     * the same index in the `assets` array.
     */
    async queryBatchSwap(batchSwap: Pick<BatchSwap, 'kind' | 'swaps' | 'assets'>): Promise<BigNumberish[]> {

        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwap(
            vaultContract,
            batchSwap.kind,
            batchSwap.swaps,
            batchSwap.assets
        );
    }

    /**
     * Uses SOR to create and query a batchSwap.
     * @param queryWithSor - Swap information used for querying using SOR.
     * @param queryWithSor.tokensIn - Array of addresses of assets in.
     * @param queryWithSor.tokensOut - Array of addresses of assets out.
     * @param queryWithSor.swapType - Type of Swap, ExactIn/Out.
     * @param queryWithSor.amounts - Array of amounts used in swap.
     * @param queryWithSor.fetchPools - If true SOR will fetch updated pool info from Subgraph.
     * @returns Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
     */
    async queryBatchSwapWithSor(queryWithSor: QueryWithSor): Promise<{ returnAmounts: BigNumberish[]; swaps: BatchSwapStep[]; assets: string[] }> {

        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwapWithSor(
            this.sor,
            vaultContract,
            queryWithSor.tokensIn,
            queryWithSor.tokensOut,
            queryWithSor.swapType,
            queryWithSor.amounts,
            queryWithSor.fetchPools
        );
    }
}