import { defaultAbiCoder } from '@ethersproject/abi';
import { MaxInt256 } from '@ethersproject/constants';
import { StaBal3Builder } from './bbausd2-migrations/stabal3';
import { BbaUsd1Builder } from './bbausd2-migrations/bbausd1';
import { StablesBuilder } from './bbausd2-migrations/stables';
import { PoolToken } from '@/types';

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

  bbaUsd(
    userAddress: string,
    bbausd1Amount: string,
    minBbausd2Out: string,
    authorisation: string,
    staked: boolean,
    tokenBalances: string[]
  ): {
    to: string;
    data: string;
    decode: (
      output: string,
      staked: boolean
    ) => {
      bbausd1AmountIn: string;
      bbausd2AmountOut: string;
    };
  } {
    const builder = new BbaUsd1Builder(this.network);
    const request = builder.calldata(
      bbausd1Amount,
      minBbausd2Out,
      userAddress,
      staked,
      authorisation,
      tokenBalances
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        const swapIndex = staked ? 2 : 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        return {
          bbausd1AmountIn: swapDeltas[0][10].toString(),
          bbausd2AmountOut: swapDeltas[0][0].abs().toString(),
        };
      },
    };
  }

  stables(
    from: { id: string; address: string; gauge?: string },
    to: { id: string; address: string; gauge?: string },
    userAddress: string,
    amount: string,
    limit = MaxInt256.toString(),
    authorisation: string,
    staked: boolean,
    tokens: string[]
  ): { to: string; data: string; decode: (output: string) => string } {
    const builder = new StablesBuilder(this.network);
    const request = builder.calldata(
      from,
      to,
      userAddress,
      amount,
      limit,
      authorisation,
      staked,
      tokens
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output) =>
        defaultAbiCoder.decode(['int256[]'], output[2])[3].toString(),
    };
  }
}
