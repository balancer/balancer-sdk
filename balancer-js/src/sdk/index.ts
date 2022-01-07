import { ConfigSdk } from '../types';
import { Network } from '../constants/network';
import { SwapsService } from '../services/swaps/swaps.service';
import { RelayerService } from '../services/relayer/relayer.service';

export class BalancerSDK {
    network: Network;
    rpcUrl: string;
    swaps: SwapsService;
    relayer: RelayerService;

    constructor(config: ConfigSdk, swapService = SwapsService, relayerService = RelayerService) {
        this.network = config.network;
        this.rpcUrl = config.rpcUrl;
        this.swaps = new swapService({
            network: this.network,
            rpcUrl: this.rpcUrl,
            subgraphUrl: config.subgraphUrl
        });
        this.relayer = new relayerService(this.swaps, this.rpcUrl);
    }
}
