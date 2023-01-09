/**
 * Display weekly BAL emissiosn for a pool
 * Run command: yarn examples:run ./examples/pools/emissions.ts
 */
import { BalancerSDK } from '@/.'

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
})

const { pools } = sdk

const main = async () => {
  if (pools.emissionsService) {
    const emissions = await pools.emissionsService.weekly('0x334c96d792e4b26b841d28f53235281cec1be1f200020000000000000000038a')
    console.log(emissions)
  }
}

main()
