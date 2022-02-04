import { PoolType } from './types';

type PoolArgs = { id?: string | null; poolType?: PoolType | null };
const poolArgs: PoolArgs = {};

export class Pool {
    public id: string | null;
    public poolType: PoolType | null;

    constructor({ id = null, poolType = null } = poolArgs) {
        this.id = id;
        this.poolType = poolType;
    }
}
