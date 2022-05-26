import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { TokenPriceData } from '@/types';
import { TokenPriceProvider } from './provider.interface';

export class StaticTokenPriceProvider implements TokenPriceProvider {
    constructor(private tokenPrices: TokenPriceData[]) {
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
            const tokenPrice = this.find(address);
            if (tokenPrice?.ofNativeAsset) {
                const scaledPrice = parseFixed(tokenPrice.ofNativeAsset, 18);
                assetValueSum = assetValueSum.add(scaledPrice);
                assetsAvailable++;
            }
        });

        const NativeAssetUSDPrice = assetValueSum.div(assetsAvailable);

        this.tokenPrices = this.tokenPrices.map((tokenPrice) => {
            if (tokenPrice.ofNativeAsset) {
                const usdPrice = parseFixed('1', 20)
                    .mul(NativeAssetUSDPrice)
                    .div(parseFixed(tokenPrice.ofNativeAsset, 20))
                    .toString();
                tokenPrice.inUSD = formatFixed(usdPrice, 18);
            }

            return tokenPrice;
        });
    }

    find(address: string): TokenPriceData | undefined {
        return this.tokenPrices.find((tokenPrice) => {
            return tokenPrice.address.toLowerCase() === address.toLowerCase();
        });
    }
}
