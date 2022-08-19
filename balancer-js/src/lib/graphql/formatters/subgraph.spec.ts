import { GraphQLArgs } from '../types';
import { Op } from '../args-builder';
import { SubgraphArgsFormatter } from './subgraph';
import { expect } from 'chai';

describe('graphql -> formatters -> subgraph', () => {
  describe('Filter conversions', () => {
    it('Should format greater than as _gt', () => {
      const args: GraphQLArgs = {
        where: {
          totalLiquidity: Op.GreaterThan(5),
        },
      };
      const formatter = new SubgraphArgsFormatter();
      const subgraphArgs = formatter.format(args);
      expect(subgraphArgs).to.deep.eq({ where: { totalLiquidity_gt: 5 } });
    });

    it('Should format eq as nothing additional', () => {
      const args: GraphQLArgs = {
        where: {
          swapEnabled: Op.Equals(true),
        },
      };
      const formatter = new SubgraphArgsFormatter();
      const subgraphArgs = formatter.format(args);
      expect(subgraphArgs).to.deep.eq({ where: { swapEnabled: true } });
    });
  });
});
