// yarn test:only ./src/modules/joins/joins.module.integration.mainnet.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  subSlippage,
  removeItem,
} from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contracts } from '@/modules/contracts/contracts.module';
import {
  FORK_NODES,
  accuracy,
  forkSetup,
  sendTransactionGetBalances,
} from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SimulationType } from '../simulation/simulation.module';
import { RPC_URLS } from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';

/**
 * -- Integration tests for generalisedJoin --
 *
 * It compares results from local fork transactions with simulated results from
 * the Simulation module, which can be of 3 different types:
 * 1. Tenderly: uses Tenderly Simulation API (third party service)
 * 2. VaultModel: uses TS math, which may be less accurate (min. 99% accuracy)
 * 3. Static: uses staticCall, which is 100% accurate but requires vault approval
 */

dotenv.config();

const TEST_JOIN_WITH_ETH = true;

/*
 * Testing on MAINNET
 * - Make sure ALCHEMY_URL_MAINNET is set on .env with a mainnet api key
 * - Run node on terminal: yarn run node:mainnet
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 17316477;
const jsonRpcUrl = FORK_NODES[network];
const rpcUrl = RPC_URLS[network];
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
const subgraphArgs: GraphQLArgs = {
  where: {
    swapEnabled: {
      eq: true,
    },
    totalShares: {
      gt: 0.000000000001,
    },
    address: {
      in: [addresses.swEth_bbaweth.address, addresses.bbaweth.address],
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
const relayer = contractAddresses.relayer as string;

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: {
    id: string;
    address: string;
  };
  tokensIn: string[];
  amountsIn: string[];
  authorisation: string | undefined;
  simulationType?: SimulationType;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      const userAddress = await test.signer.getAddress();
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        userAddress,
        signer,
        contracts.vault
      );
      await testFlow(
        userAddress,
        test.pool,
        test.tokensIn,
        test.amountsIn,
        authorisation,
        test.simulationType
      );
    }).timeout(360000);
  }
};

const testFlow = async (
  userAddress: string,
  pool: { id: string; address: string },
  tokensIn: string[],
  amountsIn: string[],
  authorisation: string | undefined,
  simulationType = SimulationType.VaultModel
) => {
  const slippage = '10'; // 10 bps = 0.1%

  const { to, encodedCall, minOut, expectedOut, priceImpact, value } =
    await pools.generalisedJoin(
      pool.id,
      tokensIn,
      amountsIn,
      userAddress,
      slippage,
      signer,
      simulationType,
      authorisation
    );

  const { balanceDeltas, transactionReceipt, gasUsed } =
    await sendTransactionGetBalances(
      [pool.address, ...tokensIn],
      signer,
      userAddress,
      to,
      encodedCall,
      value
    );

  console.log('Gas used', gasUsed.toString());
  console.log('Price impact: ', priceImpact);

  console.table({
    tokens: [pool.address, ...tokensIn],
    expectedDeltas: [expectedOut, ...amountsIn],
    balanceDeltas: balanceDeltas.map((d) => d.toString()),
  });

  expect(transactionReceipt.status).to.eq(1);
  expect(BigInt(expectedOut) > 0).to.be.true;
  expect(BigNumber.from(expectedOut).gt(minOut)).to.be.true;
  expect(amountsIn).to.deep.eq(
    removeItem(balanceDeltas, 0).map((a) => a.toString())
  );
  const expectedMinBpt = subSlippage(
    BigNumber.from(expectedOut),
    BigNumber.from(slippage)
  ).toString();
  expect(expectedMinBpt).to.deep.eq(minOut);
  expect(accuracy(balanceDeltas[0], BigNumber.from(expectedOut))).to.be.closeTo(
    1,
    1e-2
  ); // inaccuracy should not be over to 1%
};

describe('generalised join execution', async () => {
  context('join with wETH vs ETH', async () => {
    if (!TEST_JOIN_WITH_ETH) return true;
    let authorisation: string | undefined;
    const testPool = addresses.swEth_bbaweth;
    beforeEach(async () => {
      // no need to setup ETH balance because test account already has ETH
      await forkSetup(
        signer,
        [addresses.WETH.address],
        [addresses.WETH.slot],
        [parseFixed('100', 18).toString()],
        jsonRpcUrl,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'join with wETH',
        pool: {
          id: testPool.id,
          address: testPool.address,
        },
        tokensIn: [addresses.WETH.address],
        amountsIn: [parseFixed('1', 18).toString()],
        authorisation,
      },
      {
        signer,
        description: 'join with ETH',
        pool: {
          id: testPool.id,
          address: testPool.address,
        },
        tokensIn: [AddressZero],
        amountsIn: [parseFixed('1', 18).toString()],
        authorisation,
      },
    ]);
  });
});
