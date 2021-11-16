export * from './queryBatchSwap';

import { BigNumberish } from '@ethersproject/bignumber';
import { Network } from '../constants/network';
import { SwapType, BatchSwapStep } from './types';
import { queryBatchSwap } from './queryBatchSwap';


export class swap {
    network: Network;
    rpcUrl: string;

    constructor(network: Network, rpcUrl: string) {
        this.network = network;
        this.rpcUrl = rpcUrl;
    }

    async queryBatchSwap(
        swapType: SwapType,
        swaps: BatchSwapStep[],
        assets: string[]): Promise<BigNumberish[]> {
            return await queryBatchSwap(
                swapType, 
                swaps, 
                assets, 
                {  
                    network: this.network,
                    rpcUrl: this.rpcUrl
                }
            );
    }

}