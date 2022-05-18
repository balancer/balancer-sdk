import { Token } from '@/types';
import { TokenProvider } from './provider.interface';

export class UninitializedTokenProvider implements TokenProvider {
    get(): Token | undefined {
        throw new Error('No token provider set');
    }

    getBySymbol(): Token | undefined {
        throw new Error('No token provider set');
    }

}
