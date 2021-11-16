import { Network } from './constants/network';
import { swap } from './swap';

export * from './pool-stable';
export * from './pool-weighted';
export * from './pool-utils';
export * from './utils';
export * from './types';
export * from './swap/index';
export * from './swap/types';
export { Network } from './constants/network';

export class BalancerSDK {
    network: Network;
    rpcUrl: string;
    swap: swap;

    constructor(network: Network, rpcUrl: string) {
        this.network = network;
        this.rpcUrl = rpcUrl;
        this.swap = new swap(this.network, this.rpcUrl);
    }
}