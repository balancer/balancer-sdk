import { proportionalAmounts } from './index';
import { expect } from 'chai';

const pool = {
  id: '0x0000000000000000000000000000000000000000',
  tokens: [
    {
      address: '0x0000000000000000000000000000000000000001',
      decimals: 6,
      balance: '10',
    },
    {
      address: '0x0000000000000000000000000000000000000002',
      decimals: 18,
      balance: '20',
    },
    {
      address: '0x0000000000000000000000000000000000000003',
      decimals: 18,
      balance: '30',
    },
  ],
};

describe('proportional amounts', () => {
  it('should return the correct proportional amounts', () => {
    const { amounts } = proportionalAmounts(
      pool,
      '0x0000000000000000000000000000000000000001',
      '1'
    );
    expect(amounts).to.eql(['1', '2000000000000', '3000000000000']);
  });

  it('should throw an error if the token is not found in the pool', () => {
    expect(() => {
      proportionalAmounts(
        pool,
        '0x0000000000000000000000000000000000000004',
        '1'
      );
    }).to.throw('Token not found in pool');
  });
});
