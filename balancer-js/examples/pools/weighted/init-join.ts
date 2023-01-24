import createWeightedPool from "./create";
import { Interface, LogDescription } from "@ethersproject/abi";
import { Vault__factory, WeightedPool__factory } from "@balancer-labs/typechain";
import { Contract } from "@ethersproject/contracts";
import { balancer, provider, signer, tokenAddresses } from "./example-config";
import { parseFixed } from "@ethersproject/bignumber";
import { Log, TransactionReceipt } from "@ethersproject/providers";
import { isSameAddress } from "@/lib/utils";
import { PoolType } from "@/types";

export async function initJoinWeightedPool() {
  const poolAddress = await createWeightedPool;
  const signerAddress = await signer.getAddress();
  const weightedPoolInterface = new Interface(WeightedPool__factory.abi);
  const pool = new Contract(
    poolAddress,
    weightedPoolInterface,
    provider
  );
  const poolId = await pool.getPoolId();

  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  const initJoinParams = weightedPoolFactory.buildInitJoin({
    joiner: signerAddress,
    poolId,
    poolAddress,
    tokensIn: tokenAddresses,
    amountsIn: [
      parseFixed('2000', 6).toString(),
      parseFixed('8000', 6).toString(),
    ],
  });
  
  const tx = await signer.sendTransaction({
    to: initJoinParams.to,
    data: initJoinParams.data,
    gasLimit: 30000000,
  });
  await tx.wait();
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );
  const vaultInterface = new Interface(Vault__factory.abi);
  const poolInitJoinEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, initJoinParams.to);
    })
    .map((log) => {
      return vaultInterface.parseLog(log);
    })
    .find((parsedLog) => parsedLog?.name === 'PoolBalanceChanged');
  if(!poolInitJoinEvent) return console.error("Couldn't find event in the receipt logs");
  const poolTokens = poolInitJoinEvent.args[2];
  const newBalances = poolInitJoinEvent.args[3];
  const oldBalances = poolInitJoinEvent.args[4];
  console.log("Pool Token Addresses: " + poolTokens);
  console.log("Pool new balances(Big Number): " + newBalances);
  console.log("Pool old balances: " + oldBalances);
}

initJoinWeightedPool().then(r => r);