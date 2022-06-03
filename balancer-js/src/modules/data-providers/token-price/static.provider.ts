import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Price, TokenPrices } from '@/types';
import { TokenPriceProvider } from './provider.interface';

const SCALING_FACTOR = 18;

export class StaticTokenPriceProvider implements TokenPriceProvider {
    constructor(private tokenPrices: TokenPrices) {
        this.calculateUSDPrices();
    }

    /**
     * Iterates through all tokens and calculates USD prices
     * based on data the tokens already have.
     */
    calculateUSDPrices(): void {
        const USDAssets = [
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ];
        let assetsAvailable = 0;
        let assetValueSum = BigNumber.from(0);

        USDAssets.forEach((address) => {
            const tokenPrice = this.tokenPrices[address];
            if (tokenPrice?.ETH) {
                const scaledPrice = parseFixed(tokenPrice?.ETH, SCALING_FACTOR);
                assetValueSum = assetValueSum.add(scaledPrice);
                assetsAvailable++;
            }
        });

        const NativeAssetUSDPrice = assetValueSum.div(assetsAvailable);

        for (const token in this.tokenPrices) {
            const price = this.tokenPrices[token];
            if (price.ETH && !price.USD) {
                const usdPrice = parseFixed('1', SCALING_FACTOR)
                    .mul(parseFixed(price.ETH, SCALING_FACTOR))
                    .div(NativeAssetUSDPrice)
                    .toString();
                price.USD = formatFixed(usdPrice, SCALING_FACTOR);
            }
        }
    }

    async find(address: string): Promise<Price | undefined> {
        const price = this.tokenPrices[address];
        if (!price) return;
        return price;
    }
}
