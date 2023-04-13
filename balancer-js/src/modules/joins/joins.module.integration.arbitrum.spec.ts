// yarn test:only ./src/modules/joins/joins.module.integration.arbitrum.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import { BalancerSDK, GraphQLQuery, GraphQLArgs, Network } from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contracts } from '@/modules/contracts/contracts.module';
import { accuracy, forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';
import { JsonRpcSigner } from '@ethersproject/providers';
import { SimulationType } from '../simulation/simulation.module';

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

const TEST_BOOSTED = true;

/*
 * Testing on ARBITRUM
 * - Make sure ALCHEMY_URL_ARBITRUM is set on .env with a arbitrum api key
 * - Run node on terminal: yarn run node:arbitrum
 * - Uncomment section below:
 */
const network = Network.ARBITRUM;
const blockNumber = 79069597;
const { ALCHEMY_URL_ARBITRUM: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8161';

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
  tenderly: tenderlyConfig,
  subgraphQuery,
});
const { pools } = sdk;
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
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
  wrapMainTokens: boolean;
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
        test.wrapMainTokens,
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
  wrapMainTokens: boolean,
  authorisation: string | undefined,
  simulationType = SimulationType.VaultModel
) => {
  const [bptBalanceBefore, ...tokensInBalanceBefore] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    userAddress
  );

  const gasLimit = 8e6;
  const slippage = '10'; // 10 bps = 0.1%

  const query = await pools.generalisedJoin(
    pool.id,
    tokensIn,
    amountsIn,
    userAddress,
    slippage,
    signer,
    simulationType,
    authorisation
  );

  const response = await signer.sendTransaction({
    to: query.to,
    data: query.encodedCall,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensInBalanceAfter] = await getBalances(
    [pool.address, ...tokensIn],
    signer,
    userAddress
  );

  console.table({
    minOut: query.minOut,
    expectedOut: query.expectedOut,
    balanceAfter: bptBalanceAfter.toString(),
  });

  expect(receipt.status).to.eql(1);
  expect(BigNumber.from(query.minOut).gte('0')).to.be.true;
  expect(BigNumber.from(query.expectedOut).gt(query.minOut)).to.be.true;
  tokensInBalanceAfter.forEach((balanceAfter, i) => {
    expect(balanceAfter.toString()).to.eq(
      tokensInBalanceBefore[i].sub(amountsIn[i]).toString()
    );
  });
  expect(bptBalanceBefore.eq(0)).to.be.true;
  expect(bptBalanceAfter.gte(query.minOut)).to.be.true;
  expect(
    accuracy(bptBalanceAfter, BigNumber.from(query.expectedOut))
  ).to.be.closeTo(1, 1e-2); // inaccuracy should not be over to 1%
};

describe.skip('generalised join execution', async () => {
  context('boosted', async () => {
    if (!TEST_BOOSTED) return true;
    let authorisation: string | undefined;
    const testPool = addresses.bbrfusd;
    beforeEach(async () => {
      const tokens = [addresses.USDT.address];
      const balances = [parseFixed('5', addresses.USDT.decimals).toString()];
      await forkSetup(
        signer,
        tokens,
        undefined, // slots
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'join with one leaf token',
        pool: {
          id: testPool.id,
          address: testPool.address,
        },
        tokensIn: [addresses.USDT.address],
        amountsIn: [parseFixed('5', addresses.USDT.decimals).toString()],
        authorisation,
        wrapMainTokens: false,
      },
    ]);
  });
});
