import { GraphQLClient } from 'graphql-request';
import { getSdk, Sdk } from './generated/balancer-subgraph-types';

export * from './generated/balancer-subgraph-types';

export type SubgraphClient = Sdk;

export function createSubgraphClient(subgraphUrl: string): SubgraphClient {
    const client = new GraphQLClient(subgraphUrl);

    return getSdk(client);
}
