import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapsService } from '../swapsService';

export class BalancerSDK {
    network: Network;
    rpcUrl: string;
    swaps: SwapsService;

    constructor(config: ConfigSdk, swapService = SwapsService) {
        this.network = config.network;
        this.rpcUrl = config.rpcUrl;
        this.swaps = new swapService({ 
            network: this.network,
            rpcUrl: this.rpcUrl,
            subgraphUrl: config.subgraphUrl
        });
    }
}