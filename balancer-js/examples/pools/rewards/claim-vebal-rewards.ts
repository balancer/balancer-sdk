/**
 * Example of how to claim vebal rewards from a gauge
 * 
 * Run with:
 * yarn example ./examples/pools/rewards/claim-vebal-rewards.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk'
import { reset } from 'examples/helpers'

const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3';
const claimableTokens: string[] = [
  '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
  '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
  '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
];

const sdk = new BalancerSDK(
  {
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545'
  })
const { provider, claimService } = sdk;

const main = async () => {
  await reset(provider, 16361617)

  if (!claimService) throw new Error("ClaimService not defined");

  const balance = await claimService.getClaimableVeBalTokens(userAddress, claimableTokens);
  console.table(balance);
  const data = await claimService.buildClaimVeBalTokensRequest(userAddress, claimableTokens);
  console.log(`
    to:                  ${data.to} - BalancerMinter Address ${sdk.networkConfig.addresses.contracts.feeDistributor}
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
}

main()
