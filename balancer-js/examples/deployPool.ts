import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract, ContractTransaction } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { BalancerSDK, Network, WeightedPoolEncoder } from '../src/index';
import fs from 'fs';
import { parseFixed } from '@ethersproject/bignumber';
import weightedFactoryAbi from '../src/lib/abi/WeightedPoolFactory.json';
import { Signer } from 'ethers';

type PoolDeployToken = {
  address: string;
  initialBalance: string;
  decimals: number;
  weight: string;
  rateProvider: string;
};

type PoolDeployData = {
  name: string;
  symbol: string;
  tokens: PoolDeployToken[];
  swapFeePercentage: string;
  owner: string;
};

dotenv.config();

const WEIGHTED_FACTORY_ADDRESS = '0x26575A44755E0aaa969FDda1E4291Df22C5624Ea';

/*
Example showing how to deploy a pool from a factory
*/
async function deployPool(
  poolData: PoolDeployData,
  balancer: BalancerSDK,
  signer: Signer
) {
  const tokens = poolData.tokens.map((t) => t.address);
  const weights = poolData.tokens.map((t) => parseFixed(t.weight, 18));
  const rateProviders = poolData.tokens.map((t) => t.rateProvider);
  const swapFee = parseFixed(poolData.swapFeePercentage, 16);

  const factoryContract = new Contract(
    WEIGHTED_FACTORY_ADDRESS,
    weightedFactoryAbi,
    signer
  );

  const creationTx: ContractTransaction = await factoryContract.create(
    poolData.name,
    poolData.symbol,
    tokens,
    weights,
    rateProviders,
    swapFee,
    poolData.owner
  );

  const txHash = (await creationTx.wait()).transactionHash;

  const receipt = await signer.provider?.getTransactionReceipt(txHash);
  if (!receipt) throw new Error('Could not find tx hash');

  const event = balancer.contracts.vault.interface.parseLog(receipt.logs[1]);
  if (!event) throw new Error('Could not find PoolRegistered event');

  return event.args?.poolId;
}

async function deployAndInitializePool() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Please provide the path to a JSON file with pool data as a CLI argument'
    );
    process.exit(1);
  }
  const filePath = args[0];
  const fileData = fs.readFileSync(filePath, 'utf8');
  const poolData: PoolDeployData = JSON.parse(fileData);

  const network = Network.GOERLI;
  const rpcUrl = '';
  const provider = new JsonRpcProvider(rpcUrl, network);
  const { TRADER_KEY } = process.env;
  const signer = new Wallet(TRADER_KEY as string, provider);
  signer.connect(provider);

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  // poolId can be passed as second cli argument if already deployed
  const poolId = args[1]
    ? args[1]
    : await deployPool(poolData, balancer, signer);

  const tokens = poolData.tokens.map((t) => t.address);
  const amounts = poolData.tokens.map((t) =>
    parseFixed(t.initialBalance, t.decimals)
  );

  const userData = WeightedPoolEncoder.joinInit(amounts);
  const joinPoolRequest = {
    assets: tokens,
    maxAmountsIn: amounts,
    userData,
    fromInternalBalance: false,
  };

  const joinTx = await balancer.contracts.vault
    .connect(signer)
    .joinPool(poolId, signer.address, signer.address, joinPoolRequest);

  await joinTx.wait();
}

// yarn examples:run ./examples/deployPool.ts ./examples/pools/poolData.json
deployAndInitializePool();
