import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { subSlippage, addSlippage } from './slippageHelper';

describe('slippage helper', () => {
  const amount = BigNumber.from('100');
  const slippageAsBasisPoints = BigNumber.from('100'); // 1%
  const slippageAsPercentage = BigNumber.from('1'); // 1%

  describe('subSlippage', () => {
    context('when slippage input as basis points', () => {
      const result = subSlippage(amount, slippageAsBasisPoints).toString();
      it('should work', () => {
        expect(result).to.be.equal('99');
      });
    });
    context('when slippage input as percentage', () => {
      const result = subSlippage(amount, slippageAsPercentage).toString();
      it('should fail', () => {
        expect(result).to.be.not.equal('99');
      });
    });
  });

  describe('addSlippage', () => {
    context('when slippage input as basis points', () => {
      const result = addSlippage(amount, slippageAsBasisPoints).toString();
      it('should work', () => {
        expect(result).to.be.equal('101');
      });
    });
    context('when slippage input as percentage', () => {
      const result = addSlippage(amount, slippageAsPercentage).toString();
      it('should fail', () => {
        expect(result).to.be.not.equal('101');
      });
    });
  });
});
