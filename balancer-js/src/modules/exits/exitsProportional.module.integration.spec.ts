// yarn test:only ./src/modules/exits/exitsProportional.module.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';

import { BalancerSDK, GraphQLQuery, GraphQLArgs, Network } from '@/.';
import { Relayer } from '@/modules/relayer/relayer.module';
import { accuracy, forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { SimulationType } from '../simulation/simulation.module';

dotenv.config();

const network = Network.MAINNET;
const blockNumber = 16990000;
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
  tenderly: tenderlyConfig,
  subgraphQuery,
});
const { pools, balancerContracts } = sdk;
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner(1);
const { contracts, contractAddresses } = balancerContracts;
const relayerAddress = contractAddresses.relayerV5 as string;

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
        relayerAddress,
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

describe('generalised exit execution', async () => {
  context('composable stable pool - non-boosted', async () => {
    let authorisation: string | undefined;
    const testPool = addresses.wstETH_rETH_sfrxETH;

    beforeEach(async () => {
      const tokens = [testPool.address];
      const slots = [testPool.slot];
      const balances = [parseFixed('0.02', testPool.decimals).toString()];
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
          id: testPool.id,
          address: testPool.address,
        },
        amount: parseFixed('0.01', testPool.decimals).toString(),
        authorisation,
      },
    ]);
  });
  context('composable stable pool - boosted', async () => {
    let authorisation: string | undefined;
    const testPool = addresses.bbgusd;

    beforeEach(async () => {
      const tokens = [testPool.address];
      const slots = [testPool.slot];
      const balances = [parseFixed('0.02', testPool.decimals).toString()];
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
          id: testPool.id,
          address: testPool.address,
        },
        amount: parseFixed('0.01', testPool.decimals).toString(),
        authorisation,
      },
    ]);
  });
});
