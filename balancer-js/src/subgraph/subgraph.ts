import { GraphQLClient } from 'graphql-request';
import { getSdk, Sdk } from './generated/balancer-subgraph-types';

export * from './generated/balancer-subgraph-types';

export function createSubgraphClient(subgraphUrl: string): Sdk {
    const client = new GraphQLClient(subgraphUrl);

    return getSdk(client);
}
