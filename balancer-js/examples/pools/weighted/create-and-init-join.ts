/**
 * Weighted - Create and do an initial join.
 * Run command: yarn examples:run ./examples/pools/weighted/create-and-init-join.ts
 */
import * as dotenv from 'dotenv';

dotenv.config();

import { parseFixed } from '@ethersproject/bignumber';

import { setUpExample } from '../helper';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerSDK, Network, PoolType } from 'src';

async function createAndInitJoinWeightedPool() {
  const { ALCHEMY_URL: rpcUrlArchive } = process.env;
  const network = Network.MAINNET;
  const rpcUrlLocal = 'http://127.0.0.1:8545';
  const addresses = ADDRESSES[network];
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);
  const balances = [
    parseFixed('100000', 6).toString(),
    parseFixed('100000', 6).toString(),
  ];

  // This example uses a local hard fork which allows simulation without real balances, etc
  const { signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    [addresses.USDC.address, addresses.USDT.address],
    [addresses.USDC.slot, addresses.USDT.slot],
    balances,
    '',
    16720000
  );
  const signerAddress = await signer.getAddress();

  const poolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    tokenAddresses: [addresses.USDC.address, addresses.USDT.address],
    weights: [
      parseFixed('0.2', 18).toString(),
      parseFixed('0.8', 18).toString(),
    ],
    swapFeeEvm: parseFixed('1', 16).toString(),
    owner: signerAddress,
  };

  //Build the create transaction
  const { to, data } = weightedPoolFactory.create(poolParameters);

  //Sending create transaction
  const createTransaction = await signer.sendTransaction({
    from: signerAddress,
    to,
    data,
    gasLimit: 30000000,
  });
  const createReceipt = await createTransaction.wait();

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await weightedPoolFactory.getPoolAddressAndIdWithReceipt(
      signer.provider,
      createReceipt
    );

  // Build initial join of pool
  const initJoinParams = weightedPoolFactory.buildInitJoin({
    joiner: signerAddress,
    poolId,
    poolAddress,
    tokensIn: [addresses.USDC.address, addresses.USDT.address],
    amountsIn: [
      parseFixed('2000', 6).toString(),
      parseFixed('8000', 6).toString(),
    ],
  });

  //Sending initial join transaction
  await signer.sendTransaction({
    to: initJoinParams.to,
    data: initJoinParams.data,
    gasLimit: 30000000,
  });

  // Check that pool balances are as expected after join
  const tokens = await balancer.contracts.vault.getPoolTokens(poolId);
  console.log('Pool Tokens Addresses (Includes BPT): ' + tokens.tokens);
  console.log('Pool Tokens balances (Includes BPT): ' + tokens.balances);
}

createAndInitJoinWeightedPool();
