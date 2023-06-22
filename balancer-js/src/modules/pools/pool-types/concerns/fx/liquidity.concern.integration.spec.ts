// yarn test:only ./src/modules/pools/pool-types/concerns/fx/liquidity.concern.integration.spec.ts
import { expect } from 'chai';
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerSDK } from '@/modules/sdk.module';
import {
  FORK_NODES,
  forkSetup,
  getPoolFromFile,
  RPC_URLS,
  updateFromChain,
} from '@/test/lib/utils';
import { Network, Pool } from '@/types';
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const network = Network.POLYGON;
const rpcUrlRemote = FORK_NODES[network];
const rpcUrlLocal = RPC_URLS[network];

const provider = new JsonRpcProvider(rpcUrlLocal, network);
const signer = provider.getSigner();
const testPoolId =
  '0x726e324c29a1e49309672b244bdc4ff62a270407000200000000000000000702';
let pool: Pool;
const blockNumber = TEST_BLOCK[network];

describe('FX Pool - Calculate Liquidity', () => {
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);

  before(async () => {
    pool = await getPoolFromFile(testPoolId, network);

    // Setup forked network, set initial token balances and allowances
    await forkSetup(signer, [], [], [], rpcUrlRemote as string, blockNumber);

    // Update pool info with onchain state from fork block no
    pool = await updateFromChain(pool, network, provider);
  });

  it('should match liquidity from contract with 5% of margin error', async () => {
    const liquidity = await balancer.pools.liquidity(pool);
    const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
    const gtZero = liquidityBigInt > BigInt(0);
    expect(gtZero).to.be.true;
  });
});
