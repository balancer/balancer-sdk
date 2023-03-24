import dotenv from 'dotenv';
import { expect } from 'chai';
import { Relayer } from './relayer.module';

dotenv.config();

describe('relayer module', () => {
  context('chainedRef', () => {
    it('should be a chained ref', () => {
      const key = '27';
      const keyRef = Relayer.toChainedReference(key);
      expect(Relayer.isChainedReference(keyRef.toString())).to.be.true;
    });
    it('should not be a chained ref', () => {
      const key = '27';
      expect(Relayer.isChainedReference(key)).to.be.false;
    });
  });
});
