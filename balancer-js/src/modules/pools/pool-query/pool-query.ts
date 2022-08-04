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
  constructor(readonly name: string, readonly value: number | string) {}
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
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: string;
  where?: PoolQueryFilter[];
}

export interface PoolQueryFormatter {
  format(options: PoolQueryOptions): any;
}

export class BalancerApiQueryFormatter implements PoolQueryFormatter {
  operatorMap: any;

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

  format(options: PoolQueryOptions) {
    const whereQuery: Record<string, any> = {};
    if (options.where) {
      options.where.forEach((filter: PoolQueryFilter) => {
        whereQuery[filter.name] = {
          [this.operatorMap[filter.operator]]: filter.value,
        };
      });
    }

    return {
      ...options,
      ...{ where: whereQuery },
    };
  }
}

export class SubgraphQueryFormatter implements PoolQueryFormatter {
  operatorMap: any;

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

  format(options: PoolQueryOptions) {
    const whereQuery: Record<string, any> = {};
    if (options.where) {
      options.where.forEach((filter: PoolQueryFilter) => {
        whereQuery[`${filter.name}_${this.operatorMap[filter.operator]}`] =
          filter.value;
      });
    }

    return {
      ...options,
      ...{ where: whereQuery },
    };
  }
}

export class PoolQuery {
  constructor(private readonly options: PoolQueryOptions) {}

  format(formatter: PoolQueryFormatter): any {
    return formatter.format(this.options);
  }
}
