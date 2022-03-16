import { Contract } from '@ethersproject/contracts';
import { SOR, SubgraphPoolBase } from '@balancer-labs/sor';
import {
    BatchSwap,
    QuerySimpleFlashSwapParameters,
    QuerySimpleFlashSwapResponse,
    QueryWithSorInput,
    QueryWithSorOutput,
    SimpleFlashSwapParameters,
    SwapType,
} from './types';
import { queryBatchSwap, queryBatchSwapWithSor } from './queryBatchSwap';
import { balancerVault } from '@/lib/constants/config';
import { getLimitsForSlippage } from './helpers';
import vaultAbi from '@/lib/abi/Vault.json';
import { BalancerSdkConfig } from '@/types';
import { Sor } from '@/modules/sor/sor.module';
import {
    convertSimpleFlashSwapToBatchSwapParameters,
    querySimpleFlashSwap,
} from './flashSwap';
import { Interface } from '@ethersproject/abi';

export class Swaps {
    private readonly sor: SOR;

    constructor(sorOrConfig: SOR | BalancerSdkConfig) {
        if (sorOrConfig instanceof SOR) {
            this.sor = sorOrConfig;
        } else {
            this.sor = new Sor(sorOrConfig);
        }
    }

    static getLimitsForSlippage(
        tokensIn: string[],
        tokensOut: string[],
        swapType: SwapType,
        deltas: string[],
        assets: string[],
        slippage: string
    ): string[] {
        // TO DO - Check best way to do this?
        const limits = getLimitsForSlippage(
            tokensIn,
            tokensOut,
            swapType,
            deltas,
            assets,
            slippage
        );

        return limits.map((l) => l.toString());
    }

    /**
     * Encode batchSwap in an ABI byte string
     *
     * [See method for a batchSwap](https://dev.balancer.fi/references/contracts/apis/the-vault#batch-swaps).
     *
     * _NB: This method doesn't execute a batchSwap -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
     * containing the data of the function call on a contract, which can then be sent to the network to be executed.
     * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
     *
     * @param {BatchSwap}           batchSwap - BatchSwap information used for query.
     * @param {SwapType}            batchSwap.kind - either exactIn or exactOut
     * @param {BatchSwapSteps[]}    batchSwap.swaps - sequence of swaps
     * @param {string[]}            batchSwap.assets - array contains the addresses of all assets involved in the swaps
     * @param {FundManagement}      batchSwap.funds - object containing information about where funds should be taken/sent
     * @param {number[]}            batchSwap.limits - limits for each token involved in the swap, where either the maximum number of tokens to send (by passing a positive value) or the minimum amount of tokens to receive (by passing a negative value) is specified
     * @param {string}              batchSwap.deadline -  time (in Unix timestamp) after which it will no longer attempt to make a trade
     * @returns {string}            encodedBatchSwapData - Returns an ABI byte string containing the data of the function call on a contract
     */
    static encodeBatchSwap(batchSwap: BatchSwap): string {
        const vault = new Interface(vaultAbi);

        return vault.encodeFunctionData('batchSwap', [
            batchSwap.kind,
            batchSwap.swaps,
            batchSwap.assets,
            batchSwap.funds,
            batchSwap.limits,
            batchSwap.deadline,
        ]);
    }

    /**
     * Encode simple flash swap into a ABI byte string
     *
     * A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
     * swapping in the first pool and then back in the second pool for a profit. For more
     * complex flash swaps, you will have to use the batch swap method.
     *
     * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
     *
     * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
     * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
     * @param {string[]}                    params.poolIds - array of Balancer pool ids
     * @param {string[]}                    params.assets - array of token addresses
     * @param {string}                      params.walletAddress - array of token addresses
     * @returns {string}                    encodedBatchSwapData - Returns an ABI byte string containing the data of the function call on a contract
     */
    static encodeSimpleFlashSwap(params: SimpleFlashSwapParameters): string {
        return this.encodeBatchSwap(
            convertSimpleFlashSwapToBatchSwapParameters(params)
        );
    }

    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools(): Promise<boolean> {
        return this.sor.fetchPools();
    }

    public getPools(): SubgraphPoolBase[] {
        return this.sor.getPools();
    }

    /**
     * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
     * @param batchSwap - BatchSwap information used for query.
     * @param {SwapType} batchSwap.kind - either exactIn or exactOut.
     * @param {BatchSwapStep[]} batchSwap.swaps - sequence of swaps.
     * @param {string[]} batchSwap.assets - array contains the addresses of all assets involved in the swaps.
     * @returns {Promise<string[]>} Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
     * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
     * the same index in the `assets` array.
     */
    async queryBatchSwap(
        batchSwap: Pick<BatchSwap, 'kind' | 'swaps' | 'assets'>
    ): Promise<string[]> {
        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const vaultContract = new Contract(
            balancerVault,
            vaultAbi,
            this.sor.provider
        );

        return await queryBatchSwap(
            vaultContract,
            batchSwap.kind,
            batchSwap.swaps,
            batchSwap.assets
        );
    }

    /**
     * Uses SOR to create and query a batchSwap.
     * @param {QueryWithSorInput} queryWithSor - Swap information used for querying using SOR.
     * @param {string[]} queryWithSor.tokensIn - Array of addresses of assets in.
     * @param {string[]} queryWithSor.tokensOut - Array of addresses of assets out.
     * @param {SwapType} queryWithSor.swapType - Type of Swap, ExactIn/Out.
     * @param {string[]} queryWithSor.amounts - Array of amounts used in swap.
     * @param {FetchPoolsInput} queryWithSor.fetchPools - Set whether SOR will fetch updated pool info.
     * @returns {Promise<QueryWithSorOutput>} Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
     */
    async queryBatchSwapWithSor(
        queryWithSor: QueryWithSorInput
    ): Promise<QueryWithSorOutput> {
        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const vaultContract = new Contract(
            balancerVault,
            vaultAbi,
            this.sor.provider
        );

        return await queryBatchSwapWithSor(
            this.sor,
            vaultContract,
            queryWithSor
        );
    }

    /**
     * Simple interface to test if a simple flash swap is valid and see potential profits.
     *
     * A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
     * swapping in the first pool and then back in the second pool for a profit. For more
     * complex flash swaps, you will have to use the batch swap method.
     *
     * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
     *
     * _NB: This method doesn't execute a flashSwap
     *
     * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
     * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
     * @param {string[]}                    params.poolIds - array of Balancer pool ids
     * @param {string[]}                    params.assets - array of token addresses
     * @returns {Promise<{profits: Record<string, string>, isProfitable: boolean}>}       Returns an ethersjs transaction response
     */
    async querySimpleFlashSwap(
        params: Omit<QuerySimpleFlashSwapParameters, 'vaultContract'>
    ): Promise<QuerySimpleFlashSwapResponse> {
        // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
        const vaultContract = new Contract(
            balancerVault,
            vaultAbi,
            this.sor.provider
        );

        return await querySimpleFlashSwap({
            ...params,
            vaultContract,
        });
    }
}
