// yarn test:only ./src/modules/exits/exits.module.integration.polygon.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import {
  BalancerSDK,
  BalancerTenderlyConfig,
  Network,
  GraphQLQuery,
  GraphQLArgs,
} from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { Contracts } from '@/modules/contracts/contracts.module';
import { forkSetup, getBalances } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { Relayer } from '@/modules/relayer/relayer.module';

dotenv.config();

const TEST_COMPOSABLE_STABLE_V2 = true;

/*
 * Testing on POLYGON
 * - Run node on terminal: yarn run node:polygon
 * - Uncomment section below:
 */
const network = Network.POLYGON;
const blockNumber = 38871462;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2';
const jsonRpcUrl = process.env.ALCHEMY_URL_POLYGON;
const rpcUrl = 'http://127.0.0.1:8001';

const addresses = ADDRESSES[network];

// Custom Tenderly configuration parameters - remove in order to use default values
const tenderlyConfig: BalancerTenderlyConfig = {
  blockNumber,
};

// This filters to pool addresses of interest to avoid too many onchain calls during tests
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
const signer = provider.getSigner();
const { contracts, contractAddresses } = new Contracts(
  network as number,
  provider
);
const relayer = contractAddresses.relayerV4 as string;

interface Test {
  signer: JsonRpcSigner;
  description: string;
  pool: {
    id: string;
    address: string;
  };
  amount: string;
  authorisation: string | undefined;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      const signerAddress = await test.signer.getAddress();
      // const signerAddress = '0xb7d222a710169f42ddff2a9a5122bd7c724dc203';
      const authorisation = await Relayer.signRelayerApproval(
        relayer,
        signerAddress,
        test.signer,
        contracts.vault
      );
      // const authorisation = undefined;
      await testFlow(
        test.signer,
        signerAddress,
        test.pool,
        test.amount,
        authorisation
      );
    }).timeout(120000);
  }
};

const testFlow = async (
  signer: JsonRpcSigner,
  signerAddress: string,
  pool: { id: string; address: string },
  amount: string,
  authorisation: string | undefined
) => {
  const gasLimit = 8e6;
  const slippage = '10'; // 10 bps = 0.1%

  const { to, callData, tokensOut, expectedAmountsOut, minAmountsOut } =
    await pools.generalisedExit(
      pool.id,
      amount,
      signerAddress,
      slippage,
      authorisation
    );

  const [bptBalanceBefore, ...tokensOutBalanceBefore] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );

  const response = await signer.sendTransaction({
    to,
    data: callData,
    gasLimit,
  });

  const receipt = await response.wait();
  console.log('Gas used', receipt.gasUsed.toString());

  const [bptBalanceAfter, ...tokensOutBalanceAfter] = await getBalances(
    [pool.address, ...tokensOut],
    signer,
    signerAddress
  );
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
    return expect(balanceAfter.gte(minOut)).to.be.true;
  });
  // console.log('bpt after', query.tokensOut.toString());
  // console.log('minOut', minAmountsOut.toString());
  // console.log('expectedOut', expectedAmountsOut.toString());
};

// all contexts currently applies to POLYGON only
describe('generalised exit execution', async () => {
  /*
  composableStableV2
  */
  context('composableStableV2 on polygon', async () => {
    if (!TEST_COMPOSABLE_STABLE_V2) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [addresses.composableV2.address];
      const slots = [addresses.composableV2.slot];
      const balances = [
        parseFixed('1', addresses.composableV2.decimals).toString(),
      ];
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
          id: addresses.composableV2.id,
          address: addresses.composableV2.address,
        },
        amount: parseFixed('0.05', addresses.composableV2.decimals).toString(),
        authorisation: authorisation,
      },
    ]);
  });
});
