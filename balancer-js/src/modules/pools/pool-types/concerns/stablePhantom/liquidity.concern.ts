import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';

export class StablePhantomPoolLiquidity implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    if (tokens.length > 0) {
      throw new Error(
        'Not Implemented - StablePhantom liquidity should all come from sub-pools.'
      );
    }

    return '0';
  }
}
