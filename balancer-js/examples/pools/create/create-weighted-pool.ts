/**
 * Weighted - Create and do an initial join.
 *
 * Run command:
 * yarn example ./examples/pools/create/create-weighted-pool.ts
 */
import { BalancerSDK, Network, PoolType } from '@balancer-labs/sdk';
import { reset, setTokenBalance, approveToken } from 'examples/helpers';
import { AddressZero } from '@ethersproject/constants';
import { parseFixed } from '@ethersproject/bignumber';

async function createAndInitJoinWeightedPool() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });

  // Setup join parameters
  const signer = balancer.provider.getSigner();
  const ownerAddress = await signer.getAddress();
  const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const usdt = '0xdac17f958d2ee523a2206206994597c13d831ec7';
  const poolTokens = [usdc, usdt];
  const amountsIn = [
    parseFixed('1000000000', 6).toString(),
    parseFixed('1000000000', 6).toString(),
  ];

  // Prepare local fork for simulation
  await reset(balancer.provider, 17347414);
  await setTokenBalance(
    balancer.provider,
    ownerAddress,
    poolTokens[0],
    amountsIn[0],
    9
  );
  await setTokenBalance(
    balancer.provider,
    ownerAddress,
    poolTokens[1],
    amountsIn[1],
    2
  );
  await approveToken(
    poolTokens[0],
    balancer.contracts.vault.address,
    amountsIn[0],
    signer
  );
  await approveToken(
    poolTokens[1],
    balancer.contracts.vault.address,
    amountsIn[1],
    signer
  );

  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);

  const poolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    tokenAddresses: [usdc, usdt],
    normalizedWeights: [
      parseFixed('0.2', 18).toString(),
      parseFixed('0.8', 18).toString(),
    ],
    rateProviders: [AddressZero, AddressZero],
    swapFeeEvm: parseFixed('1', 16).toString(),
    owner: ownerAddress,
  };

  // Build the create transaction
  const { to, data } = weightedPoolFactory.create(poolParameters);

  // Send the create transaction
  const receipt = await (
    await signer.sendTransaction({
      from: ownerAddress,
      to,
      data,
    })
  ).wait();

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await weightedPoolFactory.getPoolAddressAndIdWithReceipt(
      signer.provider,
      receipt
    );

  // Build initial join of pool
  const initJoinParams = weightedPoolFactory.buildInitJoin({
    joiner: ownerAddress,
    poolId,
    poolAddress,
    tokensIn: [usdc, usdt],
    amountsIn: [
      parseFixed('2000', 6).toString(),
      parseFixed('8000', 6).toString(),
    ],
  });

  // Sending initial join transaction
  await signer.sendTransaction({
    to: initJoinParams.to,
    data: initJoinParams.data,
  });

  // Check that pool balances are as expected after join
  const tokens = await balancer.contracts.vault.getPoolTokens(poolId);
  console.log('Pool Tokens Addresses: ' + tokens.tokens);
  console.log('Pool Tokens balances: ' + tokens.balances);
}

createAndInitJoinWeightedPool();
