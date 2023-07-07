// yarn test:only ./src/modules/exits/exitsProportional.module.integration.spec.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { Network } from '@/.';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
import { testFlow, Pool } from './testHelper';

dotenv.config();

const network = Network.MAINNET;
const blockNumber = TEST_BLOCK[network];
const slippage = '10'; // 10 bps = 0.1%
const addresses = ADDRESSES[network];
const poolAddresses = Object.values(addresses).map(
  (address) => address.address
);

interface Test {
  description: string;
  pool: Pool;
  amount: string;
}

const runTests = async (tests: Test[]) => {
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    it(test.description, async () => {
      await testFlow(
        test.pool,
        slippage,
        test.amount,
        [],
        network,
        blockNumber,
        poolAddresses
      );
    }).timeout(120000);
  }
};

describe('generalised exit execution', async () => {
  context('composable stable pool - non-boosted', async () => {
    const testPool = addresses.wstETH_rETH_sfrxETH;
    await runTests([
      {
        description: 'exit pool',
        pool: {
          id: testPool.id,
          address: testPool.address,
          slot: testPool.slot,
        },
        amount: parseFixed('0.01', testPool.decimals).toString(),
      },
    ]);
  });
  context('composable stable pool - boosted', async () => {
    const testPool = addresses.bbgusd;
    await runTests([
      {
        description: 'exit pool',
        pool: {
          id: testPool.id,
          address: testPool.address,
          slot: testPool.slot,
        },
        amount: parseFixed('0.01', testPool.decimals).toString(),
      },
    ]);
  });
  context('weighted with boosted', async () => {
    const testPool = addresses.STG_BBAUSD;
    await runTests([
      {
        description: 'exit pool',
        pool: {
          id: testPool.id,
          address: testPool.address,
          slot: testPool.slot,
        },
        amount: parseFixed('25.111', testPool.decimals).toString(),
      },
    ]);
  });
});
