import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { JoinPool } from '@/modules/pools/pool-types/concerns/types';

export type CreatePoolParameters = {
  name: string;
  symbol: string;
  tokenAddresses: string[];
  swapFeeEvm: string;
  owner: string;
};

export interface ComposableStableCreatePoolParameters
  extends CreatePoolParameters {
  amplificationParameter: string;
  rateProviders: string[];
  tokenRateCacheDurations: string[];
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

export type JoinPoolDecodedAttributes = {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequestDecodedAttributes;
};

export type JoinPoolRequestDecodedAttributes = {
  assets: string[];
  maxAmountsIn: string[];
  userData: string;
  fromInternalBalance: boolean;
};
