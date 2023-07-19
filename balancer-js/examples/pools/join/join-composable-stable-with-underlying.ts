/**
 * This example shows how to use the SDK generalisedJoin method.
 *
 * It depends on a forked mainnet node running on localhost:8545
 *
 * Use the following command to start a forked mainnet node:
 *   anvil --fork-url https://rpc.ankr.com/eth --fork-block-number 16411000 --fork-chain-id 1
 *   or
 *   npx hardhat node --fork https://rpc.ankr.com/eth --fork-block-number 16411000
 *
 * Generalised Joins are used to join a ComposableStable that has nested pools, e.g.:
 *
 *               CS0
 *            /        \
 *          CS1        CS2
 *        /    \      /   \
 *      DAI   USDC  USDT  FRAX
 *
 * The example joins the USD stable pool with DAI for decimals convinience.
 * However the pool can be joined with any other token or composition of tokens.
 *
 * Expected frontend (FE) flow:
 * 1. User selects tokens and amounts to join a pool
 * 2. FE calls joinGeneralised with simulation type Tenderly or VaultModel
 * 3. SDK calculates expectedAmountOut that is at least 99% accurate
 * 4. User agrees expectedAmountOut and approves relayer
 * 5. With approvals in place, FE calls joinGeneralised with simulation type Static
 * 6. SDK calculates expectedAmountOut that is 100% accurate
 * 7. SDK returns joinGeneralised transaction data with proper minAmountsOut limits in place
 * 8. User is now able to submit a safe transaction to the blockchain
 *
 * Run with:
 * yarn example ./examples/pools/join/join-composable-stable-with-underlying.ts
 */
import { BalancerSDK, Relayer, SimulationType } from '@balancer-labs/sdk';
import { parseEther } from '@ethersproject/units';
import {
  approveToken,
  printLogs,
  reset,
  setTokenBalance,
} from 'examples/helpers';

// Joining bbaUSD2 pool with DAI
const poolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const amount = parseEther('1000').toString();

const balancer = new BalancerSDK({
  network: 1,
  rpcUrl: 'http://127.0.0.1:8545',
  subgraphQuery: {
    args: {
      where: {
        address: {
          in: [
            '0xa13a9247ea42d743238089903570127dda72fe44', // bbausd2
            '0xae37d54ae477268b9997d4161b96b8200755935c', // bbadai
          ],
        },
      },
    },
    attrs: {},
  },
});

const { provider, contracts } = balancer;
const signer = provider.getSigner();

/**
 * Get some DAI to the signer and approve the vault to move it on our behalf.
 * This is only needed for the example to work, in a real world scenario the signer
 * would already have DAI and the vault would already be approved.
 */
async function setup(address: string) {
  await reset(provider, 17700000);
  await setTokenBalance(provider, address, dai, amount, 2);
  await approveToken(dai, contracts.vault.address, amount, signer);
}

async function join() {
  const address = await signer.getAddress();

  setup(address);

  // Here we join with DAI, but we could join with any other token or combination of tokens
  const tokensIn = [dai];
  const amountsIn = [amount];
  const slippage = '100'; // 100 bps = 1%

  // Use SDK to create join using either Tenderly or VaultModel simulation
  // Note that this does not require authorisation to be defined
  const { expectedOut } = await balancer.pools.generalisedJoin(
    poolId,
    tokensIn,
    amountsIn,
    address,
    slippage,
    signer,
    SimulationType.VaultModel
  );

  // User reviews expectedAmountOut
  console.log('Expected BPT out - VaultModel: ', expectedOut);

  // Need to sign the approval only once per relayer
  const relayerAuth = await Relayer.signRelayerApproval(
    contracts.relayer.address,
    address,
    signer,
    contracts.vault
  );

  // Use SDK to create join callData
  const query = await balancer.pools.generalisedJoin(
    poolId,
    tokensIn,
    amountsIn,
    address,
    slippage,
    signer,
    SimulationType.VaultModel,
    relayerAuth
  );

  // Join
  const joinReciept = await (
    await signer.sendTransaction({
      to: query.to,
      data: query.encodedCall,
      gasLimit: 8e6,
    })
  ).wait();

  await printLogs(joinReciept.logs);
}

join();
