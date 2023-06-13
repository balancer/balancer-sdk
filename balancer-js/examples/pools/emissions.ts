/**
 * Display weekly BAL emissions for a pool
 * 
 * How to run:
 * yarn example examples/pools/emissions.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk'

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
})

const { pools } = sdk

const main = async () => {
  if (pools.emissionsService) {
    const emissions = await pools.emissionsService.weekly('0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080')
    console.log(emissions)
  }
}

main()
