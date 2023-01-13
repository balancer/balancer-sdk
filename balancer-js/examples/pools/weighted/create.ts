import * as dotenv from 'dotenv';
import {
  Log,
  TransactionReceipt,
} from '@ethersproject/providers';
import { BalancerSDK, isSameAddress, Network, PoolType } from 'src';
import { ethers } from 'hardhat';
import { Interface, LogDescription } from '@ethersproject/abi';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup } from "@/test/lib/utils";
import { BALANCER_NETWORK_CONFIG } from "@/lib/constants/config";
import { WeightedPoolFactory__factory } from "@balancer-labs/typechain";
import "./example-config";
import {
  alchemyRpcUrl,
  blockNumber,
  network,
  rpcUrl,
  factoryAddress,
  name,
  symbol,
  tokenAddresses,
  weights,
  swapFee,
  owner
} from "./example-config";


export async function createWeightedPool() {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
  const signer = provider.getSigner();
  const sdkConfig = {
    network,
    rpcUrl,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  await forkSetup(signer, [], [], [], alchemyRpcUrl, blockNumber, false);
  const { to, data } = weightedPoolFactory.create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    weights,
    swapFee,
    owner,
  });
  const signerAddress = await signer.getAddress();
  const tx = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 30000000,
  });
  await tx.wait();
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    tx.hash
  );

  const weightedPoolFactoryInterface = new Interface(
    WeightedPoolFactory__factory.abi
  );

  const poolCreationEvent: LogDescription | null | undefined = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, factoryAddress);
    })
    .map((log) => {
      return weightedPoolFactoryInterface.parseLog(log);
    })
    .find((parsedLog) => parsedLog?.name === 'PoolCreated');
  if (!poolCreationEvent) return console.error("There's no event");
  console.log("poolAddress: " + poolCreationEvent.args.pool);

  return poolCreationEvent.args.pool;
}

createWeightedPool().then((r) => r);