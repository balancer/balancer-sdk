export type GraphQLFilterOperator =
  | 'gt'
  | 'lt'
  | 'eq'
  | 'in'
  | 'not_in'
  | 'contains';

export type GraphQLFilter = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [operator in GraphQLFilterOperator]?: any;
};

export interface GraphQLArgs {
  chainId?: number;
  first?: number;
  skip?: number;
  nextToken?: string;
  orderBy?: string;
  orderDirection?: string;
  block?: {
    number?: number;
  };
  where?: Record<string, GraphQLFilter>;
}

export interface GraphQLArgsFormatter {
  format(args: GraphQLArgs): unknown;
}
