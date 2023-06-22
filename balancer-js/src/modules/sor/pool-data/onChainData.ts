import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { Pool, PoolToken, PoolType } from '@/types';
import { decorateGyroEv2 } from './multicall/gyroEv2';
import { getPoolsFromDataQuery } from './poolDataQueries';

export type Tokens = (SubgraphToken | PoolToken)[];

export type BalancerPool = Omit<SubgraphPoolBase | Pool, 'tokens'> & {
  tokens: Tokens;
};

export async function getOnChainPools<GenericPool extends BalancerPool>(
  subgraphPoolsOriginal: GenericPool[],
  dataQueryAddr: string,
  multicallAddr: string,
  provider: Provider
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const filteredPools = subgraphPoolsOriginal.filter((p) => {
    if (!supportedPoolTypes.includes(p.poolType)) {
      console.warn(`Unknown pool type: ${p.poolType} ${p.id}`);
      return false;
    } else return true;
  });
  const onChainPools = await getPoolsFromDataQuery(
    filteredPools,
    dataQueryAddr,
    provider
  );
  // GyroEV2 requires tokenRates onchain update that dataQueries does not provide
  await decorateGyroEv2(onChainPools, multicallAddr, provider);
  return onChainPools;
}
