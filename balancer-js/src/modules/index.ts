/**
 * SDK entry point
 * Composing all configuration dependencies
 */

import { Network } from '@/lib/constants/network';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Configuration } from './configuration';
import { Vault, Multicall, ContractList } from './contracts';
import { Provider } from '@ethersproject/providers';

export class BalancerSDK {
    configuration: Configuration;
    provider: Provider;

    constructor(network: Network, rpc: string) {
        this.configuration = new Configuration(network, rpc);
        this.provider = new StaticJsonRpcProvider(rpc, network);
    }

    get contracts(): ContractList {
        return {
            vault: Vault(this.configuration.contracts.vault, this.provider),
            multicall: Multicall(
                this.configuration.contracts.multicall,
                this.provider
            ),
        };
    }

    // get rawData
    // get swaps
    // get pricing
    // get aprs
}
