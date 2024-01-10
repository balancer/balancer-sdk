// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/recovery.integration.spec.ts
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import { BalancerSDK, PoolWithMethods, getPoolAddress } from '@/.';
import { forkSetup } from '@/test/lib/utils';
import { assertRecoveryExit } from '@/test/lib/exitHelper';

const network = 137; // POLYGON;
const jsonRpcUrl = 'https://rpc.ankr.com/polygon';
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

let balancer: BalancerSDK;

const poolIds = [
  '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f', // V1
  '0xe2dc0e0f2c358d6e31836dee69a558ab8d1390e70000000000000000000009fa', // V2
  '0x10b040038f87219d9b42e025e3bd9b8095c87dd9000000000000000000000b11', // V3
  '0xa2ccad543fbe9332b87910beabd941b86dd5f762000000000000000000000b5c', // V4
];

describe.skip('ComposableStable - recovery', () => {
  before(async () => {
    await forkSetup(
      signer,
      poolIds.map((id) => getPoolAddress(id)),
      Array(poolIds.length).fill(0),
      Array(poolIds.length).fill(parseFixed('10000', 18).toString()),
      jsonRpcUrl as string
    );

    const subgraphArgs = {
      where: {
        id: {
          in: poolIds,
        },
      },
    };

    const subgraphQuery = { args: subgraphArgs, attrs: {} };

    balancer = new BalancerSDK({
      network,
      rpcUrl,
      subgraphQuery,
    });
  });

  context('Recovery exit', async () => {
    for (const [i, poolId] of poolIds.entries()) {
      it(`works for V${i + 1}`, async () => {
        const pool = (await balancer.pools.find(poolId)) as PoolWithMethods;
        const bptAmount = parseFixed('0.00001', 18).toString();
        const slippage = '10'; // 10 bps = 0.1%
        const signerAddr = await signer.getAddress();

        const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
          pool.buildRecoveryExit(signerAddr, bptAmount, slippage);

        await assertRecoveryExit(
          signerAddr,
          slippage,
          to,
          data,
          minAmountsOut,
          expectedAmountsOut,
          priceImpact,
          pool,
          signer,
          bptAmount
        );
      });
    }
  });
});
