/**
 * Shows how to exit a pool in recovery mode.
 * 
 * Run command:
 * yarn example ./examples/pools/exit/recovery-exit.ts
 */
import {
  BalancerSDK,
  insert,
  Network,
  truncateAddresses,
} from '@balancer-labs/sdk'
import { parseEther } from '@ethersproject/units'
import { getTokenBalance, reset, setTokenBalance } from 'examples/helpers'

async function recoveryExit() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  })

  // Setup exit parameters
  const signer = balancer.provider.getSigner()
  const address = await signer.getAddress()

  const poolId =
    // '0x50cf90b954958480b8df7958a9e965752f62712400000000000000000000046f'; // bb-e-usd
    // '0xd4e7c1f3da1144c9e2cfd1b015eda7652b4a439900000000000000000000046a'; // bb-e-usdc
    // '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d'; // bb-a-usd
    '0xa718042e5622099e5f0ace4e7122058ab39e1bbe000200000000000000000475'; // 50temple_50bb-e-usd

  const bptIn = String(parseEther('1'))
  const slippage = '200'; // 200 bps = 2%

  // Use SDK to find pool info
  const pool = await balancer.pools.find(poolId)
  if (!pool) throw 'POOL_DOESNT_EXIST'

  // Prepare local fork for simulation
  await reset(balancer.provider, 16819888)
  await setTokenBalance(balancer.provider, address, pool.address, bptIn, 0)

  // Build transaction
  const { to, data, expectedAmountsOut, minAmountsOut } =
    pool.buildRecoveryExit(address, bptIn, slippage)

  // Send transaction
  await signer.sendTransaction({ to, data })

  // Check balances after transaction to confirm success
  const balances = await Promise.all(
    pool.tokensList.map((token) =>
      getTokenBalance(token, address, balancer.provider)
    )
  )

  console.table({
    tokensOut: truncateAddresses(pool.tokensList),
    minAmountsOut: insert(minAmountsOut, pool.bptIndex, bptIn),
    expectedAmountsOut: insert(expectedAmountsOut, pool.bptIndex, bptIn),
    amountsOut: balances.map((b) => b.toString()),
  })
}

recoveryExit()
