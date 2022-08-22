import { Pool } from '@/types';

export type PoolAttribute = 'id' | 'address';

export interface PoolRepository {
  skip?: string | number;
}
