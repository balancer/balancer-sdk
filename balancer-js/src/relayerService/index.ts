import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';

import { SwapsService } from '../swapsService';
import {
    EncodeBatchSwapInput,
    EncodeUnwrapAaveStaticTokenInput,
    OutputReference,
    EncodeExitPoolInput,
} from './types';
import { TransactionData } from '../types';
import { SwapType, FundManagement, BatchSwapStep } from '../swapsService/types';

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
     * swapUnwrapAaveStaticExactIn Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable.
     * @param exitPoolInput - TO DO.
     * @param finalTokensOut - array contains the addresses of the final tokens out.
     * @param funds - Funding info for swap. Note - fromInternalBalance should be true as exitPool is moved to internal balance before swap.
     * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
     */
    async exitPoolAndBatchSwap(
        exitPoolInput: EncodeExitPoolInput,
        finalTokensOut: string[],
        funds: FundManagement,
        slippage: BigNumberish
    ): Promise<TransactionData> {
        // Output of exit is used as input to swaps
        const outputReferences: OutputReference[] = [];
        exitPoolInput.exitPoolRequest.assets.forEach((asset, i) => {
            const key = RelayerService.toChainedReference(i);
            outputReferences.push({
                index: i,
                key: key,
            });
        });

        exitPoolInput.outputReferences = outputReferences;

        // Useful for debugging issues with incorrect amounts/limits
        // const tempAmts = exitPoolInput.exitPoolRequest.minAmountsOut;
        // exitPoolInput.exitPoolRequest.minAmountsOut =
        //     exitPoolInput.exitPoolRequest.minAmountsOut.map(() => '0');

        const exitEncoded = RelayerService.encodeExitPool(exitPoolInput);

        // Need to create swaps: queryBatchSwapWithSor
        // Swaps with outputs of exit
        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn: exitPoolInput.exitPoolRequest.assets,
            tokensOut: finalTokensOut,
            swapType: SwapType.SwapExactIn,
            amounts: exitPoolInput.exitPoolRequest.minAmountsOut, // tempAmts
            fetchPools: true,
        });

        // Update swap amounts with ref outputs from exitPool
        queryResult.swaps.forEach((swap) => {
            const token = queryResult.assets[swap.assetInIndex];
            const index = exitPoolInput.exitPoolRequest.assets.indexOf(token);
            if (index !== -1) swap.amount = outputReferences[index].key; // RelayerService.toChainedReference(index);
        });

        // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug

        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = SwapsService.getLimitsForSlippage(
            exitPoolInput.exitPoolRequest.assets, // tokensIn
            finalTokensOut, // tokensOut
            SwapType.SwapExactIn,
            queryResult.deltas, // tempDeltas // Useful for debug
            queryResult.assets,
            slippage
        );

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
     * @param tokensIn - array to token addresses for swapping as tokens in.
     * @param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param amountsIn - amounts to be swapped for each token in.
     * @param rates - The rate used to convert wrappedToken to underlying.
     * @param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
     */
    async swapUnwrapAaveStaticExactIn(
        tokensIn: string[],
        aaveStaticTokens: string[],
        amountsIn: BigNumberish[],
        rates: BigNumberish[],
        funds: FundManagement,
        slippage: BigNumberish
    ): Promise<TransactionData> {
        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactIn,
            amounts: amountsIn,
            fetchPools: true,
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
     * @param tokensIn - array to token addresses for swapping as tokens in.
     * @param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param amountsUnwrapped - amounts of unwrapped tokens out.
     * @param rates - The rate used to convert wrappedToken to underlying.
     * @param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns Transaction data with calldata. Outputs.amountsIn has the amounts of tokensIn.
     */
    async swapUnwrapAaveStaticExactOut(
        tokensIn: string[],
        aaveStaticTokens: string[],
        amountsUnwrapped: BigNumberish[],
        rates: BigNumberish[],
        funds: FundManagement,
        slippage: BigNumberish
    ): Promise<TransactionData> {
        const amountsWrapped = amountsUnwrapped.map((amountWrapped, i) =>
            BigNumber.from(amountWrapped).mul(WeiPerEther).div(rates[i])
        );

        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactOut,
            amounts: amountsWrapped,
            fetchPools: true,
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
