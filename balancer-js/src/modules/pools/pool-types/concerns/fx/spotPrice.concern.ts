import { SpotPriceConcern } from '@/modules/pools/pool-types/concerns/types';

export class FXSpotPriceConcern implements SpotPriceConcern {
  calcPoolSpotPrice(): string {
    throw new Error('FXSpotPriceConcern Not implemented');
  }
}
