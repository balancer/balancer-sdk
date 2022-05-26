import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BalancerSdkConfig, TokenBalance, TokenPrice } from '@/types';
import { Pools } from '@/modules/pools/pools.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { TokenProvider } from '../data-providers/token/provider.interface';
import { PoolProvider } from '../data-providers/pool/provider.interface';
import { TokenPriceProvider } from '../data-providers/token-price/provider.interface';

export class Liquidity {
    private pools: PoolProvider;
    private tokens: TokenProvider;
    private tokenPrices: TokenPriceProvider;

    constructor(
        config: BalancerSdkConfig,
        poolProvider: PoolProvider,
        tokenProvider: TokenProvider,
        tokenPriceProvider: TokenPriceProvider
    ) {
        this.pools = poolProvider;
        this.tokens = tokenProvider;
        this.tokenPrices = tokenPriceProvider;
    }

    async getLiquidity(pool: SubgraphPoolBase): Promise<string> {
        const USDAssets = ['USDC', 'DAI', 'USDT'];
        let assetsAvailable = 0;
        let assetValueSum = BigNumber.from(0);

        USDAssets.forEach((symbol) => {
            const token = this.tokens.findBy('symbol', symbol);
            if (!token) return;

            const tokenPrice = this.tokenPrices.find(token.address);
            if (tokenPrice?.ofNativeAsset) {
                assetValueSum = assetValueSum.add(tokenPrice.ofNativeAsset);
                assetsAvailable++;
            }
        });

        const NativeAssetUSDPrice = assetValueSum.div(assetsAvailable);

        const tokenBalances: TokenBalance[] = pool.tokens.map((token) => {
            const tokenDetails = this.tokens.find(token.address);
            if (!tokenDetails) {
                throw new Error(
                    `Unable to calculate balance. Could not find token: ${token.address}`
                );
            }

            let price: TokenPrice | undefined;
            const tokenPrice = this.tokenPrices.find(tokenDetails.address);
            if (tokenPrice?.ofNativeAsset) {
                price = {
                    inUSD: parseFixed('1', 18)
                        .mul(NativeAssetUSDPrice)
                        .div(parseFixed(tokenPrice?.ofNativeAsset || '1', 18))
                        .toString(),
                    ofNativeAsset: tokenPrice.ofNativeAsset,
                };
            }

            const tokenBalance: TokenBalance = {
                token: {
                    address: token.address,
                    decimals: token.decimals,
                    priceRate: token.priceRate,
                    price: price,
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
