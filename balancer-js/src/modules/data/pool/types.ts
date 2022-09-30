export type PoolAttribute = 'id' | 'address';

export interface PoolRepository {
  skip?: number;
}

export interface PoolsRepositoryFetchOptions {
  first?: number;
  skip?: number;
}

export interface PoolsFallbackRepositoryOptions {
  timeout?: number;
}
