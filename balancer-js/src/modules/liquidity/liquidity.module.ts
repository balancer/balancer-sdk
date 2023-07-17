import { Findable, Pool, PoolToken, Price } from '@/types';
import { PoolAttribute } from '../data';
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
    private tokenPrices: Findable<Price>
  ) {}

  async getLiquidity(pool: Pool): Promise<string> {
    // Remove any tokens with same address as pool as they are pre-printed BPT
    const parsedTokens = pool.tokens.filter((token) => {
      return token.address !== pool.address;
    });

    // For all tokens that are pools (BPT), recurse into them and fetch their liquidity
    const subPoolLiquidity = await Promise.all(
      parsedTokens.map(async (token) => {
        const pool = await this.pools.findBy('address', token.address);
        if (!pool) return;

        const liquidity = parseFixed(await this.getLiquidity(pool), SCALE);
        const totalBPT = parseFixed(pool.totalShares, SCALE);
        const bptInParentPool = parseFixed(token.balance, SCALE);
        const liquidityInParentPool = totalBPT.eq(0)
          ? 0
          : liquidity.mul(bptInParentPool).div(totalBPT);

        return {
          address: pool.address,
          liquidity: liquidityInParentPool.toString(),
        };
      })
    );

    const totalSubPoolLiquidity = subPoolLiquidity.reduce(
      (totalLiquidity, subPool) => {
        return totalLiquidity.add(
          subPool ? subPool.liquidity : BigNumber.from(0)
        );
      },
      BigNumber.from(0)
    );

    // Filter tokens within pool that are not BPT themselves
    const nonPoolTokens = parsedTokens.filter((token) => {
      return !subPoolLiquidity.find((pool) => pool?.address === token.address);
    });

    // Update price using tokenPrices repository
    const nonPoolTokensWithUpdatedPrice: PoolToken[] = await Promise.all(
      nonPoolTokens.map(async (token) => {
        const tokenPrice = await this.tokenPrices.find(token.address);
        const poolToken: PoolToken = {
          address: token.address,
          decimals: token.decimals,
          priceRate: token.priceRate,
          price: (tokenPrice?.usd && tokenPrice) || {
            usd: token.token?.latestUSDPrice,
          },
          balance: token.balance,
          weight: token.weight,
        };
        return poolToken;
      })
    );

    // TODO: Just in case we need it soon. Otherwise remove without mercy.
    // Any of the tokens is missing the price, use subgraph totalLiquidity
    // if(nonPoolTokensWithUpdatedPrice.map((t) => t.price?.usd).indexOf(undefined) > -1) {
    //   return pool.totalLiquidity
    // }

    const tokenLiquidity = PoolTypeConcerns.from(
      pool.poolType
    ).liquidity.calcTotal(nonPoolTokensWithUpdatedPrice);

    const parsedTokenLiquidity = parseFixed(tokenLiquidity, SCALE);

    const totalLiquidity = totalSubPoolLiquidity.add(parsedTokenLiquidity);

    return formatFixed(totalLiquidity, SCALE);
  }

  async getBptPrice(pool: Pool): Promise<string> {
    const liquidity = await this.getLiquidity(pool);
    return (parseFloat(liquidity) / parseFloat(pool.totalShares)).toString();
  }
}
