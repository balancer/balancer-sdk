import { BigNumber } from '@ethersproject/bignumber';
import { JoinPool } from '@/modules/pools/pool-types/concerns/types';

export type Address = string;

export type CreatePoolParameters = {
  contractAddress: string;
  name: string;
  symbol: string;
  tokenAddresses: string[];
  amplificationParameter: number | string;
  rateProviders: string[];
  tokenRateCacheDurations: number[] | string[];
  exemptFromYieldProtocolFeeFlags: boolean[];
  swapFee: string | number;
  owner: Address;
};

export interface InitJoinPoolParameters {
  joiner: string;
  poolId: string;
  poolAddress: string;
  tokensIn: string[];
  amountsIn: string[];
  wrappedNativeAsset: string;
}

export interface InitJoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
}
