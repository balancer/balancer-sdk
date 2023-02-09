
import hardhat from "hardhat";
import { JsonRpcSigner } from "@ethersproject/providers";
import { Network, PoolWithMethods } from "@/.";
import { forkSetup, TestPoolHelper } from "@/test/lib/utils";

/**
 * Sets up fork with configure balances/allowances. Retrieves pool state for specific ID at blockNo.
 * (fetching all pool data against a local fork causes timeouts so this keeps it efficient) 
 * @param rpcUrl 
 * @param network 
 * @param tokens 
 * @param balances 
 * @param poolId 
 * @returns 
 */
export  async function setUpExample(rpcUrl: string, network: Network, tokens: string[], slots: number[], balances: string[], poolId: string, blockNo: number): Promise<{ pool: PoolWithMethods, signer: JsonRpcSigner}> {
  const { ALCHEMY_URL: jsonRpcUrl } = process.env;
  const provider = new hardhat.ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  await forkSetup(
    signer,
    tokens,
    slots,
    balances,
    jsonRpcUrl as string,
    blockNo
  );
  const testPool = new TestPoolHelper(
    poolId,
    network,
    rpcUrl,
    blockNo
  );
  const pool = await testPool.getPool();
  return {
    pool,
    signer,
  }
}