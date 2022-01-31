import { BalancerSdkConfig } from '@/types';
import { GraphQLClient } from 'graphql-request';
import { BalancerSDK } from '../sdk.module';
import { getSdk } from './generated/balancer-subgraph-types';
import { SubgraphClient } from './subgraph';

export class Subgraph {
    public readonly url: string;
    public readonly client: SubgraphClient;

    constructor(config: BalancerSdkConfig) {
        this.url = BalancerSDK.getNetworkConfig(config).subgraphUrl;
        this.client = this.initClient();
    }

    private initClient(): SubgraphClient {
        const client = new GraphQLClient(this.url);
        return getSdk(client);
    }
}
