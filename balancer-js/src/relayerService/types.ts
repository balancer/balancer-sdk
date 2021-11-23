import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

import { SwapType, BatchSwapStep, FundManagement } from '../swapsService/types';


export type OutputReference = {
    index: number;
    key: BigNumber;
}

export interface EncodeBatchSwapInput {
    swapType: SwapType;
    swaps: BatchSwapStep[];
    assets: string[];
    funds: FundManagement;
    limits: string[];
    deadline: BigNumberish;
    value: BigNumberish;
    outputReferences: OutputReference[];
}


export interface EncodeUnwrapAaveStaticTokenInput {
    staticToken: string,
    sender: string,
    recipient: string,
    amount: BigNumberish,
    toUnderlying: boolean,
    outputReferences: BigNumberish
}