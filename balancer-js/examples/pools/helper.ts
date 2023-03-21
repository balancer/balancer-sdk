import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers';
import { Network, PoolWithMethods } from '@/index';

import { forkSetup, TestPoolHelper } from '@/test/lib/utils';

/**
 * Sets up fork with configure balances/allowances. Retrieves pool state for specific ID at blockNo.
 * (fetching all pool data against a local fork causes timeouts so this keeps it efficient)
 * @param rpcUrlArchive
 * @param rpcUrlLocal
 * @param network
 * @param tokens
 * @param slots
 * @param balances
 * @param poolId
 * @param blockNo
 * @returns
 */
export async function setUpExample(
  rpcUrlArchive: string,
  rpcUrlLocal: string,
  network: Network,
  tokens: string[],
  slots: number[],
  balances: string[],
  poolId: string,
  blockNo: number
): Promise<{ pool: PoolWithMethods; signer: JsonRpcSigner }> {
  // const provider = new hardhat.ethers.providers.JsonRpcProvider(rpcUrlLocal, network);
  const provider = new JsonRpcProvider(rpcUrlLocal, network);
  const signer = provider.getSigner();
  await forkSetup(
    signer,
    tokens,
    slots,
    balances,
    rpcUrlArchive as string,
    blockNo
  );
  let pool = {} as PoolWithMethods;
  if (poolId !== '') {
    const testPool = new TestPoolHelper(poolId, network, rpcUrlLocal, blockNo);
    pool = await testPool.getPool();
  }
  return {
    pool,
    signer,
  };
}
