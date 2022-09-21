export type GraphQLFilterOperator =
  | 'gt'
  | 'lt'
  | 'eq'
  | 'in'
  | 'not_in'
  | 'contains';

export type GraphQLFilter = {
  [operator in GraphQLFilterOperator]?: unknown;
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
