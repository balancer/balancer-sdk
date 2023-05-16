import { LinearPool } from '@balancer-labs/sor';
import { parseFixed } from '@ethersproject/bignumber';

import { EncodeUnwrapAaveStaticTokenInput } from '@/modules/relayer/types';

import { PoolDictionary } from '../poolSource';
import { RelayerModel } from '../relayer';
import { ActionType } from '../vaultModel.module';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

export interface UnwrapRequest
  extends Pick<EncodeUnwrapAaveStaticTokenInput, 'amount' | 'outputReference'> {
  poolId: string;
  actionType: ActionType.Unwrap;
}

export class UnwrapModel {
  constructor(private relayerModel: RelayerModel) {}

  /**
   * Perform the specified unwrap type.
   * @param unwrapRequest
   * @param pools
   * @returns tokens out and their respective deltas
   */
  async doUnwrap(
    unwrapRequest: UnwrapRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    const pool = pools[unwrapRequest.poolId] as LinearPool;
    const wrappedToken = pool.tokens[pool.wrappedIndex];
    const underlyingToken = pool.tokens[pool.mainIndex];

    const amountIn = this.relayerModel.doChainedRefReplacement(
      unwrapRequest.amount.toString()
    );

    // must be negative because is leaving the vault
    const amountOut = SolidityMaths.divDownFixed(
      SolidityMaths.mulDownFixed(
        BigInt(amountIn),
        parseFixed(wrappedToken.priceRate, 18).toBigInt()
      ),
      WeiPerEther.toBigInt()
    ).toString();

    // Save chained references
    this.relayerModel.setChainedReferenceValue(
      unwrapRequest.outputReference.toString(),
      amountOut
    );

    const tokens = [wrappedToken.address, underlyingToken.address];
    const deltas = [amountIn, Zero.sub(amountOut).toString()];
    return [tokens, deltas];
  }
}
