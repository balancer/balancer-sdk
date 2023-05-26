// yarn test:only ./src/modules/pools/pool-types/concerns/gyro/liquidity.concern.integration.spec.ts
import { expect } from 'chai';
import dotenv from 'dotenv';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';

import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { BalancerSDK } from '@/modules/sdk.module';
import {
  FORK_NODES,
  forkSetup,
  getPoolFromFile,
  RPC_URLS,
  updateFromChain,
} from '@/test/lib/utils';
import { Network, Pool } from '@/types';

dotenv.config();

describe('Gyro Pools - Calculate Liquidity', () => {
  const network = Network.POLYGON;
  const rpcUrlRemote = FORK_NODES[network];
  const rpcUrlLocal = RPC_URLS[network];
  const provider = new JsonRpcProvider(rpcUrlLocal, network);
  const signer = provider.getSigner();
  const blockNumber = 43015527;
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  let testPoolId: string;
  let pool: Pool;

  beforeEach(async () => {
    pool = await getPoolFromFile(testPoolId, network);

    // Setup forked network, set initial token balances and allowances
    await forkSetup(signer, [], [], [], rpcUrlRemote as string, blockNumber);

    // Update pool info with onchain state from fork block no
    pool = await updateFromChain(pool, network, provider);
  });

  context('GyroE Pools', () => {
    before(async () => {
      testPoolId =
        '0x97469e6236bd467cd147065f77752b00efadce8a0002000000000000000008c0';
    });

    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
      console.log('liquidityBigInt      ', liquidityBigInt);
      console.log('liquidityFromContract', liquidityFromContract);
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });

  context('Gyro V2 Pools', () => {
    before(async () => {
      testPoolId =
        '0xdac42eeb17758daa38caf9a3540c808247527ae3000200000000000000000a2b';
    });

    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();

      console.log('liquidityBigInt      ', liquidityBigInt);
      console.log('liquidityFromContract', liquidityFromContract);
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });

  context('Gyro V3 Pools', () => {
    before(async () => {
      testPoolId =
        '0x17f1ef81707811ea15d9ee7c741179bbe2a63887000100000000000000000799';
    });

    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
      console.log('liquidityBigInt      ', liquidityBigInt);
      console.log('liquidityFromContract', liquidityFromContract);
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });
});
