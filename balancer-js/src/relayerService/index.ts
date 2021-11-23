import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';

import { SwapsService } from '../swapsService';
import { EncodeBatchSwapInput, EncodeUnwrapAaveStaticTokenInput } from './types';

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
}