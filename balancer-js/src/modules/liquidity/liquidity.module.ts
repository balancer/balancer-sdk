import {
    BigNumber,
    parseFixed,
    formatFixed,
    BigNumberish,
} from '@ethersproject/bignumber';
import { BalancerSdkConfig, TokenBalance, TokenPrice } from '@/types';
import { Pools } from '@/modules/pools/pools.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { TokenProvider } from '../data-providers/token/provider.interface';
import { PoolProvider } from '../data-providers/pool/provider.interface';
import { TokenPriceProvider } from '../data-providers/token-price/provider.interface';
import { PoolType } from '../pools/types';
import { Zero } from '@ethersproject/constants';

export interface PoolLiquidity {
    address: string;
    liquidity: BigNumberish;
}

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

        // For all tokens that are pools, recurse into them and fetch their liquidity
        const subPoolLiquidity = await Promise.all(
            parsedTokens.map(async (subPool) => {
                const pool = await this.pools.findBy(
                    'address',
                    subPool.address
                );
                let liquidity = '0';
                if (pool) {
                    liquidity = await this.getLiquidity(pool);
                }

                return {
                    address: subPool.address,
                    liquidity,
                };
            })
        );

        const totalSubPoolLiquidity = subPoolLiquidity.reduce(
            (totalLiquidity, pool) => {
                const scaledLiquidity = parseFixed(pool.liquidity, 36);
                return totalLiquidity.add(scaledLiquidity);
            },
            Zero
        );

        const nonPoolTokens = parsedTokens.filter((token) => {
            return (
                subPoolLiquidity.find((pool) => pool.address === token.address)
                    ?.liquidity === '0'
            );
        });

        const tokenBalances: TokenBalance[] = await Promise.all(
            nonPoolTokens.map(async (token) => {
                const tokenDetails = await this.tokens.find(token.address);
                if (!tokenDetails) {
                    throw new Error(
                        `Unable to calculate balance. Could not find token: ${token.address}`
                    );
                }

                const tokenPrice = await this.tokenPrices.find(
                    tokenDetails.address
                );
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
            })
        );

        const tokenLiquidity =
            Pools.from(pool).liquidity.calcTotal(tokenBalances);

        const totalLiquidity = formatFixed(
            BigNumber.from(totalSubPoolLiquidity).add(
                parseFixed(tokenLiquidity, 36)
            ),
            36
        );

        return totalLiquidity;
    }
}
