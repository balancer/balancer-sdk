# Balancer Subgraph Queries

A simple utility library to make it easier to interact with the `balancer-v2-subgraph` with built-in type safety. All queries are defined in the `graphql` directory.
Anytime a new query is added, run `yarn subgraph:generate` to regenerate the client files, fully typed.

The module leverages `graphql-codegen` and `graphql-request`.

## Usage

```ts
//TODO: add import statement for createSubgraphClient

const client = createSubgraphClient(BALANCER_SUBGRAPH_URL);

const { pools } = await client.Pools({
    first: 5,
    where: { totalLiquidity_gt: '1' },
});

const { users } = await client.Users({
    first: 5,
    orderBy: User_OrderBy.SharesOwned,
    orderDirection: OrderDirection.Desc,
});
```

[Examples](./examples/subgraph-queries.ts)

## Adding new queries

Refer to any existing query in the `graphql` directory as a reference when first getting started.

1. Add the query to an existing `.graphql` file or create a new one in the `graphql` directory.
2. Run `yarn subgraph:generate`
3. Access the query from the generated client using `client.QueryName`

All queries get exactly typed, so if you query a partial reference to an underlying model, only the quereied fields will be available. If you need to reference the type created by the query, create a fragment and use that fragment in your query.

```graphql
fragment SubgraphBalancer on Balancer {
    id
    totalLiquidity
    totalSwapVolume
    totalSwapFee
    totalSwapCount
    poolCount
}

query ProtocolData {
    balancers(first: 1) {
        ...SubgraphBalancer
    }
}
```

The generated type will be exported from the module suffixed with `Fragment`. So in this example, your type is named: `SubgraphProtocolFragment`.

```ts
//TODO: add import statements

import { SubgraphBalancerFragment } from './balancer-subgraph-types';

const { balancers } = await client.ProtocolData();
const protocolData: SubgraphBalancerFragment = balancers[0];
```

If you need to call the same query twice, you can rename the output variable of either one or both queries.

```graphql
query ProtocolData {
    balancers(first: 1) {
        ...SubgraphBalancer
    }

    others: balancers(first: 1000) {
        ...SubgraphBalancer
    }
}
```

## Resync the schema

Anytime there are schema changes published to `balancer-v2-subgraph`, you'll need to resync the local schema by running `yarn subgraph:generate`.

If the update introduced breaking changes, running `yarn subgraph:generate` will fail and print the necessary changes that need to be made to the console.
