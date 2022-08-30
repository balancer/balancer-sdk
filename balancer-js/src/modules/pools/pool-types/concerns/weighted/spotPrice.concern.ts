import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';
import { Pool } from '@/types';

export class WeightedPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    /*
      id: string;
      address: string;
      poolType: PoolType;
      swapFee: string;
      swapEnabled: boolean;
      totalShares: string;
      tokensList: string[];
      amp?: string;

      owner?: string;
      factory?: string;
      tokens: PoolToken[];
      tokenAddresses?: string[];
      totalLiquidity?: string;
      totalSwapFee?: string;
      totalSwapVolume?: string;
      onchain?: OnchainPoolData;
      createTime?: number;
      mainTokens?: string[];
      wrappedTokens?: string[];
      unwrappedTokens?: string[];
      isNew?: boolean;
      volumeSnapshot?: string;
      feesSnapshot?: string;
      boost?: string;
      symbol?: string;
    }
    interface SubgraphPoolBase {
        id: string;
        address: string;
        poolType: string;
        swapFee: string;
        swapEnabled: boolean;
        totalShares: string;
        tokensList: string[];
        amp?: string;

        totalWeight?: string;
        expiryTime?: number;
        unitSeconds?: number;
        principalToken?: string;
        baseToken?: string;
        mainIndex?: number;
        wrappedIndex?: number;
        lowerTarget?: string;
        upperTarget?: string;
        sqrtAlpha?: string;
        sqrtBeta?: string;
        root3Alpha?: string;
        tokens: SubgraphToken[];
    }

    declare type SubgraphToken = {
        address: string;
        balance: string;
        decimals: number;
        priceRate: string;
        weight: string | null;
    };

    export interface Token {
      address: string;
      decimals?: number;
      symbol?: string;
      price?: Price;
    }

    export interface PoolToken extends Token {
      balance: string;
      priceRate?: string;
      weight?: string | null;
    }
    */
    const weightedPool = WeightedPool.fromPool(pool as SubgraphPoolBase);
    const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
    return weightedPool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
