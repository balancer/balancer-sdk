/**
 * This example shows how to the adjusted veBAL balance from the active boost delegation contract
 *
 * How to run:
 * yarn run example examples/contracts/veBAL-proxy.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.GOERLI,
  rpcUrl: 'https://rpc.ankr.com/eth_goerli',
});

const { veBalProxy } = sdk.contracts;

async function main() {
  const USER = '0x91F450602455564A64207414c7Fbd1F1F0EbB425';
  const balance = await veBalProxy?.getAdjustedBalance(USER);
  console.log("User's veBAL adjusted balance", balance);
}

main();
