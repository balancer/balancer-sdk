/**
 * Shows how to interact with the veBAL contract
 *
 * How to run:
 * yarn run example examples/contracts/veBAL.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.GOERLI,
  rpcUrl: 'https://rpc.ankr.com/eth_goerli',
});

const { veBal } = sdk.contracts;

async function main() {
  if (!veBal) throw new Error('veBal address must be defined');

  const USER = '0x91F450602455564A64207414c7Fbd1F1F0EbB425';

  const lockInfo = await veBal.getLockInfo(USER);
  console.log('veBAL lock info for user', lockInfo);
}

main();
