/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/liquidity.polygon.ts
 */
import dotenv from 'dotenv'
import { BalancerSDK } from '@/.'

dotenv.config()

const sdk = new BalancerSDK({
  network: 137,
  rpcUrl: `${process.env.ALCHEMY_URL?.replace(
    'eth-mainnet',
    'polygon-mainnet.g'
  )}`,
})

const { pools } = sdk

const main = async () => {
  const pool = await pools.find(
    '0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba'
  )

  if (pool) {
    const liquidity = await pools.liquidity(pool)
    console.log(pool.id, pool.poolType, pool.totalLiquidity, liquidity)
  }
}

main()
