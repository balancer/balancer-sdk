import { mergeWith } from 'lodash';
import { GraphQLArgs, GraphQLArgsFormatter } from './types';

export * from './formatters';

export class GraphQLArgsBuilder {
  constructor(readonly args: GraphQLArgs) {}

  merge(other: GraphQLArgsBuilder): GraphQLArgsBuilder {
    const mergedArgs = mergeWith(
      this.args,
      other.args,
      (objValue: unknown, srcValue: unknown) => {
        if (Array.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      }
    );

    return new GraphQLArgsBuilder(mergedArgs);
  }

  format(formatter: GraphQLArgsFormatter): unknown {
    return formatter.format(this.args);
  }
}
