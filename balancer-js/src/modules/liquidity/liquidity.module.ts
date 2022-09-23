import { Findable, Pool, PoolToken } from '@/types';
import { PoolAttribute } from '../data';
import { TokenPriceProvider } from '../data';
import { PoolTypeConcerns } from '../pools/pool-type-concerns';
import { BigNumber } from '@ethersproject/bignumber';
import { formatFixed, parseFixed } from '@/lib/utils/math';

const SCALE = 18;

export interface PoolBPTValue {
  address: string;
  liquidity: string;
}

export class Liquidity {
  constructor(
    private pools: Findable<Pool, PoolAttribute>,
    private tokenPrices: TokenPriceProvider
  ) {}

  async getLiquidity(pool: Pool): Promise<string> {
    // Remove any tokens with same address as pool as they are pre-printed BPT
    const parsedTokens = pool.tokens.filter((token) => {
      return token.address !== pool.address;
    });

    // For all tokens that are pools, recurse into them and fetch their liquidity
    const subPoolLiquidity = await Promise.all(
      parsedTokens.map(async (token) => {
        const pool = await this.pools.findBy('address', token.address);
        if (!pool) return;

        const liquidity = parseFixed(await this.getLiquidity(pool), SCALE);
        const totalBPT = parseFixed(pool.totalShares, SCALE);
        const bptInParentPool = parseFixed(token.balance, SCALE);
        const liquidityInParentPool = liquidity
          .mul(bptInParentPool)
          .div(totalBPT);

        return {
          address: pool.address,
          liquidity: liquidityInParentPool.toString(),
        };
      })
    );

    const totalSubPoolLiquidity = subPoolLiquidity.reduce(
      (totalLiquidity, subPool) => {
        if (!subPool) return BigNumber.from(0);
        return totalLiquidity.add(subPool.liquidity);
      },
      BigNumber.from(0)
    );

    const nonPoolTokens = parsedTokens.filter((token) => {
      return !subPoolLiquidity.find((pool) => pool?.address === token.address);
    });

    const tokenBalances: PoolToken[] = await Promise.all(
      nonPoolTokens.map(async (token) => {
        const tokenPrice = await this.tokenPrices.find(token.address);
        const poolToken: PoolToken = {
          address: token.address,
          decimals: token.decimals,
          priceRate: token.priceRate,
          price: tokenPrice,
          balance: token.balance,
          weight: token.weight,
        };
        return poolToken;
      })
    );

    const tokenLiquidity = PoolTypeConcerns.from(
      pool.poolType
    ).liquidity.calcTotal(tokenBalances);

    const tl = parseFixed(tokenLiquidity, SCALE);

    const totalLiquidity = totalSubPoolLiquidity.add(tl);

    return formatFixed(totalLiquidity, SCALE);
  }
}
