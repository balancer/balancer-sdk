import * as emissions from '@/modules/data/bal/emissions';
import { Findable, LiquidityGauge } from '@/types';

/**
 * Returns BAL emissions per pool
 */
export class EmissionsService {
  constructor(private liquidityGaugesRepository: Findable<LiquidityGauge>) {}

  async relativeWeight(poolId: string): Promise<number> {
    const gauge = await this.liquidityGaugesRepository.findBy('poolId', poolId);

    if (gauge) {
      return gauge.relativeWeight;
    }

    return 0;
  }

  async weekly(poolId: string): Promise<number> {
    const perWeek = emissions.weekly();
    const relativeWeight = await this.relativeWeight(poolId);

    return perWeek * relativeWeight;
  }
}
