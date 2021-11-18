import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { BigNumberish } from '@ethersproject/bignumber';
import { SOR } from 'sor-linear';

import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapType, BatchSwapStep } from './types';
import { queryBatchSwap, queryBatchSwapTokensIn, queryBatchSwapTokensOut } from './queryBatchSwap';
import { balancerVault } from '../constants/contracts';

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
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwap(
            vaultContract,
            swapType,
            swaps,
            assets
        );
    }

    /**
     * Uses SOR to create and query a batchSwap for multiple tokens in > single tokenOut.
     * @param tokensIn - array of addresses of assets in.
     * @param amountsIn - array of amounts for tokens in.
     * @param tokenOut - asset out.
     * @param fetchPools - if true SOR will fetch updated pool info from Subgraph.
     * @returns Returns amount of tokenOut along with swap and asset info that can be submitted to a batchSwap call.
     */
    async queryBatchSwapTokensIn(
        tokensIn: string[],
        amountsIn: BigNumberish[],
        tokenOut: string,
        fetchPools: boolean = true
    ): Promise<{ amountTokenOut: BigNumberish; swaps: BatchSwapStep[]; assets: string[] }> {

        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwapTokensIn(
            this.sor,
            vaultContract,
            tokensIn,
            amountsIn,
            tokenOut,
            fetchPools
        );
    }

    /**
     * Uses SOR to create and query a batchSwap for multiple tokens in > single tokenOut.
     * @param tokenIn - addresses of asset in.
     * @param amountsIn - amount of tokenIn for corresponding tokenOut.
     * @param tokensOut - array of addresses of assets out.
     * @param fetchPools - if true SOR will fetch updated pool info from Subgraph.
     * @returns Returns array of amounts for each tokenOut along with swap and asset info that can be submitted to a batchSwap call.
     */
    async queryBatchSwapTokensOut(
        tokenIn: string,
        amountsIn: BigNumberish[],
        tokensOut: string[],
        fetchPools: boolean = true
    ): Promise<{ amountTokensOut: string[]; swaps: BatchSwapStep[]; assets: string[] }> {

        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const provider = new JsonRpcProvider(this.rpcUrl);
        const vaultContract = new Contract(balancerVault, vaultAbi, provider);

        return await queryBatchSwapTokensOut(
            this.sor,
            vaultContract,
            tokenIn,
            amountsIn,
            tokensOut,
            fetchPools
        );
    }
}