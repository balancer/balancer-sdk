import { reorderArrays } from '@/lib/utils/index';
import { assert, expect } from 'chai';

describe('reorderArrays', () => {
  context('ordering 3 arrays', () => {
    const reference = ['a', 'b', 'c', 'd', 'e', 'f'];
    const original = ['b', 'f', 'e', 'c', 'd', 'a'];
    const other1 = [2, 6, 5, 3, 4, 1]; // [1, 2, 3, 4, 5, 6]
    const other2 = [1, 2, 3, 4, 5, 6]; // [6, 1, 4, 5, 3, 2]
    const [result1, result2] = reorderArrays(
      reference,
      original,
      other1,
      other2
    );
    const expected1 = [1, 2, 3, 4, 5, 6];
    const expected2 = [6, 1, 4, 5, 3, 2];
    it('result1 should be equal expected1', () => {
      expect(result1.every((val, index) => val === expected1[index])).to.be
        .true;
    });
    it('result2 should be equal expected2', () => {
      expect(result2.every((val, index) => val === expected2[index])).to.be
        .true;
    });
  });
  context('invalid original', () => {
    const reference = ['a', 'b', 'c', 'd', 'e', 'f'];
    const original = ['b', 'f', 'e', 'c', 'd', 'x'];
    const other1 = [2, 6, 5, 3, 4, 1];
    const other2 = [1, 2, 3, 4, 5, 6];
    it('should throw error', () => {
      assert.throws(
        () => {
          reorderArrays(reference, original, other1, other2);
        },
        Error,
        'Invalid reference or original array'
      );
    });
  });
  context('length mismatch', () => {
    const reference = ['a', 'b', 'c', 'd', 'e', 'f'];
    const original = ['b', 'f', 'e', 'c', 'd', 'a'];
    const other1 = [2, 6, 5, 3, 4, 1];
    const other2 = [1, 2, 3, 4, 5];
    it('should throw error', () => {
      assert.throws(
        () => {
          reorderArrays(reference, original, other1, other2);
        },
        Error,
        'Array length mismatch'
      );
    });
  });
});
