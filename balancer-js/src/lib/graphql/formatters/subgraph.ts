import {
  GraphQLArgs,
  GraphQLArgsFormatter,
  GraphQLFilterOperator,
} from '../types';

export class SubgraphArgsFormatter implements GraphQLArgsFormatter {
  operatorMap: Record<GraphQLFilterOperator, string>;

  constructor() {
    this.operatorMap = {
      [GraphQLFilterOperator.GreaterThan]: 'gt',
      [GraphQLFilterOperator.LessThan]: 'lt',
      [GraphQLFilterOperator.Equals]: 'eq',
      [GraphQLFilterOperator.In]: 'in',
      [GraphQLFilterOperator.NotIn]: 'not_in',
      [GraphQLFilterOperator.Contains]: 'contains',
    };
  }

  format(args: GraphQLArgs): any {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      Object.entries(args.where).forEach(([name, filter]) => {
        whereQuery[`${name}_${this.operatorMap[filter.operator]}`] =
          filter.value;
      });
    }

    return {
      ...args,
      ...{ where: whereQuery },
    };
  }
}
