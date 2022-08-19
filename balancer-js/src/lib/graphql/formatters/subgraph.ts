import {
  GraphQLArgs,
  GraphQLArgsFormatter,
  GraphQLFilterOperator,
} from '../types';

export class SubgraphArgsFormatter implements GraphQLArgsFormatter {
  operatorMap: Record<GraphQLFilterOperator, string>;

  constructor() {
    this.operatorMap = {
      [GraphQLFilterOperator.GreaterThan]: '_gt',
      [GraphQLFilterOperator.LessThan]: '_lt',
      [GraphQLFilterOperator.Equals]: '',
      [GraphQLFilterOperator.In]: '_in',
      [GraphQLFilterOperator.NotIn]: '_not_in',
      [GraphQLFilterOperator.Contains]: '_contains',
    };
  }

  format(args: GraphQLArgs): any {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      Object.entries(args.where).forEach(([name, filter]) => {
        whereQuery[`${name}${this.operatorMap[filter.operator]}`] =
          filter.value;
      });
    }

    return {
      ...args,
      ...{ where: whereQuery },
    };
  }
}
