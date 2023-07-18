import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { Pool, PoolToken, PoolType } from '@/types';
import { decorateGyroEv2 } from './multicall/gyroEv2';
import { getPoolsFromDataQuery } from './poolDataQueries';
import { Logger } from '@/lib/utils/logger';
import { decorateFx } from './multicall/fx';

export type Tokens = (SubgraphToken | PoolToken)[];

export type BalancerPool = Omit<SubgraphPoolBase | Pool, 'tokens'> & {
  tokens: Tokens;
};

export async function getOnChainPools<GenericPool extends BalancerPool>(
  subgraphPoolsOriginal: GenericPool[],
  dataQueryAddr: string,
  multicallAddr: string,
  provider: Provider,
  chunkSize?: number
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const filteredPools = subgraphPoolsOriginal.filter((p) => {
    if (!supportedPoolTypes.includes(p.poolType) || p.poolType === 'Managed') {
      const logger = Logger.getInstance();
      logger.warn(`Unknown pool type: ${p.poolType} ${p.id}`);
      return false;
    } else return true;
  });
  if (!chunkSize) {
    chunkSize = filteredPools.length;
  }
  const onChainPools: GenericPool[] = [];
  for (let i = 0; i < filteredPools.length / chunkSize; i += 1) {
    const chunk = filteredPools.slice(i, i + chunkSize);
    const onChainChunk = await getPoolsFromDataQuery(
      chunk,
      dataQueryAddr,
      provider
    );
    onChainPools.push(...onChainChunk);
  }
  // GyroEV2 requires tokenRates onchain update that dataQueries does not provide
  await decorateGyroEv2(onChainPools, multicallAddr, provider);
  await decorateFx(onChainPools, multicallAddr, provider);
  return onChainPools;
}
