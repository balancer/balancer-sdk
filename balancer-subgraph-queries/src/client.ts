import { GraphQLClient } from 'graphql-request';
import { getSdk } from '../generated/balancer-subgraph-types';

export function createBalancerSubgraphClient(subgraphUrl: string) {
    const client = new GraphQLClient(subgraphUrl);

    return getSdk(client);
}
