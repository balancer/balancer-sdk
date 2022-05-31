import { BatchSwapBuilder } from './batch_swap_builder';
import { factories } from '@/test/factories';
import { SwapType } from '../types';
import { expect } from 'chai';
import { BigNumber } from '@ethersproject/bignumber';

describe('SwapBuilder', () => {
  const swapAmountForSwaps = BigNumber.from('1000');
  const returnAmountFromSwaps = BigNumber.from('2000');
  const swapInfo = factories.swapInfo.build({
    swapAmountForSwaps,
    returnAmountFromSwaps,
  });

  describe('.setLimits for GIVEN_IN', () => {
    const builder = new BatchSwapBuilder(swapInfo, SwapType.SwapExactIn, 1);

    it('for 1 bsp 0.01%', () => {
      const maxSlippage = 1;
      builder.setLimits(maxSlippage);
      expect(builder.limits).to.eql([
        swapAmountForSwaps.toString(),
        returnAmountFromSwaps
          .mul(1e3 - maxSlippage)
          .div(1e3)
          .mul(-1)
          .toString(),
      ]);
    });
  });

  describe('.setLimits for GIVEN_OUT', () => {
    const builder = new BatchSwapBuilder(swapInfo, SwapType.SwapExactOut, 1);

    it('for 1 bsp 0.01%', () => {
      const maxSlippage = 1;
      builder.setLimits(maxSlippage);
      expect(builder.limits).to.eql([
        swapAmountForSwaps
          .mul(1e3 + maxSlippage)
          .div(1e3)
          .toString(),
        returnAmountFromSwaps.mul(-1).toString(),
      ]);
    });
  });
});
