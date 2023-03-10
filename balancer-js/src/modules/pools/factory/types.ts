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

export type LinearCreatePoolParameters = Pick<
  CreatePoolParameters,
  'factoryAddress' | 'name' | 'symbol' | 'swapFee' | 'owner'
> & {
  mainToken: string;
  wrappedToken: string;
  upperTarget: string;
  protocolId: ProtocolId;
};

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

export enum ProtocolId {
  AAVE_V1 = 0,
  AAVE_V2 = 1,
  AAVE_V3 = 2,
  AMPLEFORTH = 3,
  BEEFY = 4,
  EULER = 5,
  GEARBOX = 6,
  IDLE = 7,
  MORPHO = 8,
  RADIANT = 9,
  REAPER = 10,
  SILO = 11,
  STARGATE = 12,
  STURDY = 13,
  TESSERA = 14,
  TETU = 15,
  YEARN = 16,
  MIDAS = 17,
  AGAVE = 18,
}
