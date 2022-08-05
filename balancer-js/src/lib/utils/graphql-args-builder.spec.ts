import { expect } from 'chai';
import {
  BalancerAPIQueryFormatter,
  GraphQLArgsBuilder,
  SubgraphQueryFormatter,
  Op,
} from './graphql-args-builder';

describe('Pool Query', () => {
  it('should be able to assemble a query for the subgraph', () => {
    const query = new GraphQLArgsBuilder({
      first: 10,
      skip: 0,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      // where: [
      //   new Op.GreaterThan('totalShares', 0.01),
      //   new Op.NotIn('id', ['0xBAD', '0xDEF']),
      //   new Op.Contains('tokensList', ['0xBAL']),
      //   new Op.NotIn('poolType', ['Linear']),
      // ],
      where: {
        totalShares: Op.GreaterThan(0.01),
        id: Op.NotIn(['0xBAD', '0xDEF']),
        tokensList: Op.Contains(['0xBAL']),
        poolType: Op.NotIn(['Linear']),
      },
    });

    const expectedSubgraphQuery = {
      args: {
        first: 10,
        skip: 0,
        orderBy: 'totalLiquidity',
        orderDirection: 'desc',
        where: {
          totalShares_gt: 0.01,
          id_not_in: ['0xBAD', '0xDEF'],
          tokensList_contains: ['0xBAL'],
          poolType_not_in: ['Linear'],
        },
      },
      attrs: {},
    };

    const result = query.format(new SubgraphQueryFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });

  it('should be able to assemble a query for the Balancer API', () => {
    const query = new GraphQLArgsBuilder({
      first: 10,
      skip: 0,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: {
        totalShares: Op.GreaterThan(0.01),
        id: Op.NotIn(['0xBAD', '0xDEF']),
        tokensList: Op.Contains(['0xBAL']),
        poolType: Op.NotIn(['Linear']),
      },
    });

    const expectedSubgraphQuery = {
      args: {
        first: 10,
        skip: 0,
        orderBy: 'totalLiquidity',
        orderDirection: 'desc',
        where: {
          totalShares: {
            gt: 0.01,
          },
          id: {
            not_in: ['0xBAD', '0xDEF'],
          },
          tokensList: {
            contains: ['0xBAL'],
          },
          poolType: {
            not_in: ['Linear'],
          },
        },
      },
      attrs: {},
    };

    const result = query.format(new BalancerAPIQueryFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });
});
