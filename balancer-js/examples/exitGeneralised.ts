// yarn examples:run ./examples/exitGeneralised.ts
import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  truncateAddresses,
} from '../src/index';
import { forkSetup, sendTransactionGetBalances } from '../src/test/lib/utils';
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

const network = Network.ARBITRUM;
const jsonRpcUrl = process.env.ALCHEMY_URL_ARBITRUM;
const blockNumber = 89431060;
const rpcUrl = 'http://127.0.0.1:8161';

const addresses = ADDRESSES[network];

// bb-a-usd
const testPool = addresses.bbUSD_PLUS;

// Amount of testPool BPT that will be used to exit
const amount = parseFixed('2', testPool.decimals).toString();

// Setup local fork with correct balances/approval to exit bb-a-usd2 pool
const setUp = async (provider: JsonRpcProvider) => {
  const signer = provider.getSigner();

  const mainTokens = [testPool.address];
  const mainInitialBalances = [amount];
  const mainSlots = [testPool.slot];

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

  /**
   * Example of subgraph query that allows filtering pools.
   * Might be useful to reduce the response time by limiting the amount of pool
   * data that will be queried by the SDK. Specially when on chain data is being
   * fetched as well.
   */
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
    subgraphQuery,
  });

  // Use SDK to create exit transaction
  const { expectedAmountsOut, tokensOut } =
    await balancer.pools.generalisedExit(
      testPool.id,
      amount,
      signerAddress,
      slippage,
      signer,
      SimulationType.VaultModel,
      undefined
    );

  // User reviews expectedAmountOut
  console.log(' -- Simulating using Vault Model -- ');
  console.log(signerAddress);

  console.table({
    tokensOut: truncateAddresses([testPool.address, ...tokensOut]),
    expectedAmountsOut: ['0', ...expectedAmountsOut],
  });

  // User approves relayer
  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );
  const relayerAuth = await Relayer.signRelayerApproval(
    contractAddresses.relayer,
    signerAddress,
    signer,
    contracts.vault
  );

  // Use SDK to create exit transaction
  const query = await balancer.pools.generalisedExit(
    testPool.id,
    amount,
    signerAddress,
    slippage,
    signer,
    SimulationType.Static,
    relayerAuth
  );

  // Submit transaction and check balance deltas to confirm success
  const { balanceDeltas } = await sendTransactionGetBalances(
    [testPool.address, ...query.tokensOut],
    signer,
    signerAddress,
    query.to,
    query.encodedCall
  );

  console.log(' -- Simulating using Static Call -- ');
  console.log('Price impact: ', formatFixed(query.priceImpact, 18));
  console.table({
    tokensOut: truncateAddresses([testPool.address, ...query.tokensOut]),
    minAmountsOut: ['0', ...query.minAmountsOut],
    expectedAmountsOut: ['0', ...query.expectedAmountsOut],
    balanceDeltas: balanceDeltas.map((b) => b.toString()),
  });
};

exit();
