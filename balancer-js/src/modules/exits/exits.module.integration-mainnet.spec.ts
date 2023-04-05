// yarn test:only ./src/modules/exits/exits.module.integration-mainnet.spec.ts
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
const signer = provider.getSigner(1); // signer 0 at this blockNumber has DAI balance and tests were failling
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayerV5 as string;

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: {
    id: string;
    address: string;
  };
  amount: string;
  authorisation: string | undefined;
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
  pool: { id: string; address: string },
  amount: string,
  authorisation: string | undefined,
  simulationType = SimulationType.VaultModel
) => {
  const gasLimit = 8e6;
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

  const [bptBalanceBefore, ...tokensOutBalanceBefore] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );

  const response = await signer.sendTransaction({
    to,
    data: encodedCall,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensOutBalanceAfter] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );

  console.table({
    tokensOut: tokensOut.map((t) => `${t.slice(0, 6)}...${t.slice(38, 42)}`),
    minOut: minAmountsOut,
    expectedOut: expectedAmountsOut,
    balanceAfter: tokensOutBalanceAfter.map((b) => b.toString()),
    balanceBefore: tokensOutBalanceBefore.map((b) => b.toString()),
  });

  expect(receipt.status).to.eql(1);
  minAmountsOut.forEach((minAmountOut) => {
    expect(BigNumber.from(minAmountOut).gte('0')).to.be.true;
  });
  expectedAmountsOut.forEach((expectedAmountOut, i) => {
    expect(
      BigNumber.from(expectedAmountOut).gte(BigNumber.from(minAmountsOut[i]))
    ).to.be.true;
  });
  expect(bptBalanceAfter.eq(bptBalanceBefore.sub(amount))).to.be.true;
  tokensOutBalanceBefore.forEach((b) => expect(b.eq(0)).to.be.true);
  tokensOutBalanceAfter.forEach((balanceAfter, i) => {
    const minOut = BigNumber.from(minAmountsOut[i]);
    expect(balanceAfter.gte(minOut)).to.be.true;
    const expectedOut = BigNumber.from(expectedAmountsOut[i]);
    expect(accuracy(balanceAfter, expectedOut)).to.be.closeTo(1, 1e-2); // inaccuracy should not be over to 1%
  });
};

// Skipping Euler specific tests while eTokens transactions are paused
describe.skip('generalised exit execution', async () => {
  /*
  bbeusd: ComposableStable, bbeusdt/bbeusdc/bbedai
  bbeusdt: Linear, eUsdt/usdt
  bbeusdc: Linear, eUsdc/usdc
  bbedai: Linear, eDai/dai
  */
  context('bbeusd', async () => {
    if (!TEST_BBEUSD) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.bbeusd.address];
      const slots = [addresses.bbeusd.slot];
      const balances = [parseFixed('2', addresses.bbeusd.decimals).toString()];
      await forkSetup(
        signer,
        tokens,
        slots,
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
    });

    await runTests([
      {
        signer,
        description: 'exit pool',
        pool: {
          id: addresses.bbeusd.id,
          address: addresses.bbeusd.address,
        },
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
        authorisation: authorisation,
        simulationType: SimulationType.Tenderly,
      },
      {
        signer,
        description: 'exit pool',
        pool: {
          id: addresses.bbeusd.id,
          address: addresses.bbeusd.address,
        },
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
        authorisation: authorisation,
        simulationType: SimulationType.Static,
      },
      {
        signer,
        description: 'exit pool',
        pool: {
          id: addresses.bbeusd.id,
          address: addresses.bbeusd.address,
        },
        amount: parseFixed('2', addresses.bbeusd.decimals).toString(),
        authorisation: authorisation,
      },
    ]);
  });
});
