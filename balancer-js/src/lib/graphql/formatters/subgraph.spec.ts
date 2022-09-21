import { GraphQLArgs } from '../types';
import { SubgraphArgsFormatter } from './subgraph';
import { expect } from 'chai';

describe('graphql -> formatters -> subgraph', () => {
  describe('Filter conversions', () => {
    it('Should format greater than as _gt', () => {
      const args: GraphQLArgs = {
        where: {
          totalLiquidity: {
            gt: 5,
          },
        },
      };
      const formatter = new SubgraphArgsFormatter();
      const subgraphArgs = formatter.format(args);
      expect(subgraphArgs).to.deep.eq({ where: { totalLiquidity_gt: 5 } });
    });

    it('Should format eq as nothing additional', () => {
      const args: GraphQLArgs = {
        where: {
          swapEnabled: {
            eq: true,
          },
        },
      };
      const formatter = new SubgraphArgsFormatter();
      const subgraphArgs = formatter.format(args);
      expect(subgraphArgs).to.deep.eq({ where: { swapEnabled: true } });
    });
  });
});
