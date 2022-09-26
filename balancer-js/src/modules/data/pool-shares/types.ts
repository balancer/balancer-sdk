export enum PoolShareAttributes {
  Balance = 'balance',
  Id = 'id',
  PoolId = 'poolId',
  UserAddress = 'userAddress'
}

export type PoolShareAttribute = PoolShareAttributes.Id 
  | PoolShareAttributes.PoolId 
  | PoolShareAttributes.UserAddress 
  | PoolShareAttributes.Balance;

  export interface PoolShare {
    id: string;
    userAddress: string;
    poolId: string;
    balance: string;
  }