import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256, MaxInt256 } from '@ethersproject/constants';
import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  EncodeBatchSwapInput,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { FundManagement, SwapType } from '../../types';
import { ActionType, Action, CallData } from './types';
import { BaseAction } from './baseAction';

export class Swap extends BaseAction implements Action {
  type: ActionType.BatchSwap;
  swaps: SwapV2[];
  limits: BigNumber[];
  private approveTokens: string[] = [];
  opRef: OutputReference[] = [];
  fromInternal;
  toInternal;

  constructor(
    swap: SwapV2,
    private mainTokenInIndex: number,
    private mainTokenOutIndex: number,
    public opRefKey: number,
    private assets: string[],
    private slippage: string,
    private pools: SubgraphPoolBase[],
    private user: string,
    private relayer: string
  ) {
    super(
      mainTokenInIndex,
      mainTokenOutIndex,
      swap.assetInIndex,
      swap.assetOutIndex,
      swap.amount,
      swap.returnAmount ?? '0',
      opRefKey,
      slippage,
      user,
      relayer
    );
    this.type = ActionType.BatchSwap;
    // Updates swap data to use chainedRef if required
    this.swaps = [{ ...swap, amount: this.amountIn }];
    const isBptIn = this.isBpt(pools, assets[swap.assetInIndex]);
    if (isBptIn) {
      // Older pools don't have pre-approval so need to add this as a step
      this.approveTokens.push(assets[swap.assetInIndex]);
    }
    this.fromInternal = this.getFromInternal(this.hasTokenIn, isBptIn);
    const isBptOut = this.isBpt(pools, assets[swap.assetOutIndex]);
    this.toInternal = this.getToInternal(this.hasTokenOut, isBptOut);
    this.limits = this.getLimits(
      assets,
      swap.assetInIndex,
      swap.assetOutIndex,
      swap.amount,
      this.hasTokenIn,
      this.hasTokenOut,
      this.minOut
    );
    if (this.opRefStart.index) {
      this.opRef.push(this.opRefStart);
    }
  }

  private getLimits(
    assets: string[],
    assetInIndex: number,
    assetOutIndex: number,
    swapAmount: string,
    hasTokenIn: boolean,
    hasTokenOut: boolean,
    minOut: string
  ): BigNumber[] {
    const limits = assets.map(() => BigNumber.from(0));
    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (hasTokenIn) {
      limits[assetInIndex] = BigNumber.from(swapAmount);
    } else {
      // This will be a chained swap/input amount
      limits[assetInIndex] = MaxInt256;
    }
    if (hasTokenOut) {
      limits[assetOutIndex] = BigNumber.from(minOut).mul(-1);
    }
    return limits;
  }

  private updateLimits(limits: BigNumber[], newSwap: Swap): void {
    if (newSwap.hasTokenIn) {
      // We need to add amount for each swap that uses tokenIn to get correct total
      limits[newSwap.swaps[0].assetInIndex] = limits[
        newSwap.swaps[0].assetInIndex
      ].add(newSwap.amountIn);
    }
    if (newSwap.hasTokenOut) {
      // We need to add amount for each swap that uses tokenOut to get correct total (should be negative)
      limits[newSwap.swaps[0].assetOutIndex] = limits[
        newSwap.swaps[0].assetOutIndex
      ].sub(newSwap.minOut);
    }
  }

  isChainedSwap(swap: Swap): boolean {
    return (
      this.opRef[this.swaps.length - 1] &&
      this.toInternal === swap.fromInternal &&
      this.receiver === swap.sender &&
      this.opRef[this.swaps.length - 1].key.toString() === swap.amountIn
    );
  }

  // If swap has different send/receive params than previous then it will need to be done separately
  canAddSwap(newSwap: Swap): boolean {
    if (this.isChainedSwap(newSwap)) return true;
    return (
      newSwap.fromInternal === this.fromInternal &&
      newSwap.toInternal === this.toInternal &&
      newSwap.receiver === this.receiver &&
      newSwap.sender === this.sender
    );
  }

  callData(): CallData {
    const calls: string[] = [];

    for (const token of this.approveTokens) {
      // If swap tokenIn is a BPT then:
      // new pools have automatic infinite vault allowance, but not old ones
      // const key = Relayer.fromChainedReference(action.swaps[0].amount);
      // const readOnlyRef = Relayer.toChainedReference(key, false);
      // const approval = Relayer.encodeApproveVault(token, readOnlyRef.toString());
      // TODO fix approval amount
      // TODO only approve once
      const approval = Relayer.encodeApproveVault(token, MaxUint256.toString());
      calls.push(approval);
    }

    const funds: FundManagement = {
      sender: this.sender,
      recipient: this.receiver,
      fromInternalBalance: this.fromInternal,
      toInternalBalance: this.toInternal,
    };
    const batchSwapInput: EncodeBatchSwapInput = {
      swapType: SwapType.SwapExactIn,
      swaps: this.swaps,
      assets: this.assets,
      funds,
      limits: this.limits.map((l) => l.toString()),
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0',
      outputReferences: this.opRef,
    };

    const encodedBatchSwap = Relayer.encodeBatchSwap(batchSwapInput);
    calls.push(encodedBatchSwap);
    return {
      params: batchSwapInput,
      encoded: calls,
    };
  }
  getAmountIn(): string {
    return this.limits[this.mainTokenInIndex].toString();
  }
  getAmountOut(): string {
    return this.limits[this.mainTokenOutIndex].abs().toString();
  }

  copy(): Swap {
    return new Swap(
      this.swaps[0],
      this.mainTokenInIndex,
      this.mainTokenOutIndex,
      this.opRefKey,
      this.assets,
      this.slippage,
      this.pools,
      this.user,
      this.relayer
    );
  }

  addSwap(swap: Swap): void {
    const isChainedSwap = this.isChainedSwap(swap);
    this.swaps.push(swap.swaps[0]);
    // Merge approveTokens without any duplicates
    this.approveTokens = [
      ...new Set([...this.approveTokens, ...swap.approveTokens]),
    ];
    this.toInternal = swap.toInternal;
    this.receiver = swap.receiver;
    this.hasTokenOut = swap.hasTokenOut;
    this.minOut = swap.minOut;
    this.opRef = [...this.opRef, ...swap.opRef];
    if (!isChainedSwap) {
      this.amountIn = BigNumber.from(this.amountIn)
        .add(swap.amountIn)
        .toString();
    }
    this.updateLimits(this.limits, swap);
  }

  isBpt(pools: SubgraphPoolBase[], token: string): boolean {
    return pools.some((p) => p.address.toLowerCase() === token.toLowerCase());
  }
}
