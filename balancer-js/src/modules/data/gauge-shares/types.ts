export enum GaugeShareAttributes {
  Id = 'id',
  UserAddress = 'user',
  GaugeId = 'gauge',
  Balance = 'balance',
}

export interface GaugeShare {
  id: string;
  balance: string;
  userAddress: string;
  gauge: {
    id: string;
    poolId?: string;
    isKilled: boolean;
    totalSupply: string;
  };
}
