import { merge } from 'lodash';

enum PoolQueryFilterOperator {
  GreaterThan,
  LessThan,
  Equals,
  In,
  NotIn,
  Contains,
}

export interface PoolQueryFilter {
  operator: PoolQueryFilterOperator;
  value: any;
}

function GreaterThan(value: number): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.GreaterThan,
    value,
  };
}

function LessThan(value: number): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.LessThan,
    value,
  };
}

function Equals(value: number | boolean): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.Equals,
    value,
  };
}

function In(value: (number | string)[]): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.In,
    value,
  };
}

function NotIn(value: (number | string)[]): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.NotIn,
    value,
  };
}

function Contains(value: (number | string)[]): PoolQueryFilter {
  return {
    operator: PoolQueryFilterOperator.Contains,
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
  where?: Record<string, PoolQueryFilter>;
}

export interface GraphQLArgsFormatter {
  format(args: GraphQLArgs): any;
}

export class BalancerAPIArgsFormatter implements GraphQLArgsFormatter {
  operatorMap: Record<PoolQueryFilterOperator, string>;

  constructor() {
    this.operatorMap = {
      [PoolQueryFilterOperator.GreaterThan]: 'gt',
      [PoolQueryFilterOperator.LessThan]: 'lt',
      [PoolQueryFilterOperator.Equals]: 'eq',
      [PoolQueryFilterOperator.In]: 'in',
      [PoolQueryFilterOperator.NotIn]: 'not_in',
      [PoolQueryFilterOperator.Contains]: 'contains',
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
  operatorMap: Record<PoolQueryFilterOperator, string>;

  constructor() {
    this.operatorMap = {
      [PoolQueryFilterOperator.GreaterThan]: 'gt',
      [PoolQueryFilterOperator.LessThan]: 'lt',
      [PoolQueryFilterOperator.Equals]: 'eq',
      [PoolQueryFilterOperator.In]: 'in',
      [PoolQueryFilterOperator.NotIn]: 'not_in',
      [PoolQueryFilterOperator.Contains]: 'contains',
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
