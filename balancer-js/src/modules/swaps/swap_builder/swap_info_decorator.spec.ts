import { decorateSorSwapInfo } from './swap_info_decorator';
import { factories } from '@/test/factories';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';

describe('decorated SwapInfo', () => {
  const swapAmountForSwaps = BigNumber.from('100');
  const returnAmountFromSwaps = BigNumber.from('200');
  const swapInfo = factories.swapInfo.build({
    swapAmountForSwaps,
    returnAmountFromSwaps,
  });
  const sdkSwapInfo = decorateSorSwapInfo(swapInfo);

  it('.amountInForLimits is equal to swapAmountForSwaps', () => {
    expect(sdkSwapInfo.amountInForLimits.amount).to.eq(swapAmountForSwaps);
  });

  it('.amountOutForLimits is equal to returnAmountFromSwaps', () => {
    expect(sdkSwapInfo.amountOutForLimits.amount).to.eq(returnAmountFromSwaps);
  });

  context('when using relayer', () => {
    const swapInfo = factories.swapInfo.build({
      // stETH
      tokenIn: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    });
    const sdkSwapInfo = decorateSorSwapInfo(swapInfo);

    it('.tokenInForSwaps should be a wrapped token address', () => {
      expect(sdkSwapInfo.tokenInForSwaps).to.eq(
        // wstETH
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'
      );
    });
  });
});
