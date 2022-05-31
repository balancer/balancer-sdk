import { BalancerSdkConfig } from '@/types';
import { GraphQLClient } from 'graphql-request';
import { getNetworkConfig } from '../sdk.helpers';
import { getSdk } from './generated/balancer-subgraph-types';
import { SubgraphClient } from './subgraph';

export class Subgraph {
  public readonly url: string;
  public readonly client: SubgraphClient;

  constructor(config: BalancerSdkConfig) {
    this.url = getNetworkConfig(config).urls.subgraph;
    this.client = this.initClient();
  }

  private initClient(): SubgraphClient {
    const client = new GraphQLClient(this.url);
    return getSdk(client);
  }
}
