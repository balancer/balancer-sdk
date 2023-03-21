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
  const network = Network.GOERLI;
  const rpcUrlLocal = 'http://127.0.0.1:8000';
  const addresses = ADDRESSES[network];
  const USDC_address = addresses.USDC.address;
  const USDT_address = addresses.USDT.address;
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);

  const rpcUrlArchive = `${process.env.ALCHEMY_URL_GOERLI}`;
  const balances = [
    parseFixed('100000', 6).toString(),
    parseFixed('100000', 6).toString(),
  ];

  // This example uses a local hard fork which allows simulation without real balances, etc
  const { signer } = await setUpExample(
    rpcUrlArchive as string,
    rpcUrlLocal,
    network,
    [USDC_address, USDT_address],
    [addresses.USDC.slot, addresses.USDT.slot],
    balances,
    '',
    8200000
  );
  const signerAddress = await signer.getAddress();

  const poolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    tokenAddresses: [USDC_address, USDT_address],
    weights: [`${0.2e18}`, `${0.8e18}`],
    swapFeeEvm: `${1e16}`,
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
    tokensIn: [USDC_address, USDT_address],
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
