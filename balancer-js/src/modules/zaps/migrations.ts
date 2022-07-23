import { defaultAbiCoder } from '@ethersproject/abi';
import { MaxInt256 } from '@ethersproject/constants';
import { StaBal3Builder } from './bbausd2-migrations/stabal3';

export class Migrations {
  constructor(private network: 1 | 5) {}

  stabal3(
    userAddress: string,
    amount: string,
    limit = MaxInt256.toString(),
    authorisation: string,
    staked: boolean
  ): { to: string; data: string; decode: (output: string) => string } {
    const builder = new StaBal3Builder(this.network);
    const request = builder.calldata(
      amount,
      limit,
      userAddress,
      staked,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output) =>
        defaultAbiCoder.decode(['int256[]'], output[2])[3].toString(),
    };
  }
}
