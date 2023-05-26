// yarn examples:run ./examples/joinGeneralised.ts
import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  truncateAddresses,
} from '../src/index';
import { forkSetup, getBalances } from '../src/test/lib/utils';
import { ADDRESSES } from '../src/test/lib/constants';
import { Relayer } from '../src/modules/relayer/relayer.module';
import { Contracts } from '../src/modules/contracts/contracts.module';
import { SimulationType } from '../src/modules/simulation/simulation.module';

// Expected frontend (FE) flow:
// 1. User selects tokens and amounts to join a pool
// 2. FE calls joinGeneralised with simulation type Tenderly or VaultModel
// 3. SDK calculates expectedAmountOut that is at least 99% accurate
// 4. User agrees expectedAmountOut and approves relayer
// 5. With approvals in place, FE calls joinGeneralised with simulation type Static
// 6. SDK calculates expectedAmountOut that is 100% accurate
// 7. SDK returns joinGeneralised transaction data with proper minAmountsOut limits in place
// 8. User is now able to submit a safe transaction to the blockchain

dotenv.config();

const RPC_URLS: Record<number, string> = {
  [Network.MAINNET]: `http://127.0.0.1:8545`,
  [Network.GOERLI]: `http://127.0.0.1:8000`,
  [Network.POLYGON]: `http://127.0.0.1:8137`,
  [Network.ARBITRUM]: `http://127.0.0.1:8161`,
};

const FORK_NODES: Record<number, string> = {
  [Network.MAINNET]: `${process.env.ALCHEMY_URL}`,
  [Network.GOERLI]: `${process.env.ALCHEMY_URL_GOERLI}`,
  [Network.POLYGON]: `${process.env.ALCHEMY_URL_POLYGON}`,
  [Network.ARBITRUM]: `${process.env.ALCHEMY_URL_ARBITRUM}`,
};

const network = Network.MAINNET;
const blockNumber = 16940624;
const addresses = ADDRESSES[network];
const jsonRpcUrl = FORK_NODES[network];
const rpcUrl = RPC_URLS[network];

const slippage = '100'; // 100 bps = 1%
const poolToJoin = addresses.bbausd2;
// Here we join with USDC and bbadai
const tokensIn = [addresses.USDC, addresses.bbadai];
const amountsIn = [
  parseFixed('10', tokensIn[0].decimals).toString(),
  parseFixed('10', tokensIn[1].decimals).toString(),
];

// Setup local fork with initial balances/approvals for tokens in
async function setUp(provider: JsonRpcProvider) {
  const signer = provider.getSigner();

  await forkSetup(
    signer,
    tokensIn.map((t) => t.address),
    tokensIn.map((t) => t.slot),
    amountsIn,
    jsonRpcUrl as string,
    blockNumber
  );
}

async function join() {
  const provider = new JsonRpcProvider(rpcUrl, network);
  // Local fork setup
  await setUp(provider);

  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

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

  // Use SDK to create join using either Tenderly or VaultModel simulation
  // Note that this does not require authorisation to be defined
  const { expectedOut } = await balancer.pools.generalisedJoin(
    poolToJoin.id,
    tokensIn.map((t) => t.address),
    amountsIn,
    signerAddress,
    slippage,
    signer,
    SimulationType.VaultModel
  );

  // User reviews expectedAmountOut
  console.log('Expected BPT out - VaultModel: ', expectedOut);

  // User approves relayer
  const { contracts, contractAddresses } = new Contracts(
    network as number,
    provider
  );
  const authorisation = await Relayer.signRelayerApproval(
    contractAddresses.balancerRelayer,
    signerAddress,
    signer,
    contracts.vault
  );

  // Use SDK to create join with Static simulation
  const query = await balancer.pools.generalisedJoin(
    poolToJoin.id,
    tokensIn.map((t) => t.address),
    amountsIn,
    signerAddress,
    slippage,
    signer,
    SimulationType.Static,
    authorisation
  );

  // Checking balances before to confirm success
  const tokenBalancesBefore = (
    await getBalances(
      [poolToJoin.address, ...tokensIn.map((t) => t.address)],
      signer,
      signerAddress
    )
  ).map((b) => b.toString());

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to: query.to,
    data: query.encodedCall,
  });

  // Checking balances after to confirm success
  await transactionResponse.wait();
  const tokenBalancesAfter = (
    await getBalances(
      [poolToJoin.address, ...tokensIn.map((t) => t.address)],
      signer,
      signerAddress
    )
  ).map((b) => b.toString());

  console.table({
    tokens: truncateAddresses([
      poolToJoin.address,
      ...tokensIn.map((t) => t.address),
    ]),
    balancesBefore: tokenBalancesBefore,
    balancesAfter: tokenBalancesAfter,
    expectedBPTOut: [query.expectedOut],
    minBPTOut: [query.minOut],
  });
}

join();
