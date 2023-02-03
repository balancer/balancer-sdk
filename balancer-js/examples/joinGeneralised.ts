// yarn examples:run ./examples/joinGeneralised.ts
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
// 1. User selects tokens and amounts to join a pool
// 2. FE calls joinGeneralised with simulation type Tenderly or VaultModel
// 3. SDK calculates expectedAmountOut that is at least 99% accurate
// 4. User agrees expectedAmountOut and approves relayer
// 5. With approvals in place, FE calls joinGeneralised with simulation type Static
// 6. SDK calculates expectedAmountOut that is 100% accurate
// 7. SDK returns joinGeneralised transaction data with proper minAmountsOut limits in place
// 8. User is now able to submit a safe transaction to the blockchain

dotenv.config();

// -- Goerli network setup --
// const network = Network.GOERLI;
// const jsonRpcUrl = process.env.ALCHEMY_URL_GOERLI;
// const blockNumber = 8006790;
// const rpcUrl = 'http://127.0.0.1:8000';
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';

// -- Mainnet network setup --
const network = Network.MAINNET;
const jsonRpcUrl = process.env.ALCHEMY_URL;
const blockNumber = 16075635;
const rpcUrl = 'http://127.0.0.1:8545';
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';

const addresses = ADDRESSES[network];

// Setup local fork with correct balances/approval to join pool with DAI/USDC/bbaDAI/bbaUSDC
async function setUp(provider: JsonRpcProvider) {
  const signer = provider.getSigner();

  const mainTokens = [addresses.DAI.address, addresses.USDC.address];
  const mainInitialBalances = [
    parseFixed('100', addresses.DAI.decimals).toString(),
    parseFixed('100', addresses.USDC.decimals).toString(),
  ];
  const mainSlots = [
    addresses.DAI.slot as number,
    addresses.USDC.slot as number,
  ];

  const linearPoolTokens = [
    addresses.bbadai?.address as string,
    addresses.bbausdc?.address as string,
  ];
  const linearInitialBalances = [
    parseFixed('100', addresses.bbadai?.decimals).toString(),
    parseFixed('100', addresses.bbausdc?.decimals).toString(),
  ];
  const linearPoolSlots = [
    addresses.bbadai?.slot as number,
    addresses.bbausdc?.slot as number,
  ];

  await forkSetup(
    signer,
    [...mainTokens, ...linearPoolTokens],
    [...mainSlots, ...linearPoolSlots],
    [...mainInitialBalances, ...linearInitialBalances],
    jsonRpcUrl as string,
    blockNumber
  );
}

/*
Example showing how to use the SDK generalisedJoin method.
This allows joining of a ComposableStable that has nested pools, e.g.:
                  CS0
              /        \
            CS1        CS2
          /    \      /   \
         DAI   USDC  USDT  FRAX

Can join with tokens: DAI, USDC, USDT, FRAX, CS1_BPT, CS2_BPT
*/
async function join() {
  const provider = new JsonRpcProvider(rpcUrl, network);
  // Local fork setup
  await setUp(provider);

  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const wrapLeafTokens = false;
  const slippage = '100'; // 100 bps = 1%
  const bbausd2 = {
    id: addresses.bbausd2?.id as string,
    address: addresses.bbausd2?.address as string,
  };
  // Here we join with USDC and bbadai
  const tokensIn = [
    addresses.USDC.address,
    addresses.bbadai?.address as string,
  ];
  const amountsIn = [
    parseFixed('10', addresses.USDC.decimals).toString(),
    parseFixed('10', addresses.bbadai.decimals as number).toString(),
  ];

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
    customSubgraphUrl,
    subgraphQuery,
  });

  // Use SDK to create join using either Tenderly or VaultModel simulation
  // Note that this does not require authorisation to be defined
  const { expectedOut } = await balancer.pools.generalisedJoin(
    bbausd2.id,
    tokensIn,
    amountsIn,
    signerAddress,
    wrapLeafTokens,
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
    contractAddresses.relayerV4 as string,
    signerAddress,
    signer,
    contracts.vault
  );

  // Use SDK to create join with Static simulation
  const query = await balancer.pools.generalisedJoin(
    bbausd2.id,
    tokensIn,
    amountsIn,
    signerAddress,
    wrapLeafTokens,
    slippage,
    signer,
    SimulationType.Static,
    authorisation
  );

  // Checking balances before to confirm success
  const tokenBalancesBefore = (
    await getBalances([bbausd2.address, ...tokensIn], signer, signerAddress)
  ).map((b) => b.toString());

  // Submit join tx
  const transactionResponse = await signer.sendTransaction({
    to: query.to,
    data: query.encodedCall,
  });

  // Checking balances after to confirm success
  await transactionResponse.wait();
  const tokenBalancesAfter = (
    await getBalances([bbausd2.address, ...tokensIn], signer, signerAddress)
  ).map((b) => b.toString());

  console.table({
    balancesBefore: tokenBalancesBefore,
    balancesAfter: tokenBalancesAfter,
    expectedBPTOut: [query.expectedOut],
    minBPTOut: [query.minOut],
  });
}

join();
