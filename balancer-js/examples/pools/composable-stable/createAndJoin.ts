/**
 * ComposableStable - Create and do an initial join.
 * Run command: yarn examples:run ./examples/pools/composable-stable/createAndJoin.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();
import { LogDescription } from '@ethersproject/abi';
import { parseFixed } from '@ethersproject/bignumber';
import {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { ADDRESSES } from '@/test/lib/constants';
import { findEventInReceiptLogs } from '@/test/lib/utils';
import { setUpExample } from './helper';

import {
  BalancerSDK,
  ComposableStable__factory,
  ComposableStableFactory__factory,
  Network,
  PoolType,
} from '@/.';

// TODO - Make this a helper function on factory as is essential part of flow
const checkIfPoolWasCreated = async (
  provider: JsonRpcProvider,
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
  const composableStablePoolInterface =
    ComposableStable__factory.createInterface();
  const pool = new Contract(
    poolAddress,
    composableStablePoolInterface,
    provider
  );
  const poolId = await pool.getPoolId();
  return {
    poolAddress,
    poolId,
  };
};

async function createAndInitJoinComposableStable() {
  const { ALCHEMY_URL: rpcUrlArchive } = process.env;
  const network = Network.MAINNET;
  const rpcUrlLocal = 'http://127.0.0.1:8545';
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const addresses = ADDRESSES[network];
  const poolTokens = [addresses.USDC.address, addresses.USDT.address];
  const amountsIn = [
    parseFixed('1000000000', addresses.USDC.decimals).toString(),
    parseFixed('1000000000', addresses.USDT.decimals).toString(),
  ];
  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  );

  // This example uses a local hard fork which allows simulation without real balances, etc
  const { signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    [addresses.USDC.address, addresses.USDT.address],
    [addresses.USDC.slot, addresses.USDT.slot],
    amountsIn,
    '',
    16720000
  );
  const ownerAddress = await signer.getAddress();
  const poolParameters = {
    factoryAddress: `${BALANCER_NETWORK_CONFIG[network].addresses.contracts.composableStablePoolFactory}`, // TODO - reference this via balancer.contracts.composableFactory.address once its added to Contracts module
    name: 'Test-Name',
    symbol: 'Test-Symbol',
    tokenAddresses: poolTokens,
    amplificationParameter: '72',
    rateProviders: [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
    ],
    tokenRateCacheDurations: ['100', '100'],
    swapFee: '0.01',
    exemptFromYieldProtocolFeeFlags: [false, false],
    owner: ownerAddress,
  };
  // Create new pool
  const createInfo = composableStablePoolFactory.create(poolParameters);
  const createTransaction = await signer.sendTransaction(createInfo);
  // Check logs of creation to get new pool ID and address
  const { poolAddress, poolId } = await checkIfPoolWasCreated(
    signer.provider,
    createTransaction,
    createInfo.to
  );
  // Do initial join of pool
  const joinInfo = composableStablePoolFactory.buildInitJoin({
    joiner: ownerAddress,
    poolId,
    poolAddress,
    tokensIn: poolTokens,
    amountsIn,
  });
  await signer.sendTransaction({ to: joinInfo.to, data: joinInfo.data });
  // Check that pool balances are as expected after join
  const tokens = await balancer.contracts.vault.getPoolTokens(poolId);
  console.log('Pool Tokens Addresses (Includes BPT): ' + tokens.tokens);
  console.log('Pool Tokens balances (Includes BPT): ' + tokens.balances);
}

createAndInitJoinComposableStable();
