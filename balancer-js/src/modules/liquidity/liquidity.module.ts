import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { BalancerSdkConfig, TokenBalance } from '@/types';
import { Pools } from '@/modules/pools/pools.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { TokenProvider } from '../data-providers/tokens/provider.interface';
import { PoolProvider } from '../data-providers/pools/provider.interface';

export class Liquidity {
    private pools: PoolProvider;
    private tokens: TokenProvider;

    constructor(
        config: BalancerSdkConfig,
        poolProvider: PoolProvider,
        tokenProvider: TokenProvider
    ) {
        this.pools = poolProvider;
        this.tokens = tokenProvider;
    }

    async getLiquidity(pool: SubgraphPoolBase): Promise<string> {
        const ETHUSDPriceSum = ['USDC', 'DAI', 'USDT']
            .map((symbol) => {
                const token = this.tokens.getBySymbol(symbol);
                if (token?.price) {
                    return parseFixed(token.price, 18);
                }
                return BigNumber.from('1');
            })
            .reduce((prev, cur) => {
                return prev.add(cur);
            }, BigNumber.from(0));
        const ETHUSDPrice = BigNumber.from(ETHUSDPriceSum).div('3');

        const tokenBalances: TokenBalance[] = pool.tokens.map((token) => {
            const tokenDetails = this.tokens.get(token.address);
            if (!tokenDetails) {
                console.error(`Could not find token: ${token.address}`);
            }
            const price = parseFixed('1', 18)
                .mul(ETHUSDPrice)
                .div(parseFixed(tokenDetails?.price || '1', 18));
            const tokenBalance: TokenBalance = {
                token: {
                    address: token.address,
                    decimals: token.decimals,
                    priceRate: token.priceRate,
                    price: formatFixed(price, 18),
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
