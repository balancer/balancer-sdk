import { merge } from 'lodash';

enum PoolQueryFilterOperator {
  GreaterThan,
  LessThan,
  Equals,
  In,
  NotIn,
  Contains,
}

export interface GraphQLQuery {
  args: any;
  attrs: Record<string, any>;
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

function Equals(value: number): PoolQueryFilter {
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

export interface GraphQLFilterOptions {
  chainId?: number;
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: string;
  where?: Record<string, PoolQueryFilter>;
}

export interface PoolQueryFormatter {
  format(args: GraphQLFilterOptions, attrs: Record<string, boolean>): GraphQLQuery;
}

export class BalancerAPIQueryFormatter implements PoolQueryFormatter {
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

  format(args: GraphQLFilterOptions, attrs: Record<string, any>): GraphQLQuery {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      Object.entries(args.where).forEach(([name, filter]) => {
        whereQuery[name] = {
          [this.operatorMap[filter.operator]]: filter.value,
        };
      });
    }

    return {
      args: {
        ...args,
        ...{ where: whereQuery },
      },
      attrs,
    };
  }
}

export class SubgraphQueryFormatter implements PoolQueryFormatter {
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

  format(args: GraphQLFilterOptions, attrs: Record<string, any>): GraphQLQuery {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      Object.entries(args.where).forEach(([name, filter]) => {
        whereQuery[`${name}_${this.operatorMap[filter.operator]}`] =
          filter.value;
      });
    }

    return {
      args: {
        ...args,
        ...{ where: whereQuery },
      },
      attrs,
    };
  }
}

export class GraphQLFilter {
  constructor(
    readonly args: GraphQLFilterOptions,
    readonly attrs: Record<string, any> = {}
  ) {}

  merge(query: GraphQLFilter): GraphQLFilter {
    const mergedArgs = merge(this.args, query.args);
    const mergedAttrs = merge(this.attrs, query.attrs);

    return new GraphQLFilter(mergedArgs, mergedAttrs);
  }

  format(formatter: PoolQueryFormatter): GraphQLQuery {
    return formatter.format(this.args, this.attrs);
  }
}
