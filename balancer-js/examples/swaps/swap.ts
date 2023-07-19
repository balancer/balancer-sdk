/**
 * How to build a swap and send it using ethers.js
 * 
 * How to run:
 * yarn example examples/swaps/swap.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk'
import { formatFixed } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { reset } from 'examples/helpers/forked-utils'

const tokenIn = AddressZero // eth
const tokenOut = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' // wBTC
const amount = String(BigInt(100e18)) // 100 eth

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: `http://127.0.0.1:8545`, // Uses a local fork for simulating transaction sending.
})

const { swaps } = sdk

const erc20Out = sdk.contracts.ERC20(tokenOut, sdk.provider)

async function swap() {
  await reset(sdk.provider)

  const signer = sdk.provider.getSigner()
  const account = await signer.getAddress()

  // Finding a trading route rely on on-chain data.
  // fetchPools will fetch the current data from the subgraph.
  // Let's fetch just 5 pools with highest liquidity of tokenOut.
  await swaps.fetchPools({
    first: 5,
    where: {
      swapEnabled: {
        eq: true,
      },
      tokensList: {
        contains: [tokenOut],
      },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
  })

  // Set exectution deadline to 60 seconds from now
  const deadline = String(Math.ceil(Date.now() / 1000) + 60)

  // Avoid getting rekt by setting low slippage from expected amounts out, 10 bsp = 0.1%
  const maxSlippage = 10

  // Building the route payload
  const payload = await swaps.buildRouteExactIn(
    account,
    account,
    tokenIn,  // eth
    tokenOut, // wBTC
    amount,
    {
      maxSlippage,
      deadline
    }
  )

  // Extract parameters required for sendTransaction
  const { to, data, value } = payload

  // Execution with ethers.js
  try {
    const balanceBefore = await erc20Out.balanceOf(account)

    await (
      await signer.sendTransaction({
        to,
        data,
        value,
      })
    ).wait()

    // check delta
    const balanceAfter = await erc20Out.balanceOf(account)

    console.log(
      `Amount of BTC received: ${formatFixed(
        balanceAfter.sub(balanceBefore),
        8
      )}`
    )
  } catch (err) {
    console.log(err)
  }
}

swap()
