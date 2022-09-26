import { GraphQLArgs, GraphQLArgsFormatter } from '../types';

export class BalancerAPIArgsFormatter implements GraphQLArgsFormatter {
  format(args: GraphQLArgs): GraphQLArgs {
    return args;
  }
}
