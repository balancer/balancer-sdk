/**
 * Global configuration for Balancer SDK exposed on a Balancer SDK global object
 * Usage:
 *  import { BalancerSDK } from '@balancer-sdk'
 *  BalancerSDK.configuration.network = 1
 *  BalancerSDK.configuration.rpcUrl = 'rpc-endpoint'
 *
 *  Access configuration by calling network properties directly:
 *  BalancerSDK.configuration.addresses
 */

import { Network } from '@/lib/constants/network';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BalancerNetworkConfig } from '@/types';

declare global {
    interface ProxyConstructor {
        // eslint-disable-next-line @typescript-eslint/ban-types
        new <TSource extends object, TTarget extends object>(
            target: TSource,
            handler: ProxyHandler<TSource>
        ): TTarget;
    }
}

interface ProxyArguments {
    network: Network;
    rpcUrl: string;
    records: Record<Network, BalancerNetworkConfig>;
}

export interface SDKConfig extends BalancerNetworkConfig {
    network: Network;
    rpcUrl: string;
}

export const configuration = new Proxy<ProxyArguments, SDKConfig>(
    {
        network: Network.MAINNET,
        rpcUrl: 'http://127.0.0.1:8545/',
        records: BALANCER_NETWORK_CONFIG,
    },
    {
        get: (obj, prop: keyof BalancerNetworkConfig) =>
            obj.records[obj.network][prop],
    }
);
