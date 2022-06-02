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
  weight: number;
  isLocked: boolean;
  amount: string;
  id: number;
}

export type PoolInfo = {
  id: number;
  name: string;
  address: string;
}

export type WeightedFactoryParams = { 
  name: string;
  symbol: string;
  initialFee: string;
  seedTokens: SeedToken[];
  owner: string; value: string;
}