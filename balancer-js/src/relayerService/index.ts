import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';

import { SwapsService } from '../swapsService';
import {
    EncodeBatchSwapInput,
    EncodeUnwrapAaveStaticTokenInput,
    OutputReference,
    EncodeExitPoolInput,
    ExitAndBatchSwapInput,
} from './types';
import { TransactionData, ExitPoolRequest } from '../types';
import { SwapType, FundManagement, BatchSwapStep, FetchPoolsInput } from '../swapsService/types';

import relayerLibraryAbi from '../abi/VaultActions.json';
import aaveWrappingAbi from '../abi/AaveWrapping.json';

export * from './types';

export class RelayerService {
    swapsService: SwapsService;
    rpcUrl: string;
    static CHAINED_REFERENCE_PREFIX = 'ba10';

    constructor(swapsService: SwapsService, rpcUrl: string) {
        this.swapsService = swapsService;
        this.rpcUrl = rpcUrl;
    }

    static encodeBatchSwap(params: EncodeBatchSwapInput): string {
        const relayerLibrary = new Interface(relayerLibraryAbi);

        return relayerLibrary.encodeFunctionData('batchSwap', [
            params.swapType,
            params.swaps,
            params.assets,
            params.funds,
            params.limits,
            params.deadline,
            params.value,
            params.outputReferences,
        ]);
    }

    static encodeExitPool(params: EncodeExitPoolInput): string {
        const relayerLibrary = new Interface(relayerLibraryAbi);

        return relayerLibrary.encodeFunctionData('exitPool', [
            params.poolId,
            params.poolKind,
            params.sender,
            params.recipient,
            params.exitPoolRequest,
            params.outputReferences,
        ]);
    }

    static encodeUnwrapAaveStaticToken(
        params: EncodeUnwrapAaveStaticTokenInput
    ): string {
        const aaveWrappingLibrary = new Interface(aaveWrappingAbi);

        return aaveWrappingLibrary.encodeFunctionData('unwrapAaveStaticToken', [
            params.staticToken,
            params.sender,
            params.recipient,
            params.amount,
            params.toUnderlying,
            params.outputReferences,
        ]);
    }

    static toChainedReference(key: BigNumberish): BigNumber {
        // The full padded prefix is 66 characters long, with 64 hex characters and the 0x prefix.
        const paddedPrefix = `0x${
            RelayerService.CHAINED_REFERENCE_PREFIX
        }${'0'.repeat(64 - RelayerService.CHAINED_REFERENCE_PREFIX.length)}`;
        return BigNumber.from(paddedPrefix).add(key);
    }

    /**
     * exitPoolAndBatchSwap Chains poolExit with batchSwap to final tokens.
     * @param {ExitAndBatchSwapInput} params
     * @param {string} exiter - Address used to exit pool.
     * @param {string} swapRecipient - Address that receives final tokens.
     * @param {string} poolId - Id of pool being exited.
     * @param {string[]} exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
     * @param {string} userData - Encoded exitPool data.
     * @param {string[]} minExitAmountsOut - Minimum amounts of exitTokens to receive when exiting pool.
     * @param {string[]} finalTokensOut - Array containing the addresses of the final tokens out.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
     */
    async exitPoolAndBatchSwap(
        params: ExitAndBatchSwapInput
    ): Promise<TransactionData> {
        // Creates exitPool request with exit to internal balance to save gas for following swaps
        const exitPoolRequest: ExitPoolRequest = {
            assets: params.exitTokens,
            minAmountsOut: params.minExitAmountsOut,
            userData: params.userData,
            toInternalBalance: true,
        };

        // Output of exit is used as input to swaps
        const outputReferences: OutputReference[] = [];
        exitPoolRequest.assets.forEach((asset, i) => {
            const key = RelayerService.toChainedReference(i);
            outputReferences.push({
                index: i,
                key: key,
            });
        });

        const exitPoolInput: EncodeExitPoolInput = {
            poolId: params.poolId,
            poolKind: 0, // This will always be 0 to match supported Relayer types
            sender: params.exiter,
            recipient: params.exiter,
            outputReferences: outputReferences,
            exitPoolRequest,
        };

        // Useful for debugging issues with incorrect amounts/limits
        // const tempAmts = exitPoolInput.exitPoolRequest.minAmountsOut;
        // exitPoolInput.exitPoolRequest.minAmountsOut =
        //     exitPoolInput.exitPoolRequest.minAmountsOut.map(() => '0');

        const exitEncoded = RelayerService.encodeExitPool(exitPoolInput);

        // Use swapsService to get swap info for exitTokens>finalTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn: exitPoolInput.exitPoolRequest.assets,
            tokensOut: params.finalTokensOut,
            swapType: SwapType.SwapExactIn,
            amounts: exitPoolInput.exitPoolRequest.minAmountsOut, // tempAmts
            fetchPools: params.fetchPools,
        });

        // Update swap amounts with ref outputs from exitPool
        queryResult.swaps.forEach((swap) => {
            const token = queryResult.assets[swap.assetInIndex];
            const index = exitPoolInput.exitPoolRequest.assets.indexOf(token);
            if (index !== -1) swap.amount = outputReferences[index].key.toString(); // RelayerService.toChainedReference(index);
        });

        // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug

        // Gets limits array based on input slippage
        // Can cause issues for exitExactBPTInForTokensOut if minAmountsOut is innacurate as this is use to get swap amounts
        const limits = SwapsService.getLimitsForSlippage(
            exitPoolInput.exitPoolRequest.assets, // tokensIn
            params.finalTokensOut, // tokensOut
            SwapType.SwapExactIn,
            queryResult.deltas, // tempDeltas // Useful for debug
            queryResult.assets,
            params.slippage
        );

        // Creates fund management using internal balance as source of tokens
        const funds: FundManagement = {
            sender: params.exiter,
            recipient: params.swapRecipient,
            fromInternalBalance: true,
            toInternalBalance: false,
        };

        const encodedBatchSwap = RelayerService.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps: queryResult.swaps,
            assets: queryResult.assets,
            funds: funds,
            limits: limits.map((l) => l.toString()),
            deadline: MaxUint256,
            value: '0',
            outputReferences: [],
        });

        // Return amounts from swap
        const calls = [exitEncoded, encodedBatchSwap];
        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsOut: queryResult.returnAmounts,
            },
        };
    }

    /**
     * swapUnwrapAaveStaticExactIn Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable.
     * @param {string[]} tokensIn - array to token addresses for swapping as tokens in.
     * @param {string[]} aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param {string[]} amountsIn - amounts to be swapped for each token in.
     * @param {string[]} rates - The rate used to convert wrappedToken to underlying.
     * @param {FundManagement} funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
     */
    async swapUnwrapAaveStaticExactIn(
        tokensIn: string[],
        aaveStaticTokens: string[],
        amountsIn: string[],
        rates: string[],
        funds: FundManagement,
        slippage: string,
        fetchPools: FetchPoolsInput = {
            fetchPools: true,
            fetchOnChain: false
        }
    ): Promise<TransactionData> {
        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactIn,
            amounts: amountsIn,
            fetchPools,
        });

        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = SwapsService.getLimitsForSlippage(
            tokensIn, // tokensIn
            aaveStaticTokens, // tokensOut
            SwapType.SwapExactIn,
            queryResult.deltas,
            queryResult.assets,
            slippage
        );

        const calls = this.encodeSwapUnwrap(
            aaveStaticTokens,
            SwapType.SwapExactIn,
            queryResult.swaps,
            queryResult.assets,
            funds,
            limits
        );

        const amountsUnwrapped = queryResult.returnAmounts.map(
            (amountWrapped, i) =>
                BigNumber.from(amountWrapped)
                    .abs()
                    .mul(rates[i])
                    .div(WeiPerEther)
        );

        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsOut: amountsUnwrapped,
            },
        };
    }

    /**
     * swapUnwrapAaveStaticExactOut Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable.
     * @param {string[]} tokensIn - array to token addresses for swapping as tokens in.
     * @param {string[]} aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param {string[]} amountsUnwrapped - amounts of unwrapped tokens out.
     * @param {string[]} rates - The rate used to convert wrappedToken to underlying.
     * @param {FundManagement} funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsIn has the amounts of tokensIn.
     */
    async swapUnwrapAaveStaticExactOut(
        tokensIn: string[],
        aaveStaticTokens: string[],
        amountsUnwrapped: string[],
        rates: string[],
        funds: FundManagement,
        slippage: string,
        fetchPools: FetchPoolsInput = {
            fetchPools: true,
            fetchOnChain: false
        }
    ): Promise<TransactionData> {
        const amountsWrapped = amountsUnwrapped.map((amountInwrapped, i) =>
            BigNumber.from(amountInwrapped).mul(WeiPerEther).div(rates[i]).toString()
        );

        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactOut,
            amounts: amountsWrapped,
            fetchPools
        });

        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = SwapsService.getLimitsForSlippage(
            tokensIn, // tokensIn
            aaveStaticTokens, // tokensOut
            SwapType.SwapExactOut,
            queryResult.deltas,
            queryResult.assets,
            slippage
        );

        const calls = this.encodeSwapUnwrap(
            aaveStaticTokens,
            SwapType.SwapExactOut,
            queryResult.swaps,
            queryResult.assets,
            funds,
            limits
        );

        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsIn: queryResult.returnAmounts.toString(),
            },
        };
    }

    /**
     * Creates encoded multicalls using swap outputs as input amounts for token unwrap.
     * @param wrappedTokens
     * @param swapType
     * @param swaps
     * @param assets
     * @param funds
     * @param limits
     * @returns
     */
    encodeSwapUnwrap(
        wrappedTokens: string[],
        swapType: SwapType,
        swaps: BatchSwapStep[],
        assets: string[],
        funds: FundManagement,
        limits: BigNumberish[]
    ): string[] {
        // Output of swaps (wrappedTokens) is used as input to unwrap
        // Need indices of output tokens and outputReferences need to be made with those as key
        const outputReferences: OutputReference[] = [];
        const unwrapCalls: string[] = [];
        wrappedTokens.forEach((wrappedToken, i) => {
            // Find index of wrappedToken in asset array. This is used as ref in Relayer.
            const index = assets.findIndex(
                (token) => token.toLowerCase() === wrappedToken.toLowerCase()
            );
            // There may be cases where swap isn't possible for wrappedToken
            if (index === -1) return;

            const key = RelayerService.toChainedReference(i);

            outputReferences.push({
                index: index,
                key: key,
            });

            // console.log(`Unwrapping ${wrappedToken} with amt: ${key.toHexString()}`);

            const encodedUnwrap = RelayerService.encodeUnwrapAaveStaticToken({
                staticToken: wrappedToken,
                sender: funds.recipient, // This should be relayer
                recipient: funds.sender, // This will be caller
                amount: key, // Use output of swap as input for unwrap
                toUnderlying: true,
                outputReferences: 0,
            });

            unwrapCalls.push(encodedUnwrap);
        });

        const encodedBatchSwap = RelayerService.encodeBatchSwap({
            swapType: swapType,
            swaps: swaps,
            assets: assets,
            funds: funds, // Note - this should have Relayer as recipient
            limits: limits.map((l) => l.toString()),
            deadline: MaxUint256,
            value: '0',
            outputReferences: outputReferences,
        });

        return [encodedBatchSwap, ...unwrapCalls];
    }
}
