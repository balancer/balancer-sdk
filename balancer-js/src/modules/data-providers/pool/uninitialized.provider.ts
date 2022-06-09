import { Pool } from '@/types';
import { PoolProvider } from './provider.interface';

export class UninitializedPoolProvider implements PoolProvider {
  find(): Promise<Pool | undefined> {
    throw new Error('No pool provider set');
  }

  findBy(): Promise<Pool | undefined> {
    throw new Error('No pool provider set');
  }
}
