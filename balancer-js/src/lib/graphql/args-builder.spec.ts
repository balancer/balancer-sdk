import { expect } from 'chai';
import {
  BalancerAPIArgsFormatter,
  GraphQLArgsBuilder,
  SubgraphArgsFormatter,
} from './args-builder';

describe('Pool Query', () => {
  it('should be able to assemble a query for the subgraph', () => {
    const query = new GraphQLArgsBuilder({
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

    const result = query.format(new SubgraphArgsFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });

  it('should be able to assemble a query for the Balancer API', () => {
    const query = new GraphQLArgsBuilder({
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

    const result = query.format(new BalancerAPIArgsFormatter());
    expect(result).to.deep.equal(expectedSubgraphQuery);
  });

  describe('merge', () => {
    it('Should merge both query arguments into one', () => {
      const query = new GraphQLArgsBuilder({
        first: 10,
        orderBy: 'totalLiquidity',
        where: {
          totalShares: {
            gt: 0.01,
          },
          id: {
            not_in: ['0xBAD', '0xDEF'],
          },
        },
      });

      const queryToMerge = new GraphQLArgsBuilder({
        skip: 20,
        orderDirection: 'asc',
        where: {
          tokensList: {
            contains: ['0xBAL'],
          },
          poolType: {
            not_in: ['Linear'],
          },
        },
      });

      const expectedMergedQuery = new GraphQLArgsBuilder({
        first: 10,
        orderBy: 'totalLiquidity',
        skip: 20,
        orderDirection: 'asc',
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
      });

      const mergedQuery = query.merge(queryToMerge);

      expect(mergedQuery).to.deep.equal(expectedMergedQuery);
    });

    it('Should overwrite query arguments from the query being merged in, and merge arrays', () => {
      const query = new GraphQLArgsBuilder({
        first: 10,
        orderBy: 'totalLiquidity',
        orderDirection: 'desc',
        where: {
          totalShares: {
            gt: 0.01,
          },
          id: {
            not_in: ['0xBAD', '0xDEF'],
          },
        },
      });

      const queryToMerge = new GraphQLArgsBuilder({
        first: 20,
        orderBy: 'totalShares',
        orderDirection: 'asc',
        where: {
          tokensList: {
            contains: ['0xBAL'],
          },
          id: {
            not_in: ['0xNEW'],
          },
        },
      });

      const expectedMergedQuery = new GraphQLArgsBuilder({
        first: 20,
        orderBy: 'totalShares',
        orderDirection: 'asc',
        where: {
          totalShares: {
            gt: 0.01,
          },
          tokensList: {
            contains: ['0xBAL'],
          },
          id: {
            not_in: ['0xBAD', '0xDEF', '0xNEW'],
          },
        },
      });

      const mergedQuery = query.merge(queryToMerge);

      expect(mergedQuery).to.deep.equal(expectedMergedQuery);
    });
  });
});
