import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { JoinPool } from '@/modules/pools/pool-types/concerns/types';

export type Address = string;

export type CreatePoolParameters = {
  factoryAddress: string;
  name: string;
  symbol: string;
  tokenAddresses: string[];
  swapFee: string | number;
  owner: Address;
};

export interface ComposableStableCreatePoolParameters
  extends CreatePoolParameters {
  amplificationParameter: number | string;
  rateProviders: string[];
  tokenRateCacheDurations: number[] | string[];
  exemptFromYieldProtocolFeeFlags: boolean[];
}
export interface WeightedCreatePoolParameters extends CreatePoolParameters {
  weights: BigNumberish[];
}
export interface InitJoinPoolParameters {
  joiner: string;
  poolId: string;
  poolAddress: string;
  tokensIn: string[];
  amountsIn: string[];
}

export interface InitJoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
}
