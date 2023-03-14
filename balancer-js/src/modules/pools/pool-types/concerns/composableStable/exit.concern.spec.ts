// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exit.concern.spec.ts
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';

import { insert, Network, PoolWithMethods, removeItem } from '@/.';
import { TestPoolHelper } from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
// This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
const blockNumber = 16350000;
const testPoolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';

describe('Composable Stable Pool exits', () => {
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
  context('exitExactBPTIn', async () => {
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
    it('should return correct attributes for exiting', async () => {
      const bptIn = parseFixed('10', 18).toString();
      const slippage = '10';
      const { attributes, functionName, minAmountsOut } =
        pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage,
          false,
          pool.tokensList[1]
        );

      expect(functionName).to.eq('exitPool');
      expect(attributes.poolId).to.eq(testPoolId);
      expect(attributes.recipient).to.eq(signerAddress);
      expect(attributes.sender).to.eq(signerAddress);
      expect(attributes.exitPoolRequest.assets).to.deep.eq(pool.tokensList);
      expect(attributes.exitPoolRequest.toInternalBalance).to.be.false;
      expect(attributes.exitPoolRequest.minAmountsOut).to.deep.eq(
        insert(minAmountsOut, pool.bptIndex, '0')
      );
    });
    it('should fail for proportional exit on composable V1', async () => {
      const bptIn = parseFixed('10', 18).toString();
      const slippage = '10';
      let errorMessage = '';
      try {
        pool.buildExitExactBPTIn(signerAddress, bptIn, slippage, false);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eql('Unsupported Exit Type For Pool');
    });
  });
  context('exitExactTokensOut', async () => {
    it('should automatically sort tokens/amounts in correct order', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed((i * 100).toString(), 18).toString()
      );
      const slippage = '7';
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
    it('should return correct attributes for exiting', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed((i * 100).toString(), 18).toString()
      );
      const slippage = '7';
      const { attributes, functionName } = pool.buildExitExactTokensOut(
        signerAddress,
        tokensOut,
        amountsOut,
        slippage
      );

      expect(functionName).to.eq('exitPool');
      expect(attributes.poolId).to.eq(testPoolId);
      expect(attributes.recipient).to.eq(signerAddress);
      expect(attributes.sender).to.eq(signerAddress);
      expect(attributes.exitPoolRequest.assets).to.deep.eq(pool.tokensList);
      expect(attributes.exitPoolRequest.toInternalBalance).to.be.false;
      const expectedAmountsOut = insert(amountsOut, pool.bptIndex, '0');
      // Issue with rounding means we are sometimes out by 1wei
      attributes.exitPoolRequest.minAmountsOut.forEach((a, i) => {
        const diff = BigNumber.from(expectedAmountsOut[i])
          .sub(a)
          .abs()
          .toNumber();
        expect(diff).to.be.lte(1);
      });
    });
  });
});
