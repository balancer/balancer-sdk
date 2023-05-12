import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { JoinPool } from '@/modules/pools/pool-types/concerns/types';
import { BytesLike } from '@ethersproject/bytes';

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

  salt?: BytesLike;
}

export interface WeightedCreatePoolParameters extends CreatePoolParameters {
  rateProviders: string[];
  normalizedWeights: BigNumberish[];
  salt?: BytesLike;
}

export type LinearCreatePoolParameters = Pick<
  CreatePoolParameters,
  'name' | 'symbol' | 'swapFeeEvm' | 'owner'
> & {
  mainToken: string;
  wrappedToken: string;
  upperTargetEvm: string;
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

// Source of the protocolId's: https://github.com/balancer/balancer-v2-monorepo/blob/647320a4a375c724276af8e1ae26948de8fa411b/pkg/interfaces/contracts/standalone-utils/IProtocolIdRegistry.sol#L54-L72
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
