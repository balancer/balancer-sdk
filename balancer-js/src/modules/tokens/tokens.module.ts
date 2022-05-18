import { BalancerSdkConfig, Token } from '@/types';
import { TokenProvider } from './providers/provider.interface';
import { UninitializedTokenProvider } from './providers/uninitialized.provider';

export class Tokens {
    constructor(
        private config: BalancerSdkConfig,
        private provider: TokenProvider = new UninitializedTokenProvider()
    ) {}

    setProvider(provider: TokenProvider): void {
        this.provider = provider;
    }

    get(address: string): Token | undefined {
        return this.provider.get(address);
    }

    getBySymbol(symbol: string): Token | undefined {
        return this.provider.getBySymbol(symbol);
    }
}
