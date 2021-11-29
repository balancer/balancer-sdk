import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';

import { SwapsService } from '../swapsService';
import { EncodeBatchSwapInput, EncodeUnwrapAaveStaticTokenInput, OutputReference } from './types';
import { TransactionData } from '../types';
import { SwapType, FundManagement } from '../swapsService/types';

import relayerLibraryAbi from '../abi/VaultActions.json';
import aaveWrappingAbi from '../abi/AaveWrapping.json';

export class RelayerService {

    swapsService: SwapsService;
    rpcUrl: string;
    static CHAINED_REFERENCE_PREFIX = 'ba10';

    constructor(swapsService: SwapsService, rpcUrl: string) {
        this.swapsService = swapsService;
        this.rpcUrl = rpcUrl
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

    static encodeUnwrapAaveStaticToken(params: EncodeUnwrapAaveStaticTokenInput): string {
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
        const paddedPrefix = `0x${RelayerService.CHAINED_REFERENCE_PREFIX}${'0'.repeat(64 - RelayerService.CHAINED_REFERENCE_PREFIX.length)}`;
        return BigNumber.from(paddedPrefix).add(key);
    }

    /**
     * swapUnwrapExactIn returns call data for Relayer Multicall where batchSwaps followed by unwrap of Aave static tokens.
     * @param tokensIn - array to token addresses for swapping as tokens in.
     * @param amountsIn - amounts to be swapped for each token in.
     * @param wrappedTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param rates - The rate used to convert wrappedToken to underlying.
     * @param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
     */
    async swapUnwrapExactIn(
        tokensIn: string[],
        amountsIn: BigNumberish[],
        wrappedTokens: string[],
        rates: BigNumberish[],
        funds: FundManagement,
        slippage: BigNumberish
    ): Promise<TransactionData> {

        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swapsService.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: wrappedTokens,
            swapType: SwapType.SwapExactIn,
            amounts: amountsIn,
            fetchPools: true
        });

        const amountsUnwrapped = queryResult.returnAmounts.map((amountWrapped, i) => BigNumber.from(amountWrapped).abs().mul(rates[i]).div(WeiPerEther));

        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = SwapsService.getLimitsForSlippage(
            tokensIn,  // tokensIn
            wrappedTokens, // tokensOut
            SwapType.SwapExactIn,
            amountsIn,  // tokensIn amounts
            queryResult.returnAmounts, // tokensOut amounts
            queryResult.assets,
            slippage
        );

        // Output of swaps (wrappedTokens) is used as input to unwrap
        // Need indices of output tokens and outputReferences need to be made with those as key
        const outputReferences: OutputReference[] = [];
        const unwrapCalls: string[] = [];
        wrappedTokens.forEach((wrappedToken, i) => {
            const index = queryResult.assets.findIndex((token) => token.toLowerCase() === wrappedToken.toLowerCase());
            // There may be cases where swap isn't possible for wrappedToken
            if (index === -1)
                return;

            const key = RelayerService.toChainedReference(i);

            outputReferences.push({
                index: index,
                key: key
            })

            // console.log(`Unwrapping ${wrappedToken} with amt: ${key.toHexString()}`);

            const encodedUnwrap = RelayerService.encodeUnwrapAaveStaticToken({
                staticToken: wrappedToken,
                sender: funds.recipient, // This should be relayer
                recipient: funds.sender, // This will be caller
                amount: key,    // Use output of swap as input for unwrap
                toUnderlying: true,
                outputReferences: 0
            });

            unwrapCalls.push(encodedUnwrap);
        });

        const encodedBatchSwap = RelayerService.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps: queryResult.swaps,
            assets: queryResult.assets,
            funds: funds,   // Note - this should have Relayer as recipient
            limits: limits.map(l => l.toString()),
            deadline: MaxUint256,
            value: '0',
            outputReferences: outputReferences
        });

        return {
            function: 'multicall',
            params: [encodedBatchSwap, ...unwrapCalls],
            outputs: {
                amountsOut: amountsUnwrapped
            }
        };
    }
}