/**
 * Shows how to exit a pool in recovery mode.
 *
 * Run command:
 * yarn example ./examples/pools/exit/recovery-exit.ts
 */
import {
  BalancerSDK,
  removeItem,
  Network,
  truncateAddresses,
} from '@balancer-labs/sdk';
import { parseEther } from '@ethersproject/units';
import { getTokenBalance, reset, setTokenBalance } from 'examples/helpers';

async function recoveryExit() {
  const poolId =
    '0x20b156776114e8a801e9767d90c6ccccc8adf398000000000000000000000499';
  const blockNo = 17700000;

  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });
  const { poolsOnChain, pools } = balancer.data;

  // Setup exit parameters
  const signer = balancer.provider.getSigner();
  const userAddress = await signer.getAddress();

  const bptAmount = String(parseEther('1'));
  const slippage = '200'; // 200 bps = 2%

  // Use SDK to find pool info
  let pool = await pools.find(poolId);
  if (!pool) throw 'POOL_DOESNT_EXIST';

  // Prepare local fork for simulation
  await reset(balancer.provider, blockNo);
  await setTokenBalance(
    balancer.provider,
    userAddress,
    pool.address,
    bptAmount,
    0
  );

  // Refresh pool data from chain before building and sending tx
  pool = await poolsOnChain.refresh(pool);

  // Build transaction
  const { to, data, expectedAmountsOut, minAmountsOut } =
    balancer.pools.buildRecoveryExit({
      pool,
      bptAmount,
      userAddress,
      slippage,
    });

  // Send transaction
  await signer.sendTransaction({ to, data });

  // Refresh pool data from chain before building and sending tx
  pool = await poolsOnChain.refresh(pool);

  const bptIndex = pool.tokensList.indexOf(pool.address);
  const tokensWithoutBpt =
    bptIndex === -1 ? pool.tokensList : removeItem(pool.tokensList, bptIndex);
  // Check balances after transaction to confirm success
  const balances = await Promise.all([
    ...tokensWithoutBpt.map((token) =>
      getTokenBalance(token, userAddress, balancer.provider)
    ),
    getTokenBalance(pool.address, userAddress, balancer.provider),
  ]);

  console.table({
    tokensOut: truncateAddresses(tokensWithoutBpt),
    minAmountsOut: minAmountsOut,
    expectedAmountsOut: expectedAmountsOut,
    amountsOut: removeItem(balances, balances.length - 1).map((b) =>
      b.toString()
    ),
  });
  console.log(`BPT Balance: `, balances[balances.length - 1].toString());
}

recoveryExit();
