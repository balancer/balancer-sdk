import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

export enum PoolType {
  Weighted = 'Weighted',
  Investment = 'Investment',
  Stable = 'Stable',
  MetaStable = 'MetaStable',
  StablePhantom = 'StablePhantom',
  LiquidityBootstrapping = 'LiquidityBootstrapping',
}

export type SeedToken = {
  tokenAddress: string;
  weight: BigNumberish;
  amount: string;
  id: number;
  symbol: string;
};

export type PoolInfo = {
  id: BigNumber;
  name: string;
  address: string;
};

export type WeightedFactoryParams = {
  name?: string;
  symbol?: string;
  initialFee: string;
  seedTokens: SeedToken[];
  owner: string;
  value: string;
};

export type WeightedFactoryAttributes =
  | {
      to: string;
      data: string;
      value?: BigNumber;
      functionName: string;
      attributes: WeightedFactoryFormattedAttributes;
      error: false;
    }
  | ErrorObject;

type ErrorObject = { error: true; message: string };

export type WeightedFactoryFormattedAttributes = {
  name: string;
  symbol: string;
  tokens: string[];
  weights: BigNumber[];
  swapFeePercentage: BigNumber;
  owner: string;
};

export type InitJoinAttributes = {
  to: string;
  functionName: string;
  attributes: {
    poolId: string;
    sender: string;
    receiver: string;
    joinPoolRequest: {
      assets: string[];
      maxAmountsIn: string[];
      userData: string;
      fromInternalBalance: boolean;
    };
  };
  data: string;
  value?: BigNumber;
  err?: boolean;
};
