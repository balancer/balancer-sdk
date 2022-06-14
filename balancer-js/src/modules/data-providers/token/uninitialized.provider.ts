import { Token } from '@/types';
import { TokenProvider } from './provider.interface';

export class UninitializedTokenProvider implements TokenProvider {
  find(): Promise<Token | undefined> {
    throw new Error('No token provider set');
  }

  findBy(): Promise<Token | undefined> {
    throw new Error('No token provider set');
  }
}
