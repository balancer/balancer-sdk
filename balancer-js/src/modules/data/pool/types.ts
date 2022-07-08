import { Pool } from '@/types';

export type PoolAttribute = 'id' | 'address';

export interface PoolRepository {
  find: (id: string) => Promise<Pool | undefined>;
  findBy: (
    attribute: PoolAttribute,
    value: string
  ) => Promise<Pool | undefined>;
}
