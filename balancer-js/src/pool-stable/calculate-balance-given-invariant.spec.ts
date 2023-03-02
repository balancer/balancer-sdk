import { Pool } from '@/types';
import { calculateBalanceGivenInvariantAndAllOtherBalances } from '@/pool-stable/calculate-balance-given-invariant';
import { parsePoolInfo, parsePoolInfoForProtocolFee } from '@/lib/utils';
import { expect } from 'chai';

const pool = {
  amp: '50.0',
  id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
  address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
  poolType: 'MetaStable',
  swapFee: '0.0004',
  totalShares: '169687.103280656830002475',
  lastJoinExitInvariant: '2000000000000000000000000',
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

describe('calculate balance given invariant', () => {
  const {
    parsedAmp,
    upScaledBalances,
    lastJoinExitInvariant,
    higherBalanceTokenIndex,
  } = parsePoolInfo(pool);
  const balance = calculateBalanceGivenInvariantAndAllOtherBalances({
    amplificationParameter: BigInt(parsedAmp),
    balances: upScaledBalances.map(BigInt),
    invariant: BigInt(lastJoinExitInvariant),
    tokenIndex: higherBalanceTokenIndex,
  });
  const expectedBalance = BigInt('1914498997180719355831403');
  expect(balance).to.be.equal(expectedBalance);
});
