/**
 * Migrations module contains methods to migrate liquidity between pools
 * Run command: yarn examples:run ./examples/liquidity-managment/migrations.ts
 */
import { BalancerSDK } from '@/.'

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'http://127.0.0.1:8545', // Using a forked mainnet to be able to approve the relayer
})

const { provider, migrationService } = sdk

if (!migrationService) {
  throw new Error('No migrationService present')
}

const main = async () => {
  const user = '0x783596B9504Ef2752EFB2d4Aed248fDCb0d9FDab'
  const from = '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'
  const to = '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'
  const balance = await sdk.contracts.ERC20('0x32296969ef14eb0c6d29669c550d4a0449130230', provider).balanceOf(user)

  // To be able to perform a migration and a static call, user needs to approve the relayer first
  await provider.send('hardhat_impersonateAccount', [user])
  const signer = provider.getSigner(user)
  await sdk.contracts.vault.connect(signer).setRelayerApproval(user, migrationService.relayerAddress, true)

  // Query for the minimum amount of BPT to receive
  const peek = await migrationService.pool2pool(user, from, to, balance)
  const peekResult = await provider.call({ ...peek, from: user, gasLimit: 8e6 });
  const expectedBptOut = migrationService.getMinBptOut(peekResult);
  console.log('expectedBptOut', expectedBptOut.toString(), 'BPT')

  // Build the migration with the minimum amount of BPT to receive
  const txParams = await migrationService.pool2pool(user, from, to, balance, expectedBptOut)
  console.log(txParams.data)
}

main()
