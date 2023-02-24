import { Pool } from '@/types';
import { parsePoolInfoForProtocolFee } from '@/lib/utils';
import { calculateBalanceGivenInvariantAndAllOtherBalances } from '@/pool-stable/calculate-balance-given-invariant';
import { expect } from 'chai';
import StableProtocolFee from '@/pool-stable/protocol-fee';

const pool = {
  amp: '50.0',
  id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
  address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
  poolType: 'MetaStable',
  swapFee: '0.0004',
  totalShares: '169687.103280656830002475',
  lastJoinExitInvariant: '100000000000000000000000',
  tokens: [
    {
      address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
      balance: '81391.348751687990895314',
      decimals: 18,
      weight: null,
      priceRate: '1.070274551073343913',
    },
    {
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      balance: '85441.00300268083736699',
      decimals: 18,
      weight: null,
      priceRate: '1',
    },
  ],
  tokensList: [
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ],
  totalWeight: '0',
  expiryTime: null,
  unitSeconds: null,
  principalToken: null,
  baseToken: null,
  swapEnabled: true,
  wrappedIndex: 0,
  mainIndex: 0,
  lowerTarget: null,
  upperTarget: null,
} as unknown as Pool;

describe('calculate protocol fee amount of the stable pool', () => {
  const feeToPay = StableProtocolFee.calculateProtocolFees(pool);
  const expectedFeeToPay = BigInt('14511018437768543911712');
  expect(feeToPay).to.be.equal(expectedFeeToPay);
});
