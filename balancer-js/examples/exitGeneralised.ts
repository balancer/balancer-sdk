// yarn examples:run ./examples/exitGeneralised.ts
import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, GraphQLQuery, GraphQLArgs, Network } from '../src/index';
import { forkSetup, getBalances } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';
import { Relayer } from '../src/modules/relayer/relayer.module';
import { Contracts } from '../src/modules/contracts/contracts.module';
import { SimulationType } from '../src/modules/simulation/simulation.module';

// Expected frontend (FE) flow:
// 1. User selects BPT amount to exit a pool
// 2. FE calls exitGeneralised with simulation type VaultModel
// 3. SDK calculates expectedAmountsOut that is at least 99% accurate
// 4. User agrees expectedAmountsOut and approves relayer
// 5. With approvals in place, FE calls exitGeneralised with simulation type Static
// 6. SDK calculates expectedAmountsOut that is 100% accurate
// 7. SDK returns exitGeneralised transaction data with proper minAmountsOut limits in place
// 8. User is now able to submit a safe transaction to the blockchain

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
const setUp = async (provider: JsonRpcProvider) => {
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
};

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
const exit = async () => {
  const provider = new JsonRpcProvider(rpcUrl, network);
  // Local fork setup
  await setUp(provider);

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

  // Example of subgraph query that allows filtering pools
  const poolAddresses = Object.values(addresses).map(
    (address) => address.address
  );
  const subgraphArgs: GraphQLArgs = {
    where: {
      swapEnabled: {
        eq: true,
      },
      totalShares: {
        gt: 0.000000000001,
      },
      address: {
        in: poolAddresses,
      },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
    block: { number: blockNumber },
  };
  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
    customSubgraphUrl:
      'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta',
    tenderly: tenderlyConfig,
    subgraphQuery,
  });

  // Use SDK to create exit transaction
  const { expectedAmountsOut } = await balancer.pools.generalisedExit(
    bbausd2.id,
    amount,
    signerAddress,
    slippage,
    signer,
    SimulationType.VaultModel,
    undefined
  );

  // User reviews expectedAmountOut
  console.log('Expected amounts out - VaultModel: ', expectedAmountsOut);

  // User approves relayer
  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );
  const relayerAuth = await Relayer.signRelayerApproval(
    contractAddresses.relayerV4 as string,
    signerAddress,
    signer,
    contracts.vault
  );

  // Use SDK to create exit transaction
  const query = await balancer.pools.generalisedExit(
    bbausd2.id,
    amount,
    signerAddress,
    slippage,
    signer,
    SimulationType.Static,
    relayerAuth
  );

  // Checking balances before to confirm success
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
    data: query.encodedCall,
  });

  // Checking balances after to confirm success
  await transactionResponse.wait();
  const tokenBalancesAfter = (
    await getBalances(
      [bbausd2.address, ...query.tokensOut],
      signer,
      signerAddress
    )
  ).map((b) => b.toString());

  console.table({
    balancesBefore: tokenBalancesBefore,
    balancesAfter: tokenBalancesAfter,
    expectedAmountsOut: ['0', ...query.expectedAmountsOut],
    minAmountsOut: ['0', ...query.minAmountsOut],
  });
};

exit();
