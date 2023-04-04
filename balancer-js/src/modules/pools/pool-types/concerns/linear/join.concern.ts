/* eslint-disable @typescript-eslint/no-unused-vars */
import { JoinPoolParameters, JoinConcern, JoinPoolAttributes } from '../types';

export class LinearPoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    throw new Error('Join type not supported');
  };
}
