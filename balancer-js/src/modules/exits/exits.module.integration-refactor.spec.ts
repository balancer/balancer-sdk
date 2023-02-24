// yarn test:only ./src/modules/exits/exits.module.integration-refactor.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  truncateAddresses,
  insert,
  PoolWithMethods,
} from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contracts } from '@/modules/contracts/contracts.module';
import {
  accuracy,
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SimulationType } from '../simulation/simulation.module';
import { subSlippage } from '@/lib/utils/slippageHelper';

/**
 * -- Integration tests for generalisedExit --
 *
 * It compares results from local fork transactions with simulated results from
 * the Simulation module, which can be of 3 different types:
 * 1. Tenderly: uses Tenderly Simulation API (third party service)
 * 2. VaultModel: uses TS math, which may be less accurate (min. 99% accuracy)
 * 3. Static: uses staticCall, which is 100% accurate but requires vault approval
 */

dotenv.config();

const TEST_BBEUSD = true;

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below:
 */
// const network = Network.GOERLI;
// const blockNumber = 7890980;
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';
// const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on MAINNET
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 16685902;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2';
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';

const addresses = ADDRESSES[network];

// Set tenderly config blockNumber and use default values for other parameters
const tenderlyConfig = {
  blockNumber,
};

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

const sdk = new BalancerSDK({
  network,
  rpcUrl,
  customSubgraphUrl,
  tenderly: tenderlyConfig,
  subgraphQuery,
});
const { pools } = sdk;
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner(1);
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayerV4 as string;

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: PoolWithMethods;
  amount: string;
  simulationType?: SimulationType;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      const signerAddress = await test.signer.getAddress();
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        signerAddress,
        test.signer,
        contracts.vault
      );
      await testFlow(
        test.signer,
        signerAddress,
        test.pool,
        test.amount,
        authorisation,
        test.simulationType
      );
    }).timeout(120000);
  }
};

const testFlow = async (
  signer: JsonRpcSigner,
  signerAddress: string,
  pool: PoolWithMethods,
  amount: string,
  authorisation: string | undefined,
  simulationType = SimulationType.VaultModel
) => {
  const slippage = '10'; // 10 bps = 0.1%

  const { to, encodedCall, tokensOut, expectedAmountsOut, minAmountsOut } =
    await pools.generalisedExit(
      pool.id,
      amount,
      signerAddress,
      slippage,
      signer,
      simulationType,
      authorisation
    );

  const { transactionReceipt, balanceDeltas, gasUsed } =
    await sendTransactionGetBalances(
      [pool.address, ...tokensOut],
      signer,
      signerAddress,
      to,
      encodedCall
    );

  console.log('Gas used', gasUsed.toString());

  console.table({
    tokensOut: truncateAddresses([pool.address, ...tokensOut]),
    minOut: minAmountsOut,
    expectedOut: expectedAmountsOut,
    balanceDeltas: balanceDeltas.map((b) => b.toString()),
  });

  expect(transactionReceipt.status).to.eq(1);
  const expectedDeltas = insert(expectedAmountsOut, pool.bptIndex, amount);
  balanceDeltas.forEach((b, i) => {
    const minOut = BigNumber.from(minAmountsOut[i]);
    expect(b.gte(minOut)).to.be.true;
    expect(accuracy(b, BigNumber.from(expectedDeltas[i]))).to.be.closeTo(
      1,
      1e-2
    ); // inaccuracy should be less than 1%)
  });
  const expectedMins = expectedAmountsOut.map((a) =>
    subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
  );
  expect(expectedMins).to.deep.eq(minAmountsOut);
};

// all contexts currently applies to GOERLI only
describe('generalised exit execution', async () => {
  let pool: PoolWithMethods;
  beforeEach(async () => {
    const tokens = [addresses.bbeusd.address];
    const slots = [addresses.bbeusd.slot];
    const balances = [parseFixed('2', addresses.bbeusd.decimals).toString()];

    const testPool = new TestPoolHelper(
      addresses.bbeusd.id,
      network,
      rpcUrl,
      blockNumber
    );

    // Setup forked network, set initial token balances and allowances
    await forkSetup(
      signer,
      tokens,
      slots,
      balances,
      jsonRpcUrl as string,
      blockNumber
    );

    // Updatate pool info with onchain state from fork block no
    pool = await testPool.getPool();
  });
  /*
  bbeusd: ComposableStable, bbeusdt/bbeusdc/bbedai
  bbeusdt: Linear, eUsdt/usdt
  bbeusdc: Linear, eUsdc/usdc
  bbedai: Linear, eDai/dai
  */
  context('bbeusd', async () => {
    if (!TEST_BBEUSD) return true;
    await runTests([
      {
        signer,
        description: 'exit pool - VaultModel',
        pool,
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
      },
      {
        signer,
        description: 'exit pool - Tenderly',
        pool,
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
        simulationType: SimulationType.Tenderly,
      },
      {
        signer,
        description: 'exit pool - Static',
        pool,
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
        simulationType: SimulationType.Static,
      },
    ]);
  });
});
