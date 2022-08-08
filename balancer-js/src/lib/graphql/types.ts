export enum GraphQLFilterOperator {
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