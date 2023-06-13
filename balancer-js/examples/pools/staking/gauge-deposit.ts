/**
 * This example shows how to deposit liquidity in a liquidity gauge
 * 
 * Prerequisite: user must have approved the transfer of his LP tokens by the gauge
 * 
 * Note: this example uses a forked mainnet for illustraion purpose.
 * 
 * How to run:
 * npm run example examples/gauge-deposit.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';
import { reset, setTokenBalance } from 'examples/helpers'

const poolAddress = '0x32296969ef14eb0c6d29669c550d4a0449130230'
const gaugeAddress = '0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae'
const poolBalance = String(BigInt(1e18))

const main = async () => {
  const sdk = new BalancerSDK({
    network: 1,
    rpcUrl: `http://127.0.0.1:8545`
  });

  const { contracts, provider } = sdk
  const signer = provider.getSigner()
  const account = await signer.getAddress()

  // Setting up the forked state
  await reset(provider, 16940000)
  await setTokenBalance(provider, account, poolAddress, poolBalance, 0)
  await contracts.ERC20(poolAddress, signer).approve(gaugeAddress, poolBalance)

  const gauge = contracts.liquidityGauge(gaugeAddress, signer)

  let balance = await gauge.balanceOf(account)
  console.log('User balance before :', String(balance))

  console.log(`Deposing ${poolBalance} into the gauge. Wait ...`)
  await (await gauge['deposit(uint256)'](poolBalance)).wait()

  balance = await gauge.balanceOf(account)
  console.log('User balance after :', String(balance))
}

main()
