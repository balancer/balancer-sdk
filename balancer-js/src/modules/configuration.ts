import { Network } from '@/lib/constants/network';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BalancerNetworkConfig } from '@/types';
import { ContractAddressList } from '@/modules/contracts';

class Configuration {
    networkConfig: BalancerNetworkConfig;

    constructor(public network: Network, public rpc: string) {
        this.networkConfig = BALANCER_NETWORK_CONFIG[network];
    }

    get contracts(): ContractAddressList {
        return this.networkConfig.addresses.contracts;
    }
}

export { Configuration };
