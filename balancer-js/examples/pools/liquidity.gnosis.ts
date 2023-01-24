/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/liquidity.gnosis.ts
 */
import { BalancerSDK } from '@/.'

const sdk = new BalancerSDK({
  network: 100,
  rpcUrl: 'https://rpc.ankr.com/gnosis',
})

const { pools } = sdk

const main = async () => {
  const pool = await pools.find(
    '0x0503dd6b2d3dd463c9bef67fb5156870af63393e000200000000000000000003'
  )

  if (pool) {
    const liquidity = await pools.liquidity(pool)
    console.log(pool.id, pool.poolType, pool.totalLiquidity, liquidity)
  }
}

main()
