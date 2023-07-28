/**
 * This example shows how to use the FeeDistributor contract to claim rewards
 *
 * How to run:
 * yarn example examples/data/fee-distributor.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: 'https://rpc.ankr.com/eth',
});

const { feeDistributor } = sdk.data;

const claimableTokens: string[] = [
  '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
  '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
  '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
];

const userAddress = '0x549c660ce2B988F588769d6AD87BE801695b2be3';

(async function () {
  if (!feeDistributor) throw new Error('feeDistributor not defined');
  const data = await feeDistributor.getClaimableBalances(
    userAddress,
    claimableTokens
  );
  console.table(data);

  const callData = feeDistributor.claimBalances(userAddress, claimableTokens);
  console.log(
    `Encoded Callable: ${callData.slice(0, 10)}...${callData.slice(-5)}`
  );
  console.log(`
  const tx = { to: '${sdk.networkConfig.addresses.contracts.feeDistributor}', data: callData };
  const receipt = await (await signer.sendTransaction(tx)).wait();
  `);
})();
