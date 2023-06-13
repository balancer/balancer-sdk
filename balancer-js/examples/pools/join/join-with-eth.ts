/**
 * Example showing how to use Pools module to join pools with ETH.
 * Note: same as join.ts but adding the `value` parameter to the transaction
 * 
 * Run with:
 * yarn example ./examples/pools/join/eth-join.ts
 */
import {
  BalancerSDK,
  Network,
} from '@balancer-labs/sdk'
import { AddressZero } from '@ethersproject/constants'
import { approveToken, getTokenBalance, reset, setTokenBalance } from 'examples/helpers'

async function join() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  })

  const { provider } = balancer
  const signer = provider.getSigner()
  const address = await signer.getAddress()

  // 50/50 WBTC/WETH Pool
  const pool = await balancer.pools.find('0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e')
  if (!pool) throw Error('Pool not found')

  // Tokens that will be provided to pool by joiner
  const tokensIn = [
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    AddressZero, // ETH
  ]

  // Slots used to set the account balance for each token through hardhat_setStorageAt
  // Info fetched using npm package slot20
  const slots = [0]

  const amountsIn = ['10000000', '1000000000000000000']

  // Prepare local fork for simulation
  await reset(provider, 17000000)
  await setTokenBalance(provider, address, tokensIn[0], amountsIn[0], slots[0])
  await approveToken(tokensIn[0], balancer.contracts.vault.address, amountsIn[0], signer)

  // Checking balances to confirm success
  const btcBefore = String(await getTokenBalance(tokensIn[0], address, provider))

  // Build join transaction
  const slippage = '100' // 100 bps = 1%
  const { to, data, minBPTOut } = pool.buildJoin(
    address,
    tokensIn,
    amountsIn,
    slippage
  )

  // Calculate price impact
  const priceImpact = await pool.calcPriceImpact(amountsIn, minBPTOut, true)

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    value: amountsIn[1],
    // gasPrice: '6000000000', // gas inputs are optional
    // gasLimit: '2000000', // gas inputs are optional
  })

  await transactionResponse.wait()

  const btcAfter = String(await getTokenBalance(tokensIn[0], address, provider))

  console.log('Balances before exit:        ', btcBefore)
  console.log('Balances after exit:         ', btcAfter)
  console.log('Min BPT expected after exit: ', [minBPTOut.toString()])
  console.log('Price impact:                ', priceImpact.toString())
}

join()
