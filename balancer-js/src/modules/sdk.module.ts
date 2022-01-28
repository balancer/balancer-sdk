import { BalancerSdkConfig } from '../types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { SOR } from '@balancer-labs/sor';
import { SorFactory } from '../sor/sorFactory';

export class BalancerSDK {
    public readonly swaps: Swaps;
    public readonly relayer: Relayer;
    public readonly sor: SOR;

    constructor(config: BalancerSdkConfig) {
        this.sor = SorFactory.createSor(config);
        this.swaps = new Swaps(this.sor);
        this.relayer = new Relayer(this.swaps);
    }
}
