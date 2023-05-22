import { Pool, PoolType, PoolToken, SubPool } from '@/.';
import {
  SubgraphPool,
  SubgraphPoolTokenFragment,
  SubgraphSubPoolFragment,
  SubgraphSubPoolTokenFragment,
} from '@/modules/subgraph/subgraph';

interface SubgraphSubPoolToken extends SubgraphSubPoolTokenFragment {
  token?: SubgraphSubPoolMeta | null;
}

interface SubgraphSubPoolMeta {
  latestUSDPrice?: string | null;
  pool?: SubgraphSubPool | null;
}

interface SubgraphSubPool extends SubgraphSubPoolFragment {
  tokens: SubgraphSubPoolToken[];
}

export const mapType = (subgraphPool: SubgraphPool, chainId: number): Pool => {
  return {
    id: subgraphPool.id,
    name: subgraphPool.name || '',
    address: subgraphPool.address,
    chainId: chainId,
    poolType: subgraphPool.poolType as PoolType,
    poolTypeVersion: subgraphPool.poolTypeVersion || 1,
    swapFee: subgraphPool.swapFee,
    swapEnabled: subgraphPool.swapEnabled,
    protocolYieldFeeCache: subgraphPool.protocolYieldFeeCache || '0.5', // Default protocol yield fee
    protocolSwapFeeCache: subgraphPool.protocolSwapFeeCache || '0.5', // Default protocol swap fee
    amp: subgraphPool.amp ?? undefined,
    owner: subgraphPool.owner ?? undefined,
    factory: subgraphPool.factory ?? undefined,
    symbol: subgraphPool.symbol ?? undefined,
    tokens: (subgraphPool.tokens || []).map(mapToken),
    tokensList: subgraphPool.tokensList,
    tokenAddresses: (subgraphPool.tokens || []).map((t) => t.address),
    totalLiquidity: subgraphPool.totalLiquidity,
    totalShares: subgraphPool.totalShares,
    totalSwapFee: subgraphPool.totalSwapFee,
    totalSwapVolume: subgraphPool.totalSwapVolume,
    priceRateProviders: subgraphPool.priceRateProviders ?? undefined,
    // onchain: subgraphPool.onchain,
    createTime: subgraphPool.createTime,
    mainIndex: subgraphPool.mainIndex ?? undefined,
    wrappedIndex: subgraphPool.wrappedIndex ?? undefined,
    // mainTokens: subgraphPool.mainTokens,
    // wrappedTokens: subgraphPool.wrappedTokens,
    // unwrappedTokens: subgraphPool.unwrappedTokens,
    // isNew: subgraphPool.isNew,
    // volumeSnapshot: subgraphPool.volumeSnapshot,
    // feesSnapshot: subgraphPool.???, // Approximated last 24h fees
    // boost: subgraphPool.boost,
    totalWeight: subgraphPool.totalWeight || '1',
    lowerTarget: subgraphPool.lowerTarget ?? '0',
    upperTarget: subgraphPool.upperTarget ?? '0',
    isInRecoveryMode: subgraphPool.isInRecoveryMode ?? false,
    isPaused: subgraphPool.isPaused ?? false,
  };
};

const mapToken = (subgraphToken: SubgraphPoolTokenFragment): PoolToken => {
  const subPoolInfo = mapSubPools(
    // need to typecast as the fragment is 3 layers deep while the type is infinite levels deep
    subgraphToken.token as SubgraphSubPoolMeta
  );
  return {
    ...subgraphToken,
    isExemptFromYieldProtocolFee:
      subgraphToken.isExemptFromYieldProtocolFee || false,
    token: subPoolInfo,
  };
};

const mapSubPools = (metadata: SubgraphSubPoolMeta) => {
  let subPool: SubPool | null = null;

  if (metadata.pool) {
    subPool = {
      id: metadata.pool.id,
      address: metadata.pool.address,
      totalShares: metadata.pool.totalShares,
      poolType: metadata.pool.poolType as PoolType,
      mainIndex: metadata.pool.mainIndex || 0,
    };

    if (metadata?.pool.tokens) {
      subPool.tokens = metadata.pool.tokens.map(mapSubPoolToken);
    }
  }

  return {
    pool: subPool,
    latestUSDPrice: metadata.latestUSDPrice || undefined,
  };
};

const mapSubPoolToken = (token: SubgraphSubPoolToken) => {
  return {
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    balance: token.balance,
    priceRate: token.priceRate,
    weight: token.weight,
    isExemptFromYieldProtocolFee:
      token.isExemptFromYieldProtocolFee || undefined,
    token: token.token ? mapSubPools(token.token) : undefined,
  };
};
