import { Token } from '@/types';
import { TokenProvider } from './provider.interface';

export class UninitializedTokenProvider implements TokenProvider {
    find(): Token | undefined {
        throw new Error('No token provider set');
    }

    findBy(): Token | undefined {
        throw new Error('No token provider set');
    }
}
