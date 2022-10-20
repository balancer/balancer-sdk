export enum PoolShareAttributes {
  Balance = 'balance',
  Id = 'id',
  PoolId = 'poolId',
  UserAddress = 'userAddress',
}

export interface PoolShare {
  id: string;
  userAddress: string;
  poolId: string;
  balance: string;
}
