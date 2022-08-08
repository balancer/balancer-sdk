import { merge } from 'lodash';

enum GraphQLFilterOperator {
  GreaterThan,
  LessThan,
  Equals,
  In,
  NotIn,
  Contains,
}

export interface GraphQLFilter {
  operator: GraphQLFilterOperator;
  value: any;
}

function GreaterThan(value: number): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.GreaterThan,
    value,
  };
}

function LessThan(value: number): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.LessThan,
    value,
  };
}

function Equals(value: number | boolean | string): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.Equals,
    value,
  };
}

function In(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.In,
    value,
  };
}

function NotIn(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.NotIn,
    value,
  };
}

function Contains(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.Contains,
    value,
  };
}

export const Op = {
  GreaterThan,
  LessThan,
  Equals,
  In,
  NotIn,
  Contains,
};

export interface GraphQLArgs {
  chainId?: number;
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: string;
  block?: {
    number: number;
  };
  where?: Record<string, GraphQLFilter>;
}

export interface GraphQLArgsFormatter {
  format(args: GraphQLArgs): any;
}

export class BalancerAPIArgsFormatter implements GraphQLArgsFormatter {
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
        whereQuery[name] = {
          [this.operatorMap[filter.operator]]: filter.value,
        };
      });
    }

    return {
      ...args,
      ...{ where: whereQuery },
    };
  }
}

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

export class GraphQLArgsBuilder {
  constructor(readonly args: GraphQLArgs) {}

  merge(other: GraphQLArgsBuilder): GraphQLArgsBuilder {
    const mergedArgs = merge(this.args, other.args);
    return new GraphQLArgsBuilder(mergedArgs);
  }

  format(formatter: GraphQLArgsFormatter): any {
    return formatter.format(this.args);
  }
}
