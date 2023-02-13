// yarn test:only ./src/modules/joins/joins.module.integration.spec.ts
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
const TEST_BOOSTED_META = false;
const TEST_BOOSTED_META_ALT = false;
const TEST_BOOSTED_META_BIG = false;
const TEST_BOOSTED_WEIGHTED_SIMPLE = false;
const TEST_BOOSTED_WEIGHTED_GENERAL = false;
const TEST_BOOSTED_WEIGHTED_META = false;
const TEST_BOOSTED_WEIGHTED_META_ALT = false;
const TEST_BOOSTED_WEIGHTED_META_GENERAL = false;

/*
 * Testing on GOERLI
 * - Make sure ALCHEMY_URL_GOERLI is set on .env with a goerli api key
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below:
 */
const network = Network.GOERLI;
const blockNumber = 8092113;
const customSubgraphUrl =
  'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2-beta';
const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on MAINNET
 * - Make sure ALCHEMY_URL is set on .env with a mainnet api key
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
// const network = Network.MAINNET;
// const blockNumber = 15519886;
// const customSubgraphUrl =
//   'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';
// const { ALCHEMY_URL: jsonRpcUrl } = process.env;
// const rpcUrl = 'http://127.0.0.1:8545';

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
  simulationType = SimulationType.Tenderly
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
    wrapMainTokens,
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

  // console.table({
  //   minOut: query.minOut,
  //   expectedOut: query.expectedOut,
  //   balanceAfter: bptBalanceAfter.toString(),
  // });

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

// following contexts currently applies to GOERLI only
describe('generalised join execution', async () => {
  /*
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  */
  context('boosted', async () => {
    if (!TEST_BOOSTED) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.MAI.address,
        addresses.WETH.address,
        addresses.waMAI.address,
        addresses.waWETH.address,
        addresses.bbamai.address,
        addresses.bbaweth.address,
      ];
      const slots = [
        addresses.MAI.slot,
        addresses.WETH.slot,
        addresses.waMAI.slot,
        addresses.waWETH.slot,
        addresses.bbamai.slot,
        addresses.bbaweth.slot,
      ];
      const balances = [
        parseFixed('100', 18).toString(),
        parseFixed('100', 18).toString(),
        '0',
        '0',
        parseFixed('100', addresses.bbamai.decimals).toString(),
        parseFixed('100', addresses.bbaweth.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.bbamaiweth.id,
          address: addresses.bbamaiweth.address,
        },
        tokensIn: [addresses.MAI.address, addresses.WETH.address],
        amountsIn: [
          parseFixed('100', 18).toString(),
          parseFixed('100', 18).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with 1 linear',
      //   pool: {
      //     id: addresses.bbamaiweth.id,
      //     address: addresses.bbamaiweth.address,
      //   },
      //   tokensIn: [addresses.bbamai.address],
      //   amountsIn: [parseFixed('10', 18).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      // {
      //   signer,
      //   description: 'join with 1 leaf and 1 linear',
      //   pool: {
      //     id: addresses.bbamaiweth.id,
      //     address: addresses.bbamaiweth.address,
      //   },
      //   tokensIn: [addresses.WETH.address, addresses.bbamai.address],
      //   amountsIn: [
      //     parseFixed('10', 18).toString(),
      //     parseFixed('10', 18).toString(),
      //   ],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
    ]);
  });

  /*
  boostedMeta1: ComposableStable, baMai/bbausd2
  baMai: Linear, aMai/Mai
  bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
  */
  context('boostedMeta', async () => {
    if (!TEST_BOOSTED_META) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
        addresses.bbadai.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbamai.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
        addresses.bbadai.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbamai.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        '0',
        '0',
        '0',
        '0',
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbamai.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedMeta1.id,
      //     address: addresses.boostedMeta1.address,
      //   },
      //   tokensIn: [addresses.bbamai.address],
      //   amountsIn: [parseFixed('10', addresses.bbamai.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with some leafs, linears and boosted',
        pool: {
          id: addresses.boostedMeta1.id,
          address: addresses.boostedMeta1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.bbamai.address,
          addresses.bbausdt.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.bbamai.decimals).toString(),
          parseFixed('10', addresses.bbausdt.decimals).toString(),
          parseFixed('10', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedMetaAlt1: ComposableStable, Mai/bbausd2
  bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
  */
  context('boostedMetaAlt', async () => {
    if (!TEST_BOOSTED_META_ALT) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbadai.address,
        addresses.bbamai.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbadai.slot,
        addresses.bbamai.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        '0',
        '0',
        '0',
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbamai.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedMetaAlt1.id,
          address: addresses.boostedMetaAlt1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.MAI.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with single leaf token',
      //   pool: {
      //     id: addresses.boostedMetaAlt1.id,
      //     address: addresses.boostedMetaAlt1.address,
      //   },
      //   tokensIn: [addresses.MAI.address],
      //   amountsIn: [parseFixed('10', addresses.MAI.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedMetaAlt1.id,
      //     address: addresses.boostedMetaAlt1.address,
      //   },
      //   tokensIn: [addresses.bbausdc.address],
      //   amountsIn: [parseFixed('3', addresses.bbausdc.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      // {
      //   signer,
      //   description: 'join with child boosted',
      //   pool: {
      //     id: addresses.boostedMetaAlt1.id,
      //     address: addresses.boostedMetaAlt1.address,
      //   },
      //   tokensIn: [addresses.bbausd2.address],
      //   amountsIn: [parseFixed('10', addresses.bbausd2.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with some leafs, linears and boosted',
        pool: {
          id: addresses.boostedMetaAlt1.id,
          address: addresses.boostedMetaAlt1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDT.address,
          addresses.bbadai.address,
          addresses.bbausdc.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('4', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDT.decimals).toString(),
          parseFixed('4', addresses.bbadai.decimals).toString(),
          parseFixed('4', addresses.bbausdc.decimals).toString(),
          parseFixed('4', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedMetaBig1: ComposableStable, bbamaiweth/bbausd2
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
  */
  context('boostedMetaBig', async () => {
    if (!TEST_BOOSTED_META_BIG) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.MAI.address,
        addresses.WETH.address,
        addresses.waDAI.address,
        addresses.waUSDC.address,
        addresses.waUSDT.address,
        addresses.waMAI.address,
        addresses.waWETH.address,
        addresses.bbadai.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbamai.address,
        addresses.bbamaiweth.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.MAI.slot,
        addresses.WETH.slot,
        addresses.waDAI.slot,
        addresses.waUSDC.slot,
        addresses.waUSDT.slot,
        addresses.waMAI.slot,
        addresses.waWETH.slot,
        addresses.bbadai.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbamai.slot,
        addresses.bbamaiweth.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        '0',
        '0',
        '0',
        '0',
        '0',
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbamai.decimals).toString(),
        parseFixed('10', addresses.bbamaiweth.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.MAI.address,
          addresses.WETH.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.MAI.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child boosted',
      //   pool: {
      //     id: addresses.boostedMetaBig1.id,
      //     address: addresses.boostedMetaBig1.address,
      //   },
      //   tokensIn: [addresses.bbamaiweth.address],
      //   amountsIn: [parseFixed('10', addresses.bbamaiweth.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with leaf and child boosted',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [addresses.DAI.address, addresses.bbamaiweth.address],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with some leafs, linears and boosted - VaultModel',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbamai.address,
          addresses.bbamaiweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbamai.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with some leafs, linears and boosted - Tenderly',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbamai.address,
          addresses.bbamaiweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbamai.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
        simulationType: SimulationType.Tenderly,
      },
      {
        signer,
        description: 'join with some leafs, linears and boosted - Static',
        pool: {
          id: addresses.boostedMetaBig1.id,
          address: addresses.boostedMetaBig1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbamai.address,
          addresses.bbamaiweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbamai.decimals).toString(),
          parseFixed('1', addresses.bbamaiweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
        simulationType: SimulationType.Static,
      },
    ]);
  });

  /*
  boostedWeightedSimple1: 1 Linear + 1 normal token
  b-a-weth: Linear, aWeth/Weth
  BAL
  */
  context('boostedWeightedSimple', async () => {
    if (!TEST_BOOSTED_WEIGHTED_SIMPLE) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.BAL.address,
        addresses.WETH.address,
        addresses.waWETH.address,
        addresses.bbaweth.address,
      ];
      const slots = [
        addresses.BAL.slot,
        addresses.WETH.slot,
        addresses.waWETH.slot,
        addresses.bbaweth.slot,
      ];
      const balances = [
        parseFixed('10', addresses.BAL.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        '0',
        parseFixed('10', addresses.bbaweth.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedWeightedSimple1.id,
          address: addresses.boostedWeightedSimple1.address,
        },
        tokensIn: [addresses.BAL.address, addresses.WETH.address],
        amountsIn: [
          parseFixed('10', addresses.BAL.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedWeightedSimple1.id,
      //     address: addresses.boostedWeightedSimple1.address,
      //   },
      //   tokensIn: [addresses.bbaweth.address],
      //   amountsIn: [parseFixed('10', addresses.bbaweth.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with leaf and child linear',
        pool: {
          id: addresses.boostedWeightedSimple1.id,
          address: addresses.boostedWeightedSimple1.address,
        },
        tokensIn: [addresses.BAL.address, addresses.bbaweth.address],
        amountsIn: [
          parseFixed('1', addresses.BAL.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedWeightedGeneral1: N Linear + M normal tokens
  b-a-dai: Linear, aDai/Dai
  b-a-mai: Linear, aMai/Mai
  BAL
  USDC
  */
  context('boostedWeightedGeneral', async () => {
    if (!TEST_BOOSTED_WEIGHTED_GENERAL) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.MAI.address,
        addresses.BAL.address,
        addresses.USDC_old.address,
        addresses.bbadai.address,
        addresses.bbamai.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.MAI.slot,
        addresses.BAL.slot,
        addresses.USDC_old.slot,
        addresses.bbadai.slot,
        addresses.bbamai.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.MAI.decimals).toString(),
        parseFixed('10', addresses.BAL.decimals).toString(),
        parseFixed('10', addresses.USDC_old.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbamai.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedWeightedGeneral1.id,
          address: addresses.boostedWeightedGeneral1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.MAI.address,
          addresses.BAL.address,
          addresses.USDC_old.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.MAI.decimals).toString(),
          parseFixed('1', addresses.BAL.decimals).toString(),
          parseFixed('1', addresses.USDC_old.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedWeightedGeneral1.id,
      //     address: addresses.boostedWeightedGeneral1.address,
      //   },
      //   tokensIn: [addresses.bbadai.address],
      //   amountsIn: [parseFixed('10', addresses.bbadai.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with some leafs and linear',
        pool: {
          id: addresses.boostedWeightedGeneral1.id,
          address: addresses.boostedWeightedGeneral1.address,
        },
        tokensIn: [
          addresses.MAI.address,
          addresses.BAL.address,
          addresses.bbamai.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.MAI.decimals).toString(),
          parseFixed('10', addresses.BAL.decimals).toString(),
          parseFixed('10', addresses.bbamai.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedWeightedMeta1: 1 Linear + 1 ComposableStable
  b-a-weth: Linear, aWeth/Weth
  bb-a-usd2: ComposableStable, b-a-usdc/b-a-usdt/b-a-dai
  BAL
  */
  context('boostedWeightedMeta', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.WETH.address,
        addresses.bbadai.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbaweth.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.WETH.slot,
        addresses.bbadai.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbaweth.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbaweth.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedWeightedMeta1.id,
          address: addresses.boostedWeightedMeta1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('10', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.USDT.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedWeightedMeta1.id,
      //     address: addresses.boostedWeightedMeta1.address,
      //   },
      //   tokensIn: [addresses.bbaweth.address],
      //   amountsIn: [parseFixed('10', addresses.bbaweth.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with some leafs, linears and boosted',
        pool: {
          id: addresses.boostedWeightedMeta1.id,
          address: addresses.boostedWeightedMeta1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbausdt.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('10', addresses.DAI.decimals).toString(),
          parseFixed('0', addresses.USDC.decimals).toString(),
          parseFixed('10', addresses.WETH.decimals).toString(),
          parseFixed('10', addresses.bbausdt.decimals).toString(),
          parseFixed('10', addresses.bbaweth.decimals).toString(),
          parseFixed('10', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
  WETH
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaAlt', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.WETH.address,
        addresses.bbadai.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.WETH.slot,
        addresses.bbadai.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedWeightedMetaAlt1.id,
          address: addresses.boostedWeightedMetaAlt1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedWeightedMetaAlt1.id,
      //     address: addresses.boostedWeightedMetaAlt1.address,
      //   },
      //   tokensIn: [addresses.bbausdt.address],
      //   amountsIn: [parseFixed('1', addresses.bbausdt.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with leaf and child linear',
        pool: {
          id: addresses.boostedWeightedMetaAlt1.id,
          address: addresses.boostedWeightedMetaAlt1.address,
        },
        tokensIn: [
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbausdc.address,
          addresses.bbausdt.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbausdc.decimals).toString(),
          parseFixed('0', addresses.bbausdt.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
    ]);
  });

  /*
  boostedWeightedMetaGeneral1: N Linear + 1 ComposableStable
  b-a-usdt: Linear, aUSDT/USDT
  b-a-usdc: Linear, aUSDC/USDC
  b-a-weth: Linear, aWeth/Weth
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaGeneral', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_GENERAL) return true;
    let authorisation: string | undefined;
    beforeEach(async () => {
      const tokens = [
        addresses.DAI.address,
        addresses.USDC.address,
        addresses.USDT.address,
        addresses.WETH.address,
        addresses.bbadai.address,
        addresses.bbausdc.address,
        addresses.bbausdt.address,
        addresses.bbaweth.address,
        addresses.bbausd2.address,
      ];
      const slots = [
        addresses.DAI.slot,
        addresses.USDC.slot,
        addresses.USDT.slot,
        addresses.WETH.slot,
        addresses.bbadai.slot,
        addresses.bbausdc.slot,
        addresses.bbausdt.slot,
        addresses.bbaweth.slot,
        addresses.bbausd2.slot,
      ];
      const balances = [
        parseFixed('10', addresses.DAI.decimals).toString(),
        parseFixed('10', addresses.USDC.decimals).toString(),
        parseFixed('10', addresses.USDT.decimals).toString(),
        parseFixed('10', addresses.WETH.decimals).toString(),
        parseFixed('10', addresses.bbadai.decimals).toString(),
        parseFixed('10', addresses.bbausdc.decimals).toString(),
        parseFixed('10', addresses.bbausdt.decimals).toString(),
        parseFixed('10', addresses.bbaweth.decimals).toString(),
        parseFixed('10', addresses.bbausd2.decimals).toString(),
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
        description: 'join with all leaf tokens',
        pool: {
          id: addresses.boostedWeightedMetaGeneral1.id,
          address: addresses.boostedWeightedMetaGeneral1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.USDT.address,
          addresses.WETH.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('1', addresses.USDT.decimals).toString(),
          parseFixed('1', addresses.WETH.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      // {
      //   signer,
      //   description: 'join with child linear',
      //   pool: {
      //     id: addresses.boostedWeightedMetaGeneral1.id,
      //     address: addresses.boostedWeightedMetaGeneral1.address,
      //   },
      //   tokensIn: [addresses.bbausdc.address],
      //   amountsIn: [parseFixed('10', addresses.bbausdc.decimals).toString()],
      //   authorisation: authorisation,
      //   wrapMainTokens: false,
      // },
      {
        signer,
        description: 'join with some leafs, linears and boosted - VaultModel',
        pool: {
          id: addresses.boostedWeightedMetaGeneral1.id,
          address: addresses.boostedWeightedMetaGeneral1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
      },
      {
        signer,
        description: 'join with some leafs, linears and boosted - Tenderly',
        pool: {
          id: addresses.boostedWeightedMetaGeneral1.id,
          address: addresses.boostedWeightedMetaGeneral1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
        simulationType: SimulationType.Tenderly,
      },
      {
        signer,
        description: 'join with some leafs, linears and boosted - Static',
        pool: {
          id: addresses.boostedWeightedMetaGeneral1.id,
          address: addresses.boostedWeightedMetaGeneral1.address,
        },
        tokensIn: [
          addresses.DAI.address,
          addresses.USDC.address,
          addresses.WETH.address,
          addresses.bbadai.address,
          addresses.bbaweth.address,
          addresses.bbausd2.address,
        ],
        amountsIn: [
          parseFixed('1', addresses.DAI.decimals).toString(),
          parseFixed('1', addresses.USDC.decimals).toString(),
          parseFixed('0', addresses.WETH.decimals).toString(),
          parseFixed('1', addresses.bbadai.decimals).toString(),
          parseFixed('1', addresses.bbaweth.decimals).toString(),
          parseFixed('1', addresses.bbausd2.decimals).toString(),
        ],
        authorisation: authorisation,
        wrapMainTokens: false,
        simulationType: SimulationType.Static,
      },
    ]);
  });
});
