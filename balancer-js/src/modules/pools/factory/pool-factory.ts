import { InitJoinPoolAttributes, InitJoinPoolParameters } from './types';
import { TransactionRequest } from '@ethersproject/providers';
import { CreatePoolParameters } from '@/modules/pools/factory/types';

export interface PoolFactory {
  create: (parameters: CreatePoolParameters) => TransactionRequest;
  buildInitJoin: (parameters: InitJoinPoolParameters) => InitJoinPoolAttributes;
}
