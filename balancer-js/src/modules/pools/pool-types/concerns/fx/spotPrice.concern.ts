import { SpotPriceConcern } from '@/modules/pools/pool-types/concerns/types';
import { Pool } from '@/types';

export class FXSpotPriceConcern implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    console.log(tokenIn, tokenOut, pool);
    throw new Error('Not implemented');
  }
}
