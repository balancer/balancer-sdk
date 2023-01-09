import * as emissions from '@/modules/data/bal/emissions';
import { factories } from '@/test/factories';
import { LiquidityGauge } from '@/types';
import { expect } from 'chai';
import { EmissionsService } from './';

const poolId = '1';
const relativeWeight = 0.1;
const gauge = factories.gaugesFactory.build({ poolId, relativeWeight });

const gaugesMap = new Map([['1', gauge]]);
const gauges = factories.data.findable<LiquidityGauge>(gaugesMap);
const service = new EmissionsService(gauges);
const total = emissions.weekly();

describe('EmissionsService', () => {
  context('with liquidity gauge', () => {
    it('.weekly returns a value', async () => {
      const bal = await service.weekly(poolId);
      expect(bal).to.eq(total * relativeWeight);
    });
  });

  context('without liquidity gauge', () => {
    it('.weekly returns 0', async () => {
      const bal = await service.weekly('abc');
      expect(bal).to.eq(0);
    });
  });
});
