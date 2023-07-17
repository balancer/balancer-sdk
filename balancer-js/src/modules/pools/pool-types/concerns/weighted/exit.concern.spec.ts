// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/exit.concern.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';

import { Network, PoolWithMethods } from '@/.';
import { TestPoolHelper } from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';
import { TEST_BLOCK } from '@/test/lib/constants';

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
// This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
const blockNumber = TEST_BLOCK[network];
const testPoolId =
  '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019';

describe('WeightedPool exits', () => {
  let pool: PoolWithMethods;
  const signerAddress = AddressZero;
  beforeEach(async function () {
    const testPoolHelper = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );
    pool = await testPoolHelper.getPool();
  });

  it('should fail due to conflicting inputs', () => {
    let errorMessage = '';
    const bptIn = parseFixed('10', 18).toString();
    const slippage = '100';
    try {
      pool.buildExitExactBPTIn(
        signerAddress,
        bptIn,
        slippage,
        false,
        AddressZero
      );
    } catch (error) {
      errorMessage = (error as Error).message;
    }
    expect(errorMessage).to.eql(
      'shouldUnwrapNativeAsset and singleTokenOut should not have conflicting values'
    );
  });
  it('should automatically sort tokens/amounts in correct order', async () => {
    const tokensOut = pool.tokensList;
    const amountsOut = pool.tokens.map((t, i) =>
      parseFixed((i * 100).toString(), t.decimals).toString()
    );
    const slippage = '10';
    // TokensIn are already ordered as required by vault
    const attributesA = pool.buildExitExactTokensOut(
      signerAddress,
      tokensOut,
      amountsOut,
      slippage
    );
    // TokensIn are not ordered as required by vault and will be sorted correctly
    const attributesB = pool.buildExitExactTokensOut(
      signerAddress,
      tokensOut.reverse(),
      amountsOut.reverse(),
      slippage
    );
    expect(attributesA).to.deep.eq(attributesB);
  });
});
