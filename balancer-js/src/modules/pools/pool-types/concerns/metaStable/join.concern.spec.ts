import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { expect } from 'chai';

import {
  BalancerError,
  BalancerErrorCode,
  Network,
  PoolWithMethods,
} from '@/.';
import { TestPoolHelper } from '@/test/lib/utils';
import { TEST_BLOCK } from '@/test/lib/constants';

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
// This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
const blockNumber = TEST_BLOCK[network];
const testPoolId =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'; // Balancer stETH Stable Pool

describe('MetaStablePool - Join - Unit tests', () => {
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

  it('should return correct attributes for joining', async () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map((t, i) =>
      parseFixed((i * 100).toString(), t.decimals).toString()
    );
    const slippage = '6';
    const { attributes, functionName } = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );

    expect(functionName).to.eq('joinPool');
    expect(attributes.poolId).to.eq(testPoolId);
    expect(attributes.recipient).to.eq(signerAddress);
    expect(attributes.sender).to.eq(signerAddress);
    expect(attributes.joinPoolRequest.assets).to.deep.eq(pool.tokensList);
    expect(attributes.joinPoolRequest.fromInternalBalance).to.be.false;
    expect(attributes.joinPoolRequest.maxAmountsIn).to.deep.eq(amountsIn);
  });
  it('should fail when joining with wrong amounts array length', () => {
    const tokensIn = pool.tokensList;
    const amountsIn = [parseFixed('1', pool.tokens[0].decimals).toString()];
    const slippage = '0';
    let errorMessage;
    try {
      pool.buildJoin(signerAddress, tokensIn, amountsIn, slippage);
    } catch (error) {
      errorMessage = (error as Error).message;
    }
    expect(errorMessage).to.contain(
      BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
    );
  });
  it('should encode the same for different array sorting', () => {
    const tokensIn = pool.tokensList;
    const amountsIn = pool.tokens.map(({ decimals }, i) =>
      parseFixed((i * 100).toString(), decimals).toString()
    );
    const slippage = '1';
    const attributesA = pool.buildJoin(
      signerAddress,
      tokensIn,
      amountsIn,
      slippage
    );
    const attributesB = pool.buildJoin(
      signerAddress,
      tokensIn.reverse(),
      amountsIn.reverse(),
      slippage
    );
    expect(attributesA).to.deep.eq(attributesB);
  });
});
