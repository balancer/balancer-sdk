import { BalancerSDK } from '@/.'

// Mainnet SDK
const mainnetSdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
});

// SDK
const sdk = new BalancerSDK({
  network: 137,
  rpcUrl: 'https://polygon-rpc.com',
});

(async () => {
  if (!sdk.data.liquidityGauges || !sdk.data.gaugeShares || !mainnetSdk.contracts.veBal || !mainnetSdk.contracts.veBalProxy) {
    return
  }
  // 1. Get the gauges
  const gauges = await sdk.data.liquidityGauges.fetch()
  console.log(gauges.length, 'gauges')

  // 2. BAL and other reward token
  console.log('rewardTokens', gauges[0].rewardTokens)

  // New gauges will use inflation rate [amount per second]
  console.log('inflationRate', gauges[0].balInflationRate)

  // 4. user gauge balancesGaugeSharesRepository
  const user = '0x00000001b01122945d67cf7c972f1a2063ca4008'
  const userShare = await sdk.data.gaugeShares.findByUser(user)
  console.log(userShare)

  // 5. get veBal total supply
  const veBalTotal = await mainnetSdk.contracts.veBal.getLockInfo(user)
  console.log('veBal Total Supply', veBalTotal?.totalSupply)

  // 6. user's veBAL balance
  const veBalUser = await mainnetSdk.contracts.veBalProxy.getAdjustedBalance(user)
  console.log('User\'s veBal supply', veBalUser)

  // 6. boost calc
  // https://github.com/balancer/frontend-v2/blob/eacf6696bcd95a987885048f8f68546733b832d2/src/services/staking/staking-rewards.service.ts#L74

  /**
   * calcUserBoost
   *
   * Pure function for calculating a user's boost for a given gauge.
   * See: https://www.notion.so/veBAL-Boost-7a2ae8b6c8ff470f9dbe5b6bab4ff989#3037cbd3f619457681d63627db92541a
   *
   * @param {string} userGaugeBalance - User's balance in gauge.
   * @param {string} gaugeTotalSupply - The gauge's total supply.
   * @param {string} userVeBALBalance - User's veBAL balance.
   * @param {string} veBALTotalSupply - veBAL total supply.
   * @returns User's boost value for given gauge.
   */
  // calcUserBoost({
  //   userGaugeBalance,
  //   gaugeTotalSupply,
  //   userVeBALBalance,
  //   veBALTotalSupply,
  // }: {
  //   userGaugeBalance: string
  //   gaugeTotalSupply: string
  //   userVeBALBalance: string
  //   veBALTotalSupply: string
  // }): string {
  //   const _userGaugeBalance = bnum(userGaugeBalance)
  //   const _gaugeTotalSupply = bnum(gaugeTotalSupply)
  //   const _userVeBALBalance = bnum(userVeBALBalance)
  //   const _veBALTotalSupply = bnum(veBALTotalSupply)
  //   const boost = bnum(1).plus(
  //     bnum(1.5)
  //       .times(_userVeBALBalance)
  //       .div(_veBALTotalSupply)
  //       .times(_gaugeTotalSupply)
  //       .div(_userGaugeBalance)
  //   )
  //   const minBoost = bnum(2.5).lt(boost) ? 2.5 : boost

  //   return minBoost.toString()
  // }

})();
