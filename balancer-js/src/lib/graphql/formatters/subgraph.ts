import { GraphQLArgs, GraphQLArgsFormatter, GraphQLFilter } from '../types';

export class SubgraphArgsFormatter implements GraphQLArgsFormatter {
  operatorMap: Record<string, string>;

  constructor() {
    this.operatorMap = {
      gt: '_gt',
      lt: '_lt',
      eq: '',
      in: '_in',
      not_in: '_not_in',
      contains: '_contains',
    };
  }

  format(args: GraphQLArgs): GraphQLArgs {
    const whereQuery: Record<string, GraphQLFilter> = {};
    if (args.where) {
      Object.entries(args.where).forEach(([name, filter]) => {
        Object.entries(filter).forEach(([operator, value]) => {
          whereQuery[`${name}${this.operatorMap[operator]}`] = value;
        });
      });
    }

    return {
      ...args,
      ...{ where: whereQuery },
    };
  }
}
