import { Pool } from '@/types';
import { calculateInvariant } from '@/pool-weighted/calculate-invariant';
import { parsePoolInfoForProtocolFee } from '@/lib/utils';

export default class WeightedV1ProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfoForProtocolFee(pool);
    const currentInvariant = calculateInvariant(parsedPool);
    return BigInt(0);
  }
}
