/**
 * Example of how to claim rewards from a gauge
 * 
 * Run with:
 * yarn example ./examples/pools/rewards/claim-pools-rewards.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk'
import { reset } from 'examples/helpers'

const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3'

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: 'http://localhost:8545',
})

const { provider, claimService } = sdk

const main = async () => {
  await reset(provider, 16361617)

  if (!claimService) throw new Error("ClaimService not defined");

  const balanceGauges = await claimService.getClaimableRewardTokens(userAddress);
  console.table(balanceGauges.map((it) => it.claimableTokens));
  const gauges = balanceGauges.map((it) => it.address);
  let data = await claimService.buildClaimRewardTokensRequest(gauges.slice(0,1), userAddress);
  console.log(`\nSingle Gauge Claim ( gauge: ${gauges.slice(0,1)})
    to:                  ${data.to} - BalancerMinter Address ${sdk.networkConfig.addresses.contracts.balancerMinter}
    from:                ${data.from} - User Address ${userAddress}
    tokensOut:           ${data.tokensOut}
    expectedTokensValue: ${data.expectedTokensValue}
    functionName:        ${data.functionName}
    callData:            ${data.callData.slice(0, 10)}...${data.callData.slice(-5)}
  `)
  data = await claimService.buildClaimRewardTokensRequest(gauges, userAddress);
  console.log(`\nMultiple Gauges Claim
    to:                  ${data.to} - BalancerMinter Address ${sdk.networkConfig.addresses.contracts.balancerMinter}
    from:                ${data.from} - User Address ${userAddress}
    tokensOut:           ${data.tokensOut}
    expectedTokensValue: ${data.expectedTokensValue}
    functionName:        ${data.functionName}
    callData:            ${data.callData.slice(0, 10)}...${data.callData.slice(-5)}
  `)

  console.log(`\n\nfinally:
  
  const tx = { to: data.to', data: callData };
  const receipt = await (await signer.sendTransaction(tx)).wait();
  `)
};

main()