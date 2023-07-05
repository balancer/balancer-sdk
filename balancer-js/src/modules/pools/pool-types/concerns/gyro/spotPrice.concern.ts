import { SpotPriceConcern } from '@/modules/pools/pool-types/concerns/types';
import { Pool } from '@/types';

export class GyroSpotPriceConcern implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    throw new Error('GyroSpotPriceConcern Not implemented');
  }
}
