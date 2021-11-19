import { BigNumberish } from '@ethersproject/bignumber';
import { SwapType } from './types';

export interface SwapsServiceInterface {
    querySwap(input: QuerySwapInput): Promise<BatchSwapRoute>;
    queryBatchSwap(input: QueryBatchSwapInput): Promise<BatchSwap>;

    executeSwap(input: BatchSwapRoute): Promise<void>;
    executeBatchSwap(input: BatchSwap): Promise<void>;
}

interface QuerySwapInput {
    tokenIn: string;
    tokenOut: string;
    swapType: SwapType;
    amount: BigNumberish;
    fetchPools?: boolean;
}

interface QueryBatchSwapInput {
    swaps: (QueryBatchSwapInputSwap | QueryBatchSwapInputSwapWithRoutes)[];
    fetchPools?: boolean;
}

//the simple case, here we let the SOR define the path
interface QueryBatchSwapInputSwap {
    swapType: SwapType;
    tokenIn: string;
    tokenOut: string;
    amount: BigNumberish;
}

//the advanced case, here we let the user define the path
interface QueryBatchSwapInputSwapWithRoutes {
    swapType: SwapType;
    tokenIn: string;
    tokenOut: string;
    routes: QueryBatchSwapInputRoute[];
}

interface QueryBatchSwapInputRoute {
    tokenIn: string;
    tokenOut: string;
    amount: BigNumberish;
    //steps in this route, must be properly ordered
    steps: QueryBatchSwapInputRouteStep[];
}

interface QueryBatchSwapInputRouteStep {
    tokenIn: string;
    tokenOut: string;
    poolId: string;
}

export interface BatchSwap {
    routes: BatchSwapRoute[];
}

export interface BatchSwapRoute {
    tokenIn: string;
    tokenInAmount: BigNumberish;
    tokenOut: string;
    tokenOutAmount: BigNumberish;
    //steps in this route, properly ordered
    steps: BatchSwapRouteStep[];
}

export interface BatchSwapRouteStep {
    tokenIn: string;
    tokenInAmount: BigNumberish;
    tokenOut: string;
    tokenOutAmount: BigNumberish;
    poolId: string;
    userData: string;
}
