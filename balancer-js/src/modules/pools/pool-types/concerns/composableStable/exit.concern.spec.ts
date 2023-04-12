// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exit.concern.spec.ts
import { expect } from 'chai';
import { BigNumber } from '@ethersproject/bignumber';
import { parseEther } from '@ethersproject/units';
import { AddressZero } from '@ethersproject/constants';
import { BALANCER_NETWORK_CONFIG, insert, Pool, removeItem } from '@/.';

import {
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
} from '../types';
import { getPoolFromFile } from '@/test/lib/utils';
import { ComposableStablePoolExit } from './exit.concern';

const testPoolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
let pool: Pool;
let bptIndex: number;
const exiter = AddressZero;
const { wrappedNativeAsset } = BALANCER_NETWORK_CONFIG[1].addresses.tokens;
const concern = new ComposableStablePoolExit();

describe('Composable Stable Pool exits', () => {
  before(async () => {
    pool = await getPoolFromFile(testPoolId, 1);
    bptIndex = pool.tokensList.indexOf(pool.address);
  });

  context('exitExactBPTIn', async () => {
    let defaultParams: ExitExactBPTInParameters;

    before(() => {
      defaultParams = {
        exiter,
        pool,
        bptIn: String(parseEther('10')),
        slippage: '100',
        shouldUnwrapNativeAsset: false,
        wrappedNativeAsset,
        toInternalBalance: false,
      };
    });

    it('should fail due to conflicting inputs', () => {
      let errorMessage = '';
      try {
        concern.buildExitExactBPTIn({
          ...defaultParams,
          singleTokenOut: AddressZero,
        });
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eql(
        'shouldUnwrapNativeAsset and singleTokenOut should not have conflicting values'
      );
    });

    it('should return correct attributes for exiting', async () => {
      const { attributes, functionName, minAmountsOut } =
        concern.buildExitExactBPTIn({
          ...defaultParams,
          singleTokenOut: pool.tokensList[1],
        });

      expect(functionName).to.eq('exitPool');
      expect(attributes.poolId).to.eq(testPoolId);
      expect(attributes.recipient).to.eq(exiter);
      expect(attributes.sender).to.eq(exiter);
      expect(attributes.exitPoolRequest.assets).to.deep.eq(pool.tokensList);
      expect(attributes.exitPoolRequest.toInternalBalance).to.be.false;
      expect(attributes.exitPoolRequest.minAmountsOut).to.deep.eq(
        insert(minAmountsOut, bptIndex, '0')
      );
    });
  });

  context('exitExactTokensOut', async () => {
    let defaultParams: ExitExactTokensOutParameters;

    before(() => {
      const tokensOut = removeItem(pool.tokensList, bptIndex);
      defaultParams = {
        exiter,
        pool,
        tokensOut,
        amountsOut: tokensOut.map((_, i) => String(parseEther(`${i * 100}`))),
        slippage: '100',
        wrappedNativeAsset,
        toInternalBalance: false,
      };
    });

    it('should automatically sort tokens/amounts in correct order', async () => {
      // TokensIn are already ordered as required by vault
      const attributesA = concern.buildExitExactTokensOut(defaultParams);

      // TokensIn are not ordered as required by vault and will be sorted correctly
      const attributesB = concern.buildExitExactTokensOut({
        ...defaultParams,
        tokensOut: defaultParams.tokensOut.slice().reverse(),
        amountsOut: defaultParams.amountsOut.slice().reverse(),
      });

      expect(attributesA).to.deep.eq(attributesB);
    });

    it('should return correct attributes for exiting', async () => {
      const { attributes, functionName } =
        concern.buildExitExactTokensOut(defaultParams);

      expect(functionName).to.eq('exitPool');
      expect(attributes.poolId).to.eq(testPoolId);
      expect(attributes.recipient).to.eq(exiter);
      expect(attributes.sender).to.eq(exiter);
      expect(attributes.exitPoolRequest.assets).to.deep.eq(pool.tokensList);
      expect(attributes.exitPoolRequest.toInternalBalance).to.be.false;
      const expectedAmountsOut = insert(
        defaultParams.amountsOut,
        bptIndex,
        '0'
      );

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
