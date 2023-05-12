// yarn test:only ./src/modules/exits/exits.module.integration-mainnet.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';

import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  SimulationType,
} from '@/.';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { accuracy, forkSetup } from '@/test/lib/utils';
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

const TEST_BBAUSD3 = true;

/*
 * Testing on MAINNET
 * - Run node on terminal: yarn run node
 * - Uncomment section below:
 */
const network = Network.MAINNET;
const blockNumber = 17223300;
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
const { pools } = sdk;
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

const simulationType = SimulationType.Static;

describe('generalised exit execution', async function () {
  this.timeout(120000); // Sets timeout for all tests within this scope to 2 minutes

  context('bbausd3', async () => {
    if (!TEST_BBAUSD3) return true;
    const pool = addresses.bbausd3;
    let unwrappingTokensAmountsOut: string[];
    let unwrappingTokensGasUsed: BigNumber;
    let mainTokensAmountsOut: string[];
    let mainTokensGasUsed: BigNumber;

    const amountRatio = 10;
    // Amount greater than the underlying main token balance, which will cause the exit to be unwrapped
    const unwrapExitAmount = parseFixed('6000000', pool.decimals);
    // Amount smaller than the underlying main token balance, which will cause the exit to be done directly
    const mainExitAmount = unwrapExitAmount.div(amountRatio);

    beforeEach(async () => {
      await forkSetup(
        signer,
        [pool.address],
        [pool.slot],
        [unwrapExitAmount.toString()],
        jsonRpcUrl as string,
        blockNumber
      );
    });

    context('exit by unwrapping tokens', async () => {
      it('should exit pool correctly', async () => {
        const { expectedAmountsOut, gasUsed } = await testGeneralisedExit(
          pool,
          pools,
          signer,
          unwrapExitAmount.toString(),
          simulationType,
          true
        );
        unwrappingTokensAmountsOut = expectedAmountsOut;
        unwrappingTokensGasUsed = gasUsed;
      });
    });

    context('exit to main tokens directly', async () => {
      it('should exit pool correctly', async () => {
        const { expectedAmountsOut, gasUsed } = await testGeneralisedExit(
          pool,
          pools,
          signer,
          mainExitAmount.toString(),
          simulationType,
          false
        );
        mainTokensAmountsOut = expectedAmountsOut;
        mainTokensGasUsed = gasUsed;
      });
    });

    context('exit by unwrapping vs exit to main tokens', async () => {
      it('should return similar amounts (proportional to the input)', async () => {
        mainTokensAmountsOut.forEach((amount, i) => {
          const unwrappedAmount = BigNumber.from(
            unwrappingTokensAmountsOut[i]
          ).div(amountRatio);
          expect(
            accuracy(unwrappedAmount, BigNumber.from(amount))
          ).to.be.closeTo(1, 1e-4); // inaccuracy should not be over 1 bps
        });
      });
      it('should spend more gas when unwrapping tokens', async () => {
        expect(unwrappingTokensGasUsed.gt(mainTokensGasUsed)).to.be.true;
      });
    });
  });
});
