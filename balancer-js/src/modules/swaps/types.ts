import { SwapInfo } from '@balancer-labs/sor';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Vault } from '@/contracts/Vault';

export interface TokenAmounts {
  [token: string]: string;
}

export interface SwapsOptions {
  maxPools?: number;
  gasPrice?: string;
  deadline?: string;
  maxSlippage?: number;
}

export enum SwapType {
  SwapExactIn,
  SwapExactOut,
}

export type FundManagement = {
  sender: string;
  recipient: string;
  fromInternalBalance: boolean;
  toInternalBalance: boolean;
};

export type SingleSwap = {
  poolId: string;
  kind: SwapType;
  assetIn: string;
  assetOut: string;
  amount: BigNumberish;
  userData: string;
};

export type Swap = {
  request: SingleSwap;
  funds: FundManagement;
  limit: BigNumberish;
  deadline: BigNumberish;
  value?: BigNumberish;
  outputReference?: BigNumberish;
};

export type BatchSwapStep = {
  poolId: string;
  assetInIndex: number;
  assetOutIndex: number;
  amount: string;
  userData: string;
};

export type BatchSwap = {
  kind: SwapType;
  swaps: BatchSwapStep[];
  assets: string[];
  funds: FundManagement;
  limits: BigNumberish[];
  deadline: BigNumberish;
  value?: BigNumberish;
  outputReferences?: { index: BigNumberish; key: BigNumberish }[];
};

export interface SwapInput {
  tokenIn: string;
  tokenOut: string;
  swapType: SwapType;
  amount: string;
}

export interface QuerySimpleFlashSwapParameters {
  poolIds: string[];
  assets: BatchSwap['assets'];
  flashLoanAmount: string;
  vaultContract: Vault;
}

export interface SimpleFlashSwapParameters {
  poolIds: string[];
  assets: BatchSwap['assets'];
  flashLoanAmount: string;
  walletAddress: string;
}

export interface QuerySimpleFlashSwapResponse {
  profits: Record<string, string>;
  isProfitable: boolean;
}

export interface FindRouteParameters {
  tokenIn: string;
  tokenOut: string;
  amount: BigNumber;
  gasPrice: BigNumber;
  maxPools?: number;
}

export interface BuildTransactionParameters {
  userAddress: string;
  recipient?: string;
  swapInfo: SwapInfo;
  kind: SwapType;
  deadline: string;
  maxSlippage: number;
}

export interface SwapTransactionRequest {
  to: string;
  data: string;
  value?: BigNumber;
}

export interface SwapAttributes {
  to: string;
  functionName: string;
  attributes: Swap | BatchSwap;
  data: string;
  value?: BigNumber;
}
