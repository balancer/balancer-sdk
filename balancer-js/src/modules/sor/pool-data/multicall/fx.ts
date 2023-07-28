import { formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Multicaller } from '@/lib/utils/multiCaller';
import { FXPool__factory, Multicall__factory } from '@/contracts';
import { Pool, PoolType } from '@/types';
import { JsonFragment } from '@ethersproject/abi';
import { BalancerPool } from '../onChainData';
import { Logger } from '@/lib/utils/logger';

type SwapFees = Record<
  string,
  {
    swapFee: string;
  }
>;

/**
 * Update pool swapFees using mulitcall
 * @param pools
 * @param multicallAddr
 * @param provider
 */
export async function decorateFx<GenericPool extends BalancerPool>(
  pools: GenericPool[],
  multicallAddr: string,
  provider: Provider
): Promise<void> {
  const fxPools = pools.filter((p) => {
    return p.poolType === 'FX';
  });
  // Use multicall to get swapFees for all FX pools
  const fxSwapFees = await getFxSwapFee(fxPools, multicallAddr, provider);
  fxPools.forEach((pool) => {
    if (fxSwapFees[pool.id]) {
      pool.swapFee = formatFixed(fxSwapFees[pool.id].swapFee, 18);
    } else {
      console.warn(`FX missing protocolPercentFee: `, pool.id);
    }
  });
}

async function getFxSwapFee<
  GenericPool extends Pick<
    SubgraphPoolBase | Pool,
    'poolType' | 'id' | 'address'
  >
>(
  fxPools: GenericPool[],
  multiAddress: string,
  provider: Provider
): Promise<SwapFees> {
  if (fxPools.length === 0) return {} as SwapFees;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abis: any = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [...(FXPool__factory.abi as readonly JsonFragment[])].map((row) => [
        row.name,
        row,
      ])
    )
  );
  const multicall = Multicall__factory.connect(multiAddress, provider);
  const multiPool = new Multicaller(multicall, abis);
  fxPools.forEach((pool) => {
    if (pool.poolType !== PoolType.FX) {
      const logger = Logger.getInstance();
      logger.warn(
        `Incorrectly calling protocolPercentFee on pool: ${pool.poolType} ${pool.id}`
      );
      return;
    }
    multiPool.call(`${pool.id}.swapFee`, pool.address, 'protocolPercentFee');
  });

  let swapFees = {} as SwapFees;
  try {
    swapFees = (await multiPool.execute()) as SwapFees;
  } catch (err) {
    console.error(`Issue with FX multicall execution.`);
  }
  return swapFees;
}
