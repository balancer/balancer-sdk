import { Calcs } from './modules/stable/calcs.module';
import { PoolType } from './pool-type.interface';

export class Stable implements PoolType {
    constructor(public calcs = new Calcs()) {}
}
