import * as dotenv from 'dotenv';
import {
  JsonRpcProvider,
  Log,
  TransactionReceipt,
} from '@ethersproject/providers';
import { BalancerSDK, isSameAddress, Network, PoolType } from 'src';
import composableStableFactoryAbi from '@/lib/abi/ComposableStableFactory.json';
import { ethers } from 'hardhat';
import { Interface, LogDescription } from '@ethersproject/abi';
import { ADDRESSES } from '@/test/lib/constants';
import { forkSetup } from "@/test/lib/utils";
import { BALANCER_NETWORK_CONFIG } from "@/lib/constants/config";
import { WeightedPoolFactory__factory } from "@balancer-labs/typechain";

dotenv.config();

// const network = Network.MAINNET;
// const rpcUrl = 'http://127.0.0.1:8545';
// const alchemyRpcUrl = `${ process.env.ALCHEMY_URL }`;
// const blockNumber = 16320000;

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8000';
const alchemyRpcUrl = `${ process.env.ALCHEMY_URL_GOERLI }`;
const blockNumber = 8200000;

const name = 'My-Test-Pool-Name';
const symbol = 'My-Test-Pool-Symbol';

const addresses = ADDRESSES[network];

const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;

const factoryAddress = `${ BALANCER_NETWORK_CONFIG[network].addresses.contracts.weightedPoolFactory }`;
const owner = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const tokenAddresses = [USDC_address, USDT_address];
const swapFee = '0.01';
const weights = [`${ 0.2e18 }`, `${ 0.8e18 }`];

async function createWeightedPool() {
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
}

createWeightedPool().then((r) => r);