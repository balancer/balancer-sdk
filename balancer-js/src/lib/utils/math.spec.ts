import { expect } from 'chai';
import { parseFixed } from './math';

describe('utils/math', () => {
  describe('parseFixed', () => {
    it('Should work with simple integers', () => {
      const result = parseFixed('15');
      expect(result.toString()).to.be.eq('15');
    });

    it('Should work with decimal strings', () => {
      const result = parseFixed('15.123', 3);
      expect(result.toString()).to.be.eq('15123');
    });

    it('Should work with decimal strings that have too many decimals', () => {
      const result = parseFixed('15.123456', 3);
      expect(result.toString()).to.be.eq('15123');
    });
  });
});
