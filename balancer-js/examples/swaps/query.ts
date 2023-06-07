/**
 * Example showing how to find a swap for a pair and use queryBatchSwap to simulate result on the Vault.
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk'
import { parseFixed } from '@ethersproject/bignumber'

const balancer = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: 'https://rpc.ankr.com/eth',
})

const { swaps } = balancer

const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
const tokenOut = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0' // wstETH
const amount = parseFixed('1', 18)
const gasPrice = parseFixed('0', 18)

async function findSwapAndQueryTheVault() {
  // Fetch all pools for SOR to use
  await swaps.fetchPools();

  // Find a route for the swap
  const swapInfo = await swaps.findRouteGivenIn({
    tokenIn,
    tokenOut,
    amount,
    gasPrice,
    maxPools: 1
  })

  if (swapInfo.returnAmount.isZero()) {
    console.log('No Swap')
    return
  }

  // Simulates a call to `batchSwap`, returning an array of Vault asset deltas.
  const deltas = await swaps.queryExactIn(swapInfo)

  // Prints the asset deltas for the swap.
  // Positive values mean the user sending the asset to the vault, and negative is the amount received from the vault.
  // The asset deltas should be the same as the ones returned by `batchSwap`.
  console.log(deltas)
}

findSwapAndQueryTheVault()
