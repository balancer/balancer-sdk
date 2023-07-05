import { SpotPriceConcern } from '@/modules/pools/pool-types/concerns/types';

export class GyroSpotPriceConcern implements SpotPriceConcern {
  calcPoolSpotPrice(): string {
    throw new Error('GyroSpotPriceConcern Not implemented');
  }
}
