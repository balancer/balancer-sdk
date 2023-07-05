import { SpotPriceConcern } from '@/modules/pools/pool-types/concerns/types';
import { Pool } from '@/types';

export class FXSpotPriceConcern implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    throw new Error('FXSpotPriceConcern Not implemented');
  }
}
