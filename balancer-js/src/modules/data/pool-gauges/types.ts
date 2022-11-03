export enum PoolGaugesAttributes {
  Id = 'id',
  Address = 'address',
  PoolId = 'poolId',
}

export interface PoolGauges {
  preferentialGauge?: {
    id: string | null;
  };
  gauges?: {
    id: string;
    relativeWeightCap: string | null;
  }[];
}
