import {
  GraphQLArgs,
  GraphQLArgsFormatter,
  GraphQLFilterOperator,
} from '../types';

export class BalancerAPIArgsFormatter implements GraphQLArgsFormatter {
  format(args: GraphQLArgs): any {
    return args;
  }
}
