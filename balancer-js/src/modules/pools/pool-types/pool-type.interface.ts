import { TransactionResponse } from '@ethersproject/providers';

export interface PoolType {
    create: () => Promise<TransactionResponse>;
}
