/**
 * ComposableStable - Create and do an initial join.
 * 
 * Run command:
 * yarn example ./examples/pools/create/create-composable-stable-pool.ts
 */
import { BalancerSDK, Network, PoolType } from '@balancer-labs/sdk'
import { parseFixed } from '@ethersproject/bignumber'
import { reset, setTokenBalance, approveToken } from 'examples/helpers'

async function createAndInitJoinComposableStable() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });

  // Setup join parameters
  const signer = balancer.provider.getSigner()
  const ownerAddress = await signer.getAddress()
  const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  const usdt = '0xdac17f958d2ee523a2206206994597c13d831ec7'
  const poolTokens = [usdc, usdt]
  const amountsIn = [
    parseFixed('1000000000', 6).toString(),
    parseFixed('1000000000', 6).toString(),
  ];

  // Prepare local fork for simulation
  await reset(balancer.provider, 17700000)
  await setTokenBalance(balancer.provider, ownerAddress, poolTokens[0], amountsIn[0], 9)
  await setTokenBalance(balancer.provider, ownerAddress, poolTokens[1], amountsIn[1], 2)
  await approveToken(poolTokens[0], balancer.contracts.vault.address, amountsIn[0], signer)
  await approveToken(poolTokens[1], balancer.contracts.vault.address, amountsIn[1], signer)

  const composableStablePoolFactory = balancer.pools.poolFactory.of(
    PoolType.ComposableStable
  )

  const poolParameters = {
    name: 'Test-Name',
    symbol: 'Test-Symbol',
    tokenAddresses: poolTokens,
    amplificationParameter: '72',
    rateProviders: [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
    ],
    tokenRateCacheDurations: ['100', '100'],
    swapFeeEvm: parseFixed('1', 16).toString(),
    exemptFromYieldProtocolFeeFlags: [false, false],
    owner: ownerAddress,
  };

  // Build the create transaction
  const createInfo = composableStablePoolFactory.create(poolParameters);

  // Sends the create transaction
  const createTransactionReceipt = await (
    await signer.sendTransaction(createInfo)
  ).wait();

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await composableStablePoolFactory.getPoolAddressAndIdWithReceipt(
      signer.provider,
      createTransactionReceipt
    );

  // Build initial pool join transaction
  const joinInfo = composableStablePoolFactory.buildInitJoin({
    joiner: ownerAddress,
    poolId,
    poolAddress,
    tokensIn: poolTokens,
    amountsIn,
  });

  // Sends the initial join transaction
  await signer.sendTransaction({ to: joinInfo.to, data: joinInfo.data });

  // Check that pool balances are as expected after join
  const tokens = await balancer.contracts.vault.getPoolTokens(poolId);
  console.log('Pool Tokens Addresses (Includes BPT): ' + tokens.tokens);
  console.log('Pool Tokens balances (Includes BPT): ' + tokens.balances);
}

createAndInitJoinComposableStable();
