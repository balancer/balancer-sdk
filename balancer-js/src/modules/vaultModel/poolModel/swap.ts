import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';
import { bnum } from '@balancer-labs/sor';

import { PoolDictionary, Pool } from '../poolSource';
import { EncodeBatchSwapInput } from '@/modules/relayer/types';
import { Swap, SwapType } from '@/modules/swaps/types';
import { Relayer } from '@/modules/relayer/relayer.module';
import { RelayerModel } from '../relayer';
import { ActionType } from '../vaultModel.module';

export interface SwapRequest
  extends Pick<Swap, 'request' | 'funds' | 'outputReference'> {
  actionType: ActionType.Swap;
}

export interface BatchSwapRequest
  extends Pick<
    EncodeBatchSwapInput,
    'swaps' | 'assets' | 'funds' | 'swapType' | 'outputReferences'
  > {
  actionType: ActionType.BatchSwap;
}

export class SwapModel {
  constructor(private relayerModel: RelayerModel) {}

  /**
   * Performs a single swap with one pool.
   * @param swapRequest
   * @returns Returns the net Vault asset balance delta. Positive amount represent token (or ETH) sent to the Vault, and negative amount represent token (or ETH) sent by the Vault. Delta corresponds to the asset out.
   */
  async doSingleSwap(
    swapRequest: SwapRequest,
    pools: PoolDictionary
  ): Promise<string[]> {
    const amountIn = this.relayerModel.doChainedRefReplacement(
      swapRequest.request.amount.toString()
    );

    const pool = pools[swapRequest.request.poolId];
    const [, amountOutEvm] = this.doSwap(
      swapRequest.request.assetIn,
      swapRequest.request.assetOut,
      pool,
      swapRequest.request.kind,
      amountIn
    );

    const delta = Zero.sub(amountOutEvm);
    if (!swapRequest.outputReference)
      throw new Error('Missing outputReference');

    // Swap return values are signed, as they are Vault deltas (positive values correspond to assets sent
    // to the Vault, and negative values are assets received from the Vault). To simplify the chained reference
    // value model, we simply store the absolute value.
    this.relayerModel.setChainedReferenceValue(
      swapRequest.outputReference.toString(),
      delta.abs().toString()
    );
    return [delta.toString(), amountIn];
  }

  /**
   * Performs a series of swaps with one or multiple Pools.
   * @param batchSwapRequest
   * @returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.
   */
  async doBatchSwap(
    batchSwapRequest: BatchSwapRequest,
    pools: PoolDictionary
  ): Promise<string[]> {
    const assets = batchSwapRequest.assets;
    const deltas = new Array(assets.length).fill(Zero);
    // Used for multihop swaps where previous swap return is used as input to next swap
    let previousAmount: string;

    for (let i = 0; i < batchSwapRequest.swaps.length; ++i) {
      const amount = batchSwapRequest.swaps[i].amount;
      if (Relayer.isChainedReference(amount)) {
        batchSwapRequest.swaps[i].amount =
          this.relayerModel.getChainedReferenceValue(amount);
      }
    }

    // Handle each swap in order
    batchSwapRequest.swaps.forEach((swap) => {
      const tokenIn = assets[swap.assetInIndex];
      const tokenOut = assets[swap.assetOutIndex];
      const pool = pools[swap.poolId];
      let amount = swap.amount;
      if (amount === '0') amount = previousAmount;
      const [amountInEvm, amountOutEvm] = this.doSwap(
        tokenIn,
        tokenOut,
        pool,
        batchSwapRequest.swapType,
        amount
      );

      previousAmount =
        batchSwapRequest.swapType === SwapType.SwapExactIn
          ? amountOutEvm.toString()
          : amountInEvm.toString();

      deltas[swap.assetInIndex] = deltas[swap.assetInIndex].add(amountInEvm);
      deltas[swap.assetOutIndex] = deltas[swap.assetOutIndex].sub(amountOutEvm);
    });

    for (let i = 0; i < batchSwapRequest.outputReferences.length; i++) {
      // Batch swap return values are signed, as they are Vault deltas (positive values correspond to assets sent
      // to the Vault, and negative values are assets received from the Vault). To simplify the chained reference
      // value model, we simply store the absolute value.
      this.relayerModel.setChainedReferenceValue(
        batchSwapRequest.outputReferences[i].key.toString(),
        deltas[batchSwapRequest.outputReferences[i].index].abs().toString()
      );
    }
    return deltas.map((d) => d.toString());
  }

  /**
   * Perform swap against a pool (and update balances)
   * @param tokenIn
   * @param tokenOut
   * @param pool
   * @param swapType
   * @param amount (EVM Scale)
   * @returns
   */
  doSwap(
    tokenIn: string,
    tokenOut: string,
    pool: Pool,
    swapType: SwapType,
    amount: string
  ): BigNumber[] {
    const pairData = pool.parsePoolPairData(tokenIn, tokenOut);
    const isExactIn = swapType === SwapType.SwapExactIn;
    let amountInEvm: string | BigNumber = isExactIn
      ? BigNumber.from(amount)
      : Zero;
    let amountOutEvm: string | BigNumber = isExactIn
      ? Zero
      : BigNumber.from(amount);
    const amountInHuman: string | BigNumber = formatFixed(
      amountInEvm,
      pairData.decimalsIn
    );
    const amountOutHuman: string | BigNumber = formatFixed(
      amountOutEvm,
      pairData.decimalsOut
    );

    if (isExactIn) {
      // Needs human scale
      const amountOutHuman = pool
        ._exactTokenInForTokenOut(
          pairData as never,
          bnum(amountInHuman.toString())
        )
        .dp(pairData.decimalsOut);
      amountOutEvm = parseFixed(
        amountOutHuman.toString(),
        pairData.decimalsOut
      );
    } else {
      // Needs human scale
      const amountInHuman = pool
        ._tokenInForExactTokenOut(
          pairData as never,
          bnum(amountOutHuman.toString())
        )
        .dp(pairData.decimalsIn);
      amountInEvm = parseFixed(amountInHuman.toString(), pairData.decimalsIn);
    }
    // Update balances of tokenIn and tokenOut - use EVM scale
    pool.updateTokenBalanceForPool(
      pairData.tokenIn,
      pairData.balanceIn.add(amountInEvm)
    );
    pool.updateTokenBalanceForPool(
      pairData.tokenOut,
      pairData.balanceOut.sub(amountOutEvm)
    );
    return [amountInEvm, amountOutEvm];
  }
}
