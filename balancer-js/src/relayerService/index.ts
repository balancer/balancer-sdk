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
    ExitPoolData,
} from './types';
import { TransactionData, ExitPoolRequest } from '../types';
import {
    SwapType,
    FundManagement,
    BatchSwapStep,
    FetchPoolsInput,
} from '../swapsService/types';

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

    static constructExitCall(params: ExitPoolData): string {
        const {
            assets,
            minAmountsOut,
            userData,
            toInternalBalance,
            poolId,
            poolKind,
            sender,
            recipient,
            outputReferences,
        } = params;

        const exitPoolRequest: ExitPoolRequest = {
            assets,
            minAmountsOut,
            userData,
            toInternalBalance,
        };

        const exitPoolInput: EncodeExitPoolInput = {
            poolId,
            poolKind,
            sender,
            recipient,
            outputReferences,
            exitPoolRequest,
        };

        const exitEncoded = RelayerService.encodeExitPool(exitPoolInput);
        return exitEncoded;
    }

    /**
     * exitPoolAndBatchSwap Chains poolExit with batchSwap to final tokens.
     * @param {ExitAndBatchSwapInput} params
     * @param {string} exiter - Address used to exit pool.
     * @param {string} swapRecipient - Address that receives final tokens.
     * @param {string} poolId - Id of pool being exited.
     * @param {string[]} exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
     * @param {string} userData - Encoded exitPool data.
     * @param {string[]} expectedAmountsOut - Expected amounts of exitTokens to receive when exiting pool.
     * @param {string[]} finalTokensOut - Array containing the addresses of the final tokens out.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
     */
    async exitPoolAndBatchSwap(
        params: ExitAndBatchSwapInput
    ): Promise<TransactionData> {
        const slippageAmountNegative = WeiPerEther.sub(
            BigNumber.from(params.slippage)
        );
        // Set min amounts out of exit pool based on slippage
        const minAmountsOut = params.expectedAmountsOut.map((amt) =>
            BigNumber.from(amt)
                .mul(slippageAmountNegative)
                .div(WeiPerEther)
                .toString()
        );

        // Output of exit is used as input to swaps
        const outputReferences: OutputReference[] = [];
        params.exitTokens.forEach((asset, i) => {
            const key = RelayerService.toChainedReference(i);
            outputReferences.push({
                index: i,
                key: key,
            });
        });

        const exitCall = RelayerService.constructExitCall({
            assets: params.exitTokens,
            minAmountsOut,
            userData: params.userData,
            toInternalBalance: true, // Creates exitPool request with exit to internal balance to save gas for following swaps
            poolId: params.poolId,
            poolKind: 0, // This will always be 0 to match supported Relayer types
            sender: params.exiter,
            recipient: params.exiter,
            outputReferences: outputReferences,
            exitPoolRequest: {} as ExitPoolRequest,
        });

        // Use swapsService to get swap info for exitTokens>finalTokens
        // This will give batchSwap swap paths
        // Amounts out will be worst case amounts
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn: params.exitTokens,
            tokensOut: params.finalTokensOut,
            swapType: SwapType.SwapExactIn,
            amounts: minAmountsOut, // Use minAmountsOut as input to swap to account for slippage
            fetchPools: params.fetchPools,
        });

        // Update swap amounts with ref outputs from exitPool
        queryResult.swaps.forEach((swap) => {
            const token = queryResult.assets[swap.assetInIndex];
            const index = params.exitTokens.indexOf(token);
            if (index !== -1)
                swap.amount = outputReferences[index].key.toString();
        });

        // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug

        // Replace tokenIn delta for swaps with amount + slippage.
        // This gives tolerance for limit incase amount out of exitPool is larger min,
        const slippageAmountPositive = WeiPerEther.add(params.slippage);
        params.exitTokens.forEach((exitToken, i) => {
            const index = queryResult.assets
                .map((elem) => elem.toLowerCase())
                .indexOf(exitToken.toLowerCase());
            if (index !== -1) {
                queryResult.deltas[index] = BigNumber.from(
                    params.expectedAmountsOut[i]
                )
                    .mul(slippageAmountPositive)
                    .div(WeiPerEther)
                    .toString();
            }
        });

        // Creates limit array.
        // Slippage set to 0. Already accounted for as swap used amounts out of pool with worst case slippage.
        const limits = SwapsService.getLimitsForSlippage(
            params.exitTokens, // tokensIn
            params.finalTokensOut, // tokensOut
            SwapType.SwapExactIn,
            queryResult.deltas, // tempDeltas // Useful for debug
            queryResult.assets,
            '0'
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
        const calls = [exitCall, encodedBatchSwap];
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
            fetchOnChain: false,
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
            fetchOnChain: false,
        }
    ): Promise<TransactionData> {
        const amountsWrapped = amountsUnwrapped.map((amountInwrapped, i) =>
            BigNumber.from(amountInwrapped)
                .mul(WeiPerEther)
                .div(rates[i])
                .toString()
        );

        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactOut,
            amounts: amountsWrapped,
            fetchPools,
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
