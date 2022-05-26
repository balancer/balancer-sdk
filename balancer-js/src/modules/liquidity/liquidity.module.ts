import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { BalancerSdkConfig, TokenBalance, TokenPrice } from '@/types';
import { Pools } from '@/modules/pools/pools.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { TokenProvider } from '../data-providers/token/provider.interface';
import { PoolProvider } from '../data-providers/pool/provider.interface';
import { TokenPriceProvider } from '../data-providers/token-price/provider.interface';
import { PoolType } from '../pools/types';
import { Zero } from '@ethersproject/constants';

export class Liquidity {
    constructor(
        config: BalancerSdkConfig,
        private pools: PoolProvider,
        private tokens: TokenProvider,
        private tokenPrices: TokenPriceProvider
    ) {}

    async getLiquidity(pool: SubgraphPoolBase): Promise<string> {
        // Remove any tokens with same address as pool as they are pre-printed BPT
        const parsedTokens = pool.tokens.filter((token) => {
            return token.address !== pool.address;
        });

        if (pool.poolType == PoolType.StablePhantom) {
            // For a StablePhantom pool, each token is a pool, so fetch liquidity for those pools instead.
            const subPoolLiquidity = await Promise.all(
                parsedTokens.map(async (subPool) => {
                    const pool = this.pools.findBy('address', subPool.address);
                    if (!pool) {
                        throw new Error(
                            `Unable to calculate balance. Could not find sub-pool: ${subPool.address}`
                        );
                    }
                    return await this.getLiquidity(pool);
                })
            );

            const totalLiquidity = subPoolLiquidity.reduce(
                (totalLiquidity, poolLiquidity) => {
                    const scaledLiquidity = parseFixed(poolLiquidity, 36);
                    return totalLiquidity.add(scaledLiquidity);
                },
                Zero
            );

            return formatFixed(totalLiquidity, 36);
        }

        const tokenBalances: TokenBalance[] = parsedTokens.map((token) => {
            const tokenDetails = this.tokens.find(token.address);
            if (!tokenDetails) {
                throw new Error(
                    `Unable to calculate balance. Could not find token: ${token.address}`
                );
            }

            const tokenPrice = this.tokenPrices.find(tokenDetails.address);
            const tokenBalance: TokenBalance = {
                token: {
                    address: token.address,
                    decimals: token.decimals,
                    priceRate: token.priceRate,
                    price: {
                        inUSD: tokenPrice?.inUSD,
                    },
                },
                balance: token.balance,
                weight: token.weight
                    ? parseFixed(token.weight, 2).toString()
                    : '0',
            };
            return tokenBalance;
        });

        const totalLiquidity =
            Pools.from(pool).liquidity.calcTotal(tokenBalances);

        return totalLiquidity;
    }
}
