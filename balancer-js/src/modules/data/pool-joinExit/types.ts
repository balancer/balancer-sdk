export enum PoolJoinExitAttributes {
  Pool = 'pool',
  Sender = 'sender',
}

export interface PoolJoinExit {
  id: string;
  userAddress: string;
  poolId: string;
  timestamp: number;
  type: string;
  amounts: string[];
  tokens: string[];
}
