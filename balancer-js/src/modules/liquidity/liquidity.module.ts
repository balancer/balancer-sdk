import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BalancerSdkConfig, TokenBalance, TokenPrice } from '@/types';
import { Pools } from '@/modules/pools/pools.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { TokenProvider } from '../data-providers/token/provider.interface';
import { PoolProvider } from '../data-providers/pool/provider.interface';
import { TokenPriceProvider } from '../data-providers/token-price/provider.interface';

export class Liquidity {
    constructor(
        config: BalancerSdkConfig,
        private pools: PoolProvider,
        private tokens: TokenProvider,
        private tokenPrices: TokenPriceProvider
    ) {}

    async getLiquidity(pool: SubgraphPoolBase): Promise<string> {
        const tokenBalances: TokenBalance[] = pool.tokens.map((token) => {
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
