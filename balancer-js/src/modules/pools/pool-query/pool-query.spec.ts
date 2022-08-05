import { expect } from 'chai';
import {
  BalancerAPIQueryFormatter,
  PoolQuery,
  SubgraphQueryFormatter,
  Op,
} from './pool-query';

describe('Pool Query', () => {
  it('should be able to assemble a query for the subgraph', () => {
    const query = new PoolQuery({
      first: 10,
      skip: 0,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: [
        new Op.GreaterThan('totalShares', 0.01),
        new Op.NotIn('id', ['0xBAD', '0xDEF']),
        new Op.Contains('tokensList', ['0xBAL']),
        new Op.NotIn('poolType', ['Linear']),
      ],
    });

    const expectedSubgraphQuery = {
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
    };

    const result = query.format(new SubgraphQueryFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });

  it('should be able to assemble a query for the Balancer API', () => {
    const query = new PoolQuery({
      first: 10,
      skip: 0,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: [
        new Op.GreaterThan('totalShares', 0.01),
        new Op.NotIn('id', ['0xBAD', '0xDEF']),
        new Op.Contains('tokensList', ['0xBAL']),
        new Op.NotIn('poolType', ['Linear']),
      ],
    });

    const expectedSubgraphQuery = {
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
    };

    const result = query.format(new BalancerAPIQueryFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });
});
