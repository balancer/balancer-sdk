// yarn test:only ./src/modules/pools/pool-types/concerns/linear/exit.concern.spec.ts
import { expect } from 'chai';
import { parseEther } from '@ethersproject/units';
import { AddressZero } from '@ethersproject/constants';

import { insert, Pool } from '@/.';

import { ExitExactBPTInParameters } from '../types';
import { getPoolFromFile } from '@/test/lib/utils';
import { LinearPoolExit } from './exit.concern';

const testPoolId =
  '0x3c640f0d3036ad85afa2d5a9e32be651657b874f00000000000000000000046b';
let pool: Pool;
let bptIndex: number;
const exiter = AddressZero;
const concern = new LinearPoolExit();

describe('Linear Pool exits', () => {
  before(async () => {
    pool = await getPoolFromFile(testPoolId, 1);
    bptIndex = pool.tokensList.indexOf(pool.address);
  });

  context('Recovery Exit', async () => {
    let defaultParams: Pick<
      ExitExactBPTInParameters,
      'exiter' | 'pool' | 'bptIn' | 'slippage' | 'toInternalBalance'
    >;

    before(() => {
      defaultParams = {
        exiter,
        pool,
        bptIn: String(parseEther('10')),
        slippage: '100',
        toInternalBalance: false,
      };
    });

    it('should return correct attributes for exiting', async () => {
      const { attributes, functionName, minAmountsOut } =
        concern.buildRecoveryExit({
          ...defaultParams,
        });

      expect(functionName).to.eq('exitPool');
      expect(attributes.poolId).to.eq(testPoolId);
      expect(attributes.recipient).to.eq(exiter);
      expect(attributes.sender).to.eq(exiter);
      expect(attributes.exitPoolRequest.assets).to.deep.eq(pool.tokensList);
      expect(attributes.exitPoolRequest.toInternalBalance).to.be.false;
      expect(attributes.exitPoolRequest.minAmountsOut).to.deep.eq(
        insert(minAmountsOut, bptIndex, '0')
      );
    });
  });
});
