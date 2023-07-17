import { BatchSwapBuilder } from './batch_swap_builder';
import { factories } from '@/test/factories';
import { SwapType } from '../types';
import { expect } from 'chai';
import { BigNumber } from '@ethersproject/bignumber';

describe('SwapBuilder', () => {
  const swapAmountForSwaps = BigNumber.from('10000');
  const returnAmountFromSwaps = BigNumber.from('10000');
  const swapInfo = factories.swapInfo.build({
    swapAmountForSwaps,
    returnAmountFromSwaps,
  });

  describe('.setLimits for GIVEN_IN', () => {
    const builder = new BatchSwapBuilder(swapInfo, SwapType.SwapExactIn, 1);

    it('for 1 bsp 0.01%', () => {
      const maxSlippage = 1;
      builder.setLimits(maxSlippage);
      expect(builder.limits).to.eql(['10000', '-9999']);
    });
  });

  describe('.setLimits for GIVEN_OUT', () => {
    const builder = new BatchSwapBuilder(swapInfo, SwapType.SwapExactOut, 1);

    it('for 1 bsp 0.01%', () => {
      const maxSlippage = 1;
      builder.setLimits(maxSlippage);
      expect(builder.limits).to.eql(['10001', '-10000']);
    });
  });
});
