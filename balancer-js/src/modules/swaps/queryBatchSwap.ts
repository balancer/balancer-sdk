import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { AddressZero, Zero } from '@ethersproject/constants';
import { SOR, SwapTypes, SwapInfo } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  SwapType,
  BatchSwapStep,
  FundManagement,
  QueryWithSorInput,
  QueryWithSorOutput,
} from './types';

/*
 * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas. Calls to `swap` cannot be
 * simulated directly, but an equivalent `batchSwap` call can and will yield the exact same result.
 *
 * Each element in the array corresponds to the asset at the same index, and indicates the number of tokens (or ETH)
 * the Vault would take from the sender (if positive) or send to the recipient (if negative). The arguments it
 * receives are the same that an equivalent `batchSwap` call would receive.
 */
export async function queryBatchSwap(
  vaultContract: Contract,
  swapType: SwapType,
  swaps: BatchSwapStep[],
  assets: string[]
): Promise<string[]> {
  const funds: FundManagement = {
    sender: AddressZero,
    recipient: AddressZero,
    fromInternalBalance: false,
    toInternalBalance: false,
  };

  try {
    const deltas = await vaultContract.queryBatchSwap(
      swapType,
      swaps,
      assets,
      funds
    );
    return deltas.map((d: BigNumberish) => d.toString());
  } catch (err) {
    throw `queryBatchSwap call error: ${err}`;
  }
}

/*
Uses SOR to create a batchSwap which is then queried onChain.
*/
export async function queryBatchSwapWithSor(
  sor: SOR,
  vaultContract: Contract,
  queryWithSor: QueryWithSorInput
): Promise<QueryWithSorOutput> {
  if (queryWithSor.fetchPools.fetchPools) await sor.fetchPools();

  const swaps: BatchSwapStep[][] = [];
  const assetArray: string[][] = [];
  // get path information for each tokenIn
  for (let i = 0; i < queryWithSor.tokensIn.length; i++) {
    const swap = await getSorSwapInfo(
      queryWithSor.tokensIn[i],
      queryWithSor.tokensOut[i],
      queryWithSor.swapType,
      queryWithSor.amounts[i].toString(),
      sor
    );
    if (!swap.returnAmount.gt(Zero))
      // Throw here because swaps with 0 amounts has no path and has misleading result for query
      throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);

    swaps.push(swap.swaps);
    assetArray.push(swap.tokenAddresses);
  }

  // Join swaps and assets together correctly
  const batchedSwaps = batchSwaps(assetArray, swaps);

  const returnTokens =
    queryWithSor.swapType === SwapType.SwapExactIn
      ? queryWithSor.tokensOut
      : queryWithSor.tokensIn;
  const returnAmounts: string[] = Array(returnTokens.length).fill('0');
  let deltas: BigNumberish[] = Array(batchedSwaps.assets.length).fill('0');
  try {
    // Onchain query
    deltas = await queryBatchSwap(
      vaultContract,
      queryWithSor.swapType,
      batchedSwaps.swaps,
      batchedSwaps.assets
    );

    if (deltas.length > 0) {
      returnTokens.forEach(
        (t, i) =>
          (returnAmounts[i] =
            deltas[batchedSwaps.assets.indexOf(t.toLowerCase())].toString() ??
            Zero.toString())
      );
    }
  } catch (err) {
    throw new BalancerError(BalancerErrorCode.QUERY_BATCH_SWAP);
  }

  return {
    returnAmounts,
    swaps: batchedSwaps.swaps,
    assets: batchedSwaps.assets,
    deltas: deltas.map((d) => d.toString()),
  };
}

/*
Use SOR to get swapInfo for tokenIn>tokenOut.
SwapInfos.swaps has path information.
*/
export async function getSorSwapInfo(
  tokenIn: string,
  tokenOut: string,
  swapType: SwapType,
  amount: string,
  sor: SOR
): Promise<SwapInfo> {
  const swapTypeSOR: SwapTypes =
    swapType === SwapType.SwapExactIn
      ? SwapTypes.SwapExactIn
      : SwapTypes.SwapExactOut;
  const swapInfo = await sor.getSwaps(
    tokenIn.toLowerCase(),
    tokenOut.toLowerCase(),
    swapTypeSOR,
    amount
  );
  return swapInfo;
}

/*
Format multiple individual swaps/assets into a single swap/asset.
*/
function batchSwaps(
  assetArray: string[][],
  swaps: BatchSwapStep[][]
): { swaps: BatchSwapStep[]; assets: string[] } {
  // asset addresses without duplicates
  const newAssetArray = [...new Set(assetArray.flat())];

  // Update indices of each swap to use new asset array
  swaps.forEach((swap, i) => {
    swap.forEach((poolSwap) => {
      poolSwap.assetInIndex = newAssetArray.indexOf(
        assetArray[i][poolSwap.assetInIndex]
      );
      poolSwap.assetOutIndex = newAssetArray.indexOf(
        assetArray[i][poolSwap.assetOutIndex]
      );
    });
  });

  // Join Swaps into a single batchSwap
  const batchedSwaps = swaps.flat();
  return { swaps: batchedSwaps, assets: newAssetArray };
}
