import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, Network } from '../src/index';
import { forkSetup, getBalances } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';
import { Relayer } from '../src/modules/relayer/relayer.module';
import { Contracts } from '../src/modules/contracts/contracts.module';

dotenv.config();

const {
  ALCHEMY_URL_GOERLI: jsonRpcUrl,
  TENDERLY_ACCESS_KEY,
  TENDERLY_PROJECT,
  TENDERLY_USER,
} = process.env;
const network = Network.GOERLI;
const blockNumber = 7890980;
const rpcUrl = 'http://127.0.0.1:8000';
const addresses = ADDRESSES[network];
const bbausd2 = {
  id: addresses.bbausd2?.id as string,
  address: addresses.bbausd2?.address as string,
  decimals: addresses.bbausd2?.decimals,
  slot: addresses.bbausd2?.slot as number,
};

// Setup local fork with correct balances/approval to exit bb-a-usd2 pool
async function setUp(provider: JsonRpcProvider): Promise<string> {
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const mainTokens = [bbausd2.address];
  const mainInitialBalances = [parseFixed('10', bbausd2.decimals).toString()];
  const mainSlots = [bbausd2.slot];

  await forkSetup(
    signer,
    mainTokens,
    mainSlots,
    mainInitialBalances,
    jsonRpcUrl as string,
    blockNumber
  );

  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );

  return await Relayer.signRelayerApproval(
    contractAddresses.relayerV4 as string,
    signerAddress,
    signer,
    contracts.vault
  );
}

/*
Example showing how to use the SDK generalisedExit method.
This allows exiting a ComposableStable that has nested pools, e.g.:
                  CS0
              /        \
            CS1        CS2
          /    \      /   \
         DAI   USDC  USDT  FRAX

Can exit with CS0_BPT proportionally to: DAI, USDC, USDT and FRAX
*/
async function exit() {
  const provider = new JsonRpcProvider(rpcUrl, network);
  // Local fork setup
  const relayerAuth = await setUp(provider);

  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const slippage = '100'; // 100 bps = 1%

  // Here we exit with bb-a-usd BPT
  const amount = parseFixed('10', bbausd2.decimals).toString();

  // Custom Tenderly configuration parameters - remove in order to use default values
  const tenderlyConfig = {
    accessKey: TENDERLY_ACCESS_KEY as string,
    user: TENDERLY_USER as string,
    project: TENDERLY_PROJECT as string,
    blockNumber,
  };

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
    customSubgraphUrl:
      'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta',
    tenderly: tenderlyConfig,
  });

  // Use SDK to create exit transaction
  const query = await balancer.pools.generalisedExit(
    bbausd2.id,
    amount,
    signerAddress,
    slippage,
    relayerAuth
  );

  // Checking balances to confirm success
  const tokenBalancesBefore = (
    await getBalances(
      [bbausd2.address, ...query.tokensOut],
      signer,
      signerAddress
    )
  ).map((b) => b.toString());

  // Submit exit tx
  const transactionResponse = await signer.sendTransaction({
    to: query.to,
    data: query.callData,
  });

  await transactionResponse.wait();
  const tokenBalancesAfter = (
    await getBalances(
      [bbausd2.address, ...query.tokensOut],
      signer,
      signerAddress
    )
  ).map((b) => b.toString());

  console.log('Balances before exit:    ', tokenBalancesBefore);
  console.log('Balances after exit:     ', tokenBalancesAfter);
  console.log('Expected amounts out:    ', [...query.expectedAmountsOut]);
  console.log('Min amounts out:         ', [...query.minAmountsOut]);
}

// yarn examples:run ./examples/exitGeneralised.ts
exit();
