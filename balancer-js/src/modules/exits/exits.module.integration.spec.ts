// yarn test:only ./src/modules/exits/exits.module.integration.spec.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';

import { BalancerSDK, GraphQLQuery, GraphQLArgs, Network } from '@/.';
import { SimulationType } from '@/modules/simulation/simulation.module';
import { forkSetup } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';
import { testGeneralisedExit } from '@/test/lib/exitHelper';

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

const TEST_BOOSTED = true;
const TEST_BOOSTED_META = true;
const TEST_BOOSTED_META_ALT = true;
const TEST_BOOSTED_META_BIG = true;
const TEST_BOOSTED_WEIGHTED_SIMPLE = true;
const TEST_BOOSTED_WEIGHTED_GENERAL = true;
const TEST_BOOSTED_WEIGHTED_META = true;
const TEST_BOOSTED_WEIGHTED_META_ALT = true;
const TEST_BOOSTED_WEIGHTED_META_GENERAL = true;

/*
 * Testing on GOERLI
 * - Run node on terminal: yarn run node:goerli
 * - Uncomment section below:
 */
const network = Network.GOERLI;
const blockNumber = 8744170;
const { ALCHEMY_URL_GOERLI: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8000';

/*
 * Testing on MAINNET
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
  tenderly: tenderlyConfig,
  subgraphQuery,
});
const { pools } = sdk;
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

const simulationType = SimulationType.Static;

describe('generalised exit execution', async function () {
  this.timeout(120000); // Sets timeout for all tests within this scope to 2 minutes
  let pool = { id: '', address: '', decimals: 0, slot: 0 };
  let amount = '';

  beforeEach(async () => {
    await forkSetup(
      signer,
      [pool.address],
      [pool.slot],
      [amount],
      jsonRpcUrl as string,
      blockNumber
    );
  });

  /*
  bbamaiweth: ComposableStable, baMai/baWeth
  baMai: Linear, aMai/Mai
  baWeth: Linear, aWeth/Weth
  */
  context('boosted', async () => {
    if (!TEST_BOOSTED) return true;

    before(() => {
      pool = addresses.bbamaiweth;
      amount = parseFixed('0.02', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });

  /*
    boostedMeta1: ComposableStable, baMai/bbausd2
    baMai: Linear, aMai/Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMeta', async () => {
    if (!TEST_BOOSTED_META) return true;
    before(() => {
      pool = addresses.boostedMeta1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });

  /*
    boostedMetaAlt1: ComposableStable, Mai/bbausd2
    Mai
    bbausd2 (boosted): ComposableStable, baUsdt/baDai/baUsdc
    */
  context('boostedMetaAlt', async () => {
    if (!TEST_BOOSTED_META_ALT) return true;
    before(() => {
      pool = addresses.boostedMetaAlt1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
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

    before(() => {
      pool = addresses.boostedMetaBig1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });

  /*
  boostedWeightedSimple1: 1 Linear + 1 normal token
  b-a-weth: Linear, aWeth/Weth
  BAL
  */
  context('boostedWeightedSimple', async () => {
    if (!TEST_BOOSTED_WEIGHTED_SIMPLE) return true;

    before(() => {
      pool = addresses.boostedWeightedSimple1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
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

    before(() => {
      pool = addresses.boostedMeta1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });

  /*
  boostedWeightedMeta1: 1 Linear + 1 ComposableStable
  b-a-weth: Linear, aWeth/Weth
  bb-a-usd2: ComposableStable, b-a-usdc/b-a-usdt/b-a-dai
  BAL
  */
  context('boostedWeightedMeta', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META) return true;

    before(() => {
      pool = addresses.boostedWeightedMeta1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });

  /*
  boostedWeightedMetaAlt1: 1 normal token + 1 ComposableStable
  WETH
  b-a-usd2: ComposableStable, b-a-usdt/b-a-usdc/b-a-dai
  */
  context('boostedWeightedMetaAlt', async () => {
    if (!TEST_BOOSTED_WEIGHTED_META_ALT) return true;

    before(() => {
      pool = addresses.boostedWeightedMetaAlt1;
      amount = parseFixed('0.01', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
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

    before(() => {
      pool = addresses.boostedWeightedMetaGeneral1;
      amount = parseFixed('0.05', pool.decimals).toString();
    });

    it('should exit pool correctly', async () => {
      await testGeneralisedExit(pool, pools, signer, amount, simulationType);
    });
  });
});
