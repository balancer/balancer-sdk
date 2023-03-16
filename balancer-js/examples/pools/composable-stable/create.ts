import { LogDescription } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import {
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/providers';
import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { BALANCER_NETWORK_CONFIG, balancerVault } from '@/lib/constants/config';
import { ADDRESSES } from '@/test/lib/constants';
import {
  findEventInReceiptLogs,
  forkSetup,
  getBalances,
} from '@/test/lib/utils';
import {
  BalancerSDK,
  ComposableStable__factory,
  ComposableStableFactory__factory,
  Network,
  PoolType,
  Vault__factory,
} from 'src';
import { Contract } from '@ethersproject/contracts';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
export const provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(
  rpcUrl,
  network
);
export const signer = provider.getSigner();
const sdkConfig = {
  network,
  rpcUrl,
};

export const balancer = new BalancerSDK(sdkConfig);
export const addresses = ADDRESSES[network];
const USDC_address = addresses.USDC.address;
const USDT_address = addresses.USDT.address;
const tokenAddresses = [USDC_address, USDT_address];

const createComposablePoolParameters = {
  factoryAddress: `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`,
  name: 'Test-Name',
  symbol: 'Test-Symbol',
  tokenAddresses,
  amplificationParameter: '72',
  rateProviders: [
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
  ],
  tokenRateCacheDurations: ['100', '100'],
  swapFee: '0.01',
  exemptFromYieldProtocolFeeFlags: [false, false],
  owner: undefined, // The owner will be passed as the signerAddress
};

/**
 * This function
 * - Changes the balances of a signer for the tokens specified on tokenAddresses;
 * - Sets the blockNumber of the hardhat fork to the blockNumber passed in the params;
 * If you already setted your local node to run the example, you can remove this function;
 */
const setupFork = async () => {
  const alchemyRpcUrl = `${process.env.ALCHEMY_URL}`;
  const blockNumber = 16720000;
  const USDC_slot = addresses.USDC.slot;
  const USDT_slot = addresses.USDT.slot;
  const slots = [USDC_slot, USDT_slot];
  const initialBalances = [
    parseFixed('1000000000', addresses.USDC.decimals).toString(),
    parseFixed('1000000000', addresses.USDT.decimals).toString(),
  ];
  await forkSetup(
    signer,
    tokenAddresses,
    slots,
    initialBalances,
    alchemyRpcUrl,
    blockNumber,
    false
  );
};

const createComposableStablePool = async () => {
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  const signerAddress = await signer.getAddress();

  const { to, data } = composableStablePoolFactory.create({
    ...createComposablePoolParameters,
    owner: signerAddress,
  });

  const transaction = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 6721975,
  });
  return { transaction, to: to as string };
};

const checkIfPoolWasCreated = async (
  transaction: TransactionResponse,
  to: string
) => {
  const receipt: TransactionReceipt = await provider.getTransactionReceipt(
    transaction.hash
  );

  const poolCreationEvent: LogDescription = findEventInReceiptLogs({
    receipt,
    to,
    contractInterface: ComposableStableFactory__factory.createInterface(),
    logName: 'PoolCreated',
  });

  const poolAddress = poolCreationEvent.args.pool;
  console.log('poolAddress: ' + poolAddress);

  return poolAddress;
};

const initJoinComposableStablePool = async (poolAddress: string) => {
  const composableStablePoolInterface =
    ComposableStable__factory.createInterface();
  const pool = new Contract(
    poolAddress,
    composableStablePoolInterface,
    provider
  );
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );
  const amountsIn = [
    parseFixed('10000', addresses.USDC.decimals).toString(),
    parseFixed('10000', addresses.USDT.decimals).toString(),
  ];
  const poolId = await pool.getPoolId();
  const signerAddress = await signer.getAddress();
  const { to, data } = composableStablePoolFactory.buildInitJoin({
    joiner: signerAddress,
    poolId,
    poolAddress,
    tokensIn: tokenAddresses,
    amountsIn,
  });
  await signer.sendTransaction({
    to,
    data,
    gasLimit: 30000000,
  });
  return { poolId };
};

const checkIfInitJoinWorked = async (poolId: string) => {
  const vaultInterface = Vault__factory.createInterface();
  const vault = new Contract(balancerVault, vaultInterface, signer.provider);
  const [tokens, balances] = await vault.getPoolTokens(poolId);
  return { tokens, balances };
};

async function createAndInitJoinComposableStable() {
  console.log('Setting up the hardhat fork...');
  await setupFork();
  console.log('Starting Pool creation...');
  const { transaction: createTx, to: poolFactoryAddress } =
    await createComposableStablePool();
  const poolAddress = await checkIfPoolWasCreated(createTx, poolFactoryAddress);
  console.log('Finished Pool creation');
  console.log('poolAddress: ' + poolAddress);
  console.log('Starting Pool Init Join...');
  const { poolId } = await initJoinComposableStablePool(poolAddress);
  const { tokens, balances } = await checkIfInitJoinWorked(poolId);
  console.log('Finished Pool Init Join');
  console.log('Pool Tokens Addresses(Including BPT): ' + tokens);
  console.log('Pool Tokens balances(Including BPT): ' + balances);
}

createAndInitJoinComposableStable().then((r) => r);
