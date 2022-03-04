import { Calcs } from './modules/weighted/calcs.module';
import { PoolType } from './pool-type.interface';

export class Weighted implements PoolType {
    constructor(public calcs = new Calcs()) {}
}
