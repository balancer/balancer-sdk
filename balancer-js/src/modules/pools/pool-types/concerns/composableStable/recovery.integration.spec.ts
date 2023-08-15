// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/recovery.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  getPoolAddress,
  Network,
  PoolWithMethods,
  GraphQLArgs,
  GraphQLQuery,
} from '@/.';
import { forkSetup } from '@/test/lib/utils';
import { testRecoveryExit } from '@/test/lib/exitHelper';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
// This pool has active rates which is needed for tests
const testPoolId =
  '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f';
const blockNumber = 46244955;
let pool: PoolWithMethods | undefined;

describe('recovery', () => {
  // We have to reset the fork between each test as pool value changes after tx is submitted
  beforeEach(async () => {
    // Setup forked network, set initial token balances and allowances
    await forkSetup(
      signer,
      [getPoolAddress(testPoolId)],
      [0],
      [parseFixed('10000', 18).toString()],
      jsonRpcUrl as string,
      blockNumber
    );
    const subgraphArgs: GraphQLArgs = {
      where: {
        id: {
          in: [testPoolId],
        },
      },
      block: { number: blockNumber },
    };

    const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
    const balancer = new BalancerSDK({
      network,
      rpcUrl,
      subgraphQuery,
    });

    pool = await balancer.pools.find(testPoolId);
  });

  context('buildRecoveryExit - no rate issues', async () => {
    it('should recovery exit', async () => {
      if (!pool) throw Error('Pool not found');
      const bptIn = parseFixed('1.34', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
  });
});
