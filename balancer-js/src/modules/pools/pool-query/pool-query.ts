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
  name: string;
  value: any;
}

class GreaterThan implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.GreaterThan;
  constructor(readonly name: string, readonly value: number) {}
}

class LessThan implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.LessThan;
  constructor(readonly name: string, readonly value: number) {}
}

class Equals implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.Equals;
  constructor(
    readonly name: string,
    readonly value: number | string | boolean
  ) {}
}

class In implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.In;
  constructor(readonly name: string, readonly value: (number | string)[]) {}
}

class NotIn implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.NotIn;
  constructor(readonly name: string, readonly value: (number | string)[]) {}
}

class Contains implements PoolQueryFilter {
  operator: PoolQueryFilterOperator = PoolQueryFilterOperator.Contains;
  constructor(readonly name: string, readonly value: (number | string)[]) {}
}

export const Op = {
  GreaterThan,
  LessThan,
  Equals,
  In,
  NotIn,
  Contains,
};

export interface PoolQueryOptions {
  chainId?: number;
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: string;
  where?: PoolQueryFilter[];
}

export interface PoolQueryFormatter {
  format(args: PoolQueryOptions, attrs: Record<string, boolean>): GraphQLQuery;
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

  format(args: PoolQueryOptions, attrs: Record<string, any>): GraphQLQuery {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      args.where.forEach((filter: PoolQueryFilter) => {
        whereQuery[filter.name] = {
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

  format(args: PoolQueryOptions, attrs: Record<string, any>): GraphQLQuery {
    const whereQuery: Record<string, any> = {};
    if (args.where) {
      args.where.forEach((filter: PoolQueryFilter) => {
        whereQuery[`${filter.name}_${this.operatorMap[filter.operator]}`] =
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

export class PoolQuery {
  constructor(
    readonly args: PoolQueryOptions,
    readonly attrs: Record<string, any> = {}
  ) {}

  merge(query: PoolQuery): PoolQuery {
    const mergedWhere = query.args.where || [];

    this.args.where?.forEach((option) => {
      if (!mergedWhere?.find((where) => where.name === option.name)) {
        mergedWhere.push(option);
      }
    });

    const mergedArgs = {
      ...this.args,
      ...query.args,
      ...{ where: mergedWhere },
    };

    const mergedAttrs = {
      ...this.attrs,
      ...query.attrs,
    };

    return new PoolQuery(mergedArgs, mergedAttrs);
  }

  format(formatter: PoolQueryFormatter): GraphQLQuery {
    return formatter.format(this.args, this.attrs);
  }
}
