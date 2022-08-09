import { mergeWith } from 'lodash';
import {
  GraphQLArgs,
  GraphQLArgsFormatter,
  GraphQLFilter,
  GraphQLFilterOperator,
} from './types';

export * from './formatters';

function GreaterThan(value: number): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.GreaterThan,
    value,
  };
}

function LessThan(value: number): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.LessThan,
    value,
  };
}

function Equals(value: unknown): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.Equals,
    value,
  };
}

function In(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.In,
    value,
  };
}

function NotIn(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.NotIn,
    value,
  };
}

function Contains(value: (number | string)[]): GraphQLFilter {
  return {
    operator: GraphQLFilterOperator.Contains,
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
