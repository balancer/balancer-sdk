/**
 * This example shows how to use the SDK generalisedJoin method.
 * It depends on a forked mainnet node running on localhost:8545
 * Use the following command to start a forked mainnet node:
 *   anvil --fork-url https://rpc.ankr.com/eth --fork-block-number 16411000 --fork-chain-id 1
 *   or
 *   npx hardhat node --fork https://rpc.ankr.com/eth --fork-block-number 16411000
 *
 * When node is running, run this example with:
 *   yarn examples:run ./examples/joinGeneralisedComposableStable.ts
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
 */

import { JsonRpcProvider } from '@ethersproject/providers';
import { parseEther } from '@ethersproject/units';
import { printLogs } from './helpers';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BalancerSDK, Network } from '@/.';
import { SimulationType } from '@/modules/simulation/simulation.module';

const network = Network.MAINNET;
const blockNumber = 16411000;
const jsonRpcUrl = 'https://rpc.ankr.com/eth';
const rpcUrl = 'http://127.0.0.1:8545';

const poolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const amount = parseEther('1000').toString();

const balancer = new BalancerSDK({
  network,
  rpcUrl,
  subgraphQuery: {
    args: {
      where: {
        address: {
          in: [
            '0xa13a9247ea42d743238089903570127dda72fe44',
            '0xae37d54ae477268b9997d4161b96b8200755935c',
          ],
        },
      },
    },
    attrs: {},
  },
});

const { provider, contracts } = balancer;
const { ERC20 } = contracts;
const signer = (provider as JsonRpcProvider).getSigner();

/**
 * Get some DAI to the signer and approve the vault to move it on our behalf.
 * This is only needed for the example to work, in a real world scenario the signer
 * would already have DAI and the vault would already be approved.
 *
 * @param signerAddress
 */
async function getTokens(signerAddress: string): Promise<void> {
  await signer.provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber,
      },
    },
  ]);

  // Lets impersonate Binance with loads of DAI and transfer some to the signer
  await signer.provider.send('hardhat_impersonateAccount', [
    '0xF977814e90dA44bFA03b6295A0616a897441aceC',
  ]);
  const binance = signer.provider.getSigner(
    '0xF977814e90dA44bFA03b6295A0616a897441aceC'
  );

  await (await ERC20(dai, binance).transfer(signerAddress, amount)).wait();

  await (
    await ERC20(dai, signer).approve(contracts.vault.address, amount)
  ).wait();
}

async function join() {
  const signerAddress = await signer.getAddress();
  await getTokens(signerAddress);

  // Need to sign the approval only once per relayer
  const relayerAuth = await Relayer.signRelayerApproval(
    contracts.relayerV4?.address as string,
    signerAddress,
    signer,
    contracts.vault
  );

  const wrapLeafTokens = false;
  const slippage = '100'; // 100 bps = 1%

  // Here we join with DAI, but we could join with any other token or combination of tokens
  const tokensIn = [dai];
  const amountsIn = [amount];

  // Use SDK to create join callData
  const query = await balancer.pools.generalisedJoin(
    poolId,
    tokensIn,
    amountsIn,
    signerAddress,
    wrapLeafTokens,
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
    })
  ).wait();

  await printLogs(joinReciept.logs);
}

join();
