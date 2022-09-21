import { mergeWith } from 'lodash';
import {
  GraphQLArgs,
  GraphQLArgsFormatter,
  GraphQLFilter,
  GraphQLFilterOperator,
} from './types';

export * from './formatters';

export class GraphQLArgsBuilder {
  constructor(readonly args: GraphQLArgs) {}

  merge(other: GraphQLArgsBuilder): GraphQLArgsBuilder {
    const mergedArgs = mergeWith(
      this.args,
      other.args,
      (objValue: any, srcValue: any) => {
        if (Array.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      }
    );

    return new GraphQLArgsBuilder(mergedArgs);
  }

  format(formatter: GraphQLArgsFormatter): any {
    return formatter.format(this.args);
  }
}
