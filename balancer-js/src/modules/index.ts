/**
 * SDK entry point
 * Composing all configuration dependencies
 */

import { Network } from '@/lib/constants/network';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Configuration } from './configuration';
import { Vault__factory, Multicall__factory } from '@/contracts/generated';
import { ContractList } from './contracts';
import { Provider } from '@ethersproject/providers';

export class BalancerSDK {
    configuration: Configuration;
    defaultProvider: Provider;

    constructor(network: Network, rpc: string) {
        this.configuration = new Configuration(network, rpc);
        this.defaultProvider = new StaticJsonRpcProvider(rpc, network);
    }

    /**
     * ethers.js contract classes connected to default provider
     */
    get contracts(): ContractList {
        return {
            vault: Vault__factory.connect(
                this.configuration.contracts.vault,
                this.defaultProvider
            ),
            multicall: Multicall__factory.connect(
                this.configuration.contracts.multicall,
                this.defaultProvider
            ),
        };
    }

    // get rawDataProviders (subgraph, rpc, apis)
    // get swaps
    // get pricing
    // get aprs
}
