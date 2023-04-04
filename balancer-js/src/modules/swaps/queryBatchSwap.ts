import { BigNumberish } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { SOR, SwapTypes, SwapInfo } from '@balancer-labs/sor';
import { SwapType, BatchSwapStep, FundManagement } from './types';
import { Vault } from '@/contracts/Vault';

/*
 * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas. Calls to `swap` cannot be
 * simulated directly, but an equivalent `batchSwap` call can and will yield the exact same result.
 *
 * Each element in the array corresponds to the asset at the same index, and indicates the number of tokens (or ETH)
 * the Vault would take from the sender (if positive) or send to the recipient (if negative). The arguments it
 * receives are the same that an equivalent `batchSwap` call would receive.
 */
export async function queryBatchSwap(
  vaultContract: Vault,
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
    const deltas = await vaultContract.callStatic.queryBatchSwap(
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
