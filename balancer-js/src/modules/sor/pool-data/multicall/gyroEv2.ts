import { formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Multicaller } from '@/lib/utils/multiCaller';
import { Multicall__factory } from '@/contracts';
import { Pool, PoolType } from '@/types';
import { GyroEV2__factory } from '@/contracts';
import { JsonFragment } from '@ethersproject/abi';
import { BalancerPool } from '../onChainData';
import { Logger } from '@/lib/utils/logger';

type TokenRates = Record<
  string,
  {
    tokenRates?: string[];
  }
>;

/**
 * Update pool tokenRates using mulitcall
 * @param pools
 * @param multicallAddr
 * @param provider
 */
export async function decorateGyroEv2<GenericPool extends BalancerPool>(
  pools: GenericPool[],
  multicallAddr: string,
  provider: Provider
): Promise<void> {
  const gyroPools = pools.filter((p) => {
    return (
      p.poolType === 'GyroE' && p.poolTypeVersion && p.poolTypeVersion === 2
    );
  });
  // Use multicall to get tokenRates for all GyroE V2
  const gyroTokenRates = await getGyroTokenRates(
    gyroPools,
    multicallAddr,
    provider
  );
  gyroPools.forEach((pool) => {
    if (gyroTokenRates[pool.id]) {
      pool.tokenRates = gyroTokenRates[pool.id].tokenRates?.map((r) =>
        formatFixed(r, 18)
      );
    } else {
      console.warn(`GyroE V2 Missing tokenRates: `, pool.id);
    }
  });
}

async function getGyroTokenRates<
  GenericPool extends Pick<
    SubgraphPoolBase | Pool,
    'poolType' | 'poolTypeVersion' | 'id' | 'address'
  >
>(
  gyroPools: GenericPool[],
  multiAddress: string,
  provider: Provider
): Promise<TokenRates> {
  if (gyroPools.length === 0) return {} as TokenRates;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abis: any = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [...(GyroEV2__factory.abi as readonly JsonFragment[])].map((row) => [
        row.name,
        row,
      ])
    )
  );
  const multicall = Multicall__factory.connect(multiAddress, provider);
  const multiPool = new Multicaller(multicall, abis);
  gyroPools.forEach((pool) => {
    if (!(pool.poolType === PoolType.GyroE && pool.poolTypeVersion === 2)) {
      const logger = Logger.getInstance();
      logger.warn(
        `Incorrectly calling tokenRates on pool: ${pool.poolType} ${pool.id}`
      );
      return;
    }
    multiPool.call(`${pool.id}.tokenRates`, pool.address, 'getTokenRates');
  });

  let tokenRates = {} as TokenRates;
  try {
    tokenRates = (await multiPool.execute()) as TokenRates;
  } catch (err) {
    console.error(`Issue with Gyro Multicall execution.`);
  }
  return tokenRates;
}
