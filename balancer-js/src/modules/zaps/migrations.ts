import { defaultAbiCoder } from '@ethersproject/abi';
import { StaBal3Builder } from './bbausd2-migrations/stabal3';
import { BbaUsd1Builder } from './bbausd2-migrations/bbausd1';
import { StablesBuilder } from './bbausd2-migrations/stables';
import { MaiusdBuilder } from './bbausd2-migrations/maiusd';

export class Migrations {
  constructor(private network: 1 | 5 | 137) {}

  /**
   * Builds migration call data.
   * Migrates tokens from staBal3 to bbausd2 pool.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param staBal3Amount Amount of BPT tokens to migrate.
   * @param minBbausd2Out Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
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
        let swapIndex = staked ? 2 : 1;
        if (authorisation) swapIndex += 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        // bbausd2AmountOut
        return swapDeltas[0][0].abs().toString();
      },
    };
  }

  /**
   * Builds migration call data.
   * Migrates tokens from bbausd1 to bbausd2 pool.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param bbausd1Amount Amount of BPT tokens to migrate.
   * @param minBbausd2Out Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param tokenBalances Token balances in EVM scale. Array must have the same length and order as tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
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
    decode: (output: string, staked: boolean) => string;
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
        let swapIndex = staked ? 1 : 0;
        if (authorisation) swapIndex += 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        return swapDeltas[0][0].abs().toString(); // bptOut
      },
    };
  }

  /**
   * Builds migration call data.
   * Migrates tokens from old stable to new stable phantom pools with the same underlying tokens.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param from Pool info being migrated from
   * @param to Pool info being migrated to
   * @param bptIn Amount of BPT tokens to migrate.
   * @param minBptOut Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param underlyingTokens Underlying token addresses. Array must have the same length and order as tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
  stables(
    userAddress: string,
    from: { id: string; address: string; gauge?: string },
    to: { id: string; address: string; gauge?: string },
    bptIn: string,
    minBptOut: string,
    staked: boolean,
    underlyingTokens: string[],
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
      bptIn,
      minBptOut,
      staked,
      underlyingTokens,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        let swapIndex = staked ? 2 : 1;
        if (authorisation) swapIndex += 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        // bbausd2AmountOut
        return swapDeltas[0][0].abs().toString();
      },
    };
  }

  /**
   * Builds migration call data.
   * Migrates tokens from staBal3 to bbausd2 pool.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param bptIn Amount of BPT tokens to migrate.
   * @param minBptOut Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
  maiusd(
    userAddress: string,
    bptIn: string,
    minBptOut: string,
    staked: boolean,
    authorisation?: string
  ): {
    to: string;
    data: string;
    decode: (output: string, staked: boolean) => string;
  } {
    const builder = new MaiusdBuilder(this.network);
    const request = builder.calldata(
      userAddress,
      bptIn,
      minBptOut,
      staked,
      authorisation
    );

    return {
      to: request.to,
      data: request.data,
      decode: (output, staked) => {
        let swapIndex = staked ? 2 : 1;
        if (authorisation) swapIndex += 1;
        const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
        const swapDeltas = defaultAbiCoder.decode(
          ['int256[]'],
          multicallResult[0][swapIndex]
        );
        const bptOut = swapDeltas[0][8].abs().toString();
        return bptOut;
      },
    };
  }
}
