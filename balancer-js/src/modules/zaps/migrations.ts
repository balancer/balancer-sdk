import { defaultAbiCoder } from '@ethersproject/abi';
import { MaxInt256 } from '@ethersproject/constants';
import { StaBal3Builder } from './bbausd2-migrations/stabal3';
import { BbaUsd1Builder } from './bbausd2-migrations/bbausd1';
import { StablesBuilder } from './bbausd2-migrations/stables';

export class Migrations {
  constructor(private network: 1 | 5) {}

  stabal3(
    userAddress: string,
    staBal3Amount: string,
    minBbausd2Out: string,
    staked: boolean,
    authorisation?: string
  ): {
    to: string;
    data: string;
    decode: (output: string, staked: boolean) => string;
  } {
    const builder = new StaBal3Builder(this.network);
    const request = builder.calldata(
      userAddress,
      staBal3Amount,
      minBbausd2Out,
      staked,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        let swapIndex = staked ? 3 : 2;
        if (authorisation == undefined) swapIndex -= 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        console.log(swapDeltas.toString());
        // bbausd2AmountOut
        return swapDeltas[0][0].abs().toString();
      },
    };
  }

  bbaUsd(
    userAddress: string,
    bbausd1Amount: string,
    minBbausd2Out: string,
    staked: boolean,
    tokenBalances: string[],
    authorisation?: string
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
      userAddress,
      bbausd1Amount,
      minBbausd2Out,
      staked,
      tokenBalances,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        let swapIndex = staked ? 2 : 1;
        if (authorisation == undefined) swapIndex -= 1;
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
    userAddress: string,
    from: { id: string; address: string; gauge?: string },
    to: { id: string; address: string; gauge?: string },
    amount: string,
    limit = MaxInt256.toString(),
    staked: boolean,
    tokens: string[],
    authorisation?: string
  ): {
    to: string;
    data: string;
    decode: (output: string, staked: boolean) => string;
  } {
    const builder = new StablesBuilder(this.network);
    const request = builder.calldata(
      userAddress,
      from,
      to,
      amount,
      limit,
      staked,
      tokens,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        let swapIndex = staked ? 3 : 2;
        if (authorisation == undefined) swapIndex -= 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        console.log(swapDeltas.toString());
        // bbausd2AmountOut
        return swapDeltas[0][0].abs().toString();
      },
    };
  }
}
