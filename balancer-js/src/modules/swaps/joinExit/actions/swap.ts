import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256, MaxInt256 } from '@ethersproject/constants';
import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  EncodeBatchSwapInput,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { FundManagement, SwapType } from '../../types';
import { ActionStep, ActionType, Action, CallData } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

export class Swap implements Action {
  type: ActionType.BatchSwap;
  limits: BigNumber[];
  hasTokenIn: boolean;
  hasTokenOut: boolean;
  approveTokens: string[] = [];
  sender = '';
  receiver = '';
  toInternal = false;
  fromInternal = false;
  swaps: SwapV2[];
  opRef: OutputReference[] = [];
  nextOpRefKey: number;
  minOut: string;
  amountIn: string;
  isBptIn: boolean;

  constructor(
    swap: SwapV2,
    private mainTokenInIndex: number,
    private mainTokenOutIndex: number,
    public opRefKey: number,
    public assets: string[],
    private slippage: string,
    private pools: SubgraphPoolBase[],
    private user: string,
    private relayer: string
  ) {
    this.type = ActionType.BatchSwap;
    this.limits = assets.map(() => BigNumber.from(0));
    const actionStep = getActionStep(
      mainTokenInIndex,
      mainTokenOutIndex,
      swap.assetInIndex,
      swap.assetOutIndex
    );
    // Will get actual amount if input or chain amount if part of chain
    this.amountIn = getActionAmount(
      swap.amount,
      ActionType.BatchSwap,
      actionStep,
      opRefKey
    );
    // Updates swap data to use chainedRef if required
    swap.amount = this.amountIn;
    this.swaps = [swap];
    // This will be 0 if not a mainTokenOut action otherwise amount using slippage
    this.minOut = getActionMinOut(swap.returnAmount ?? '0', slippage);
    this.hasTokenIn =
      actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn
        ? true
        : false;
    this.hasTokenOut =
      actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut
        ? true
        : false;

    // This will set opRef for next chained action if required
    const [opRef, nextOpRefKey] = getActionOutputRef(
      actionStep,
      swap.assetOutIndex,
      opRefKey
    );
    this.nextOpRefKey = nextOpRefKey;
    if (opRef.index) {
      this.opRef.push(opRef);
    }

    this.isBptIn = isBpt(pools, assets[swap.assetInIndex]);
    if (this.isBptIn) {
      // Older pools don't have pre-approval so need to add this as a step
      this.approveTokens.push(assets[swap.assetInIndex]);
    }
    // joins - can't join a pool and send BPT to internal balances
    // Because of ^ we can assume that any BPT is coming from external (either from user or join)
    this.fromInternal = true;
    if (this.hasTokenIn || this.isBptIn) this.fromInternal = false;
    // exits - can't exit using BPT from internal balances
    // Because of ^ we can assume that any tokenOut BPT is going to external (either to user or exit)
    this.toInternal = true;
    if (this.hasTokenOut || isBpt(pools, assets[swap.assetOutIndex]))
      this.toInternal = false;

    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (this.hasTokenIn) {
      this.sender = user;
      this.limits[swap.assetInIndex] = BigNumber.from(swap.amount);
    } else {
      this.sender = relayer;
      // This will be a chained swap/input amount
      this.limits[swap.assetInIndex] = MaxInt256;
    }
    if (this.hasTokenOut) {
      this.receiver = user;
      this.limits[swap.assetOutIndex] = BigNumber.from(this.minOut);
    } else {
      this.receiver = relayer;
    }
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
    // console.log(batchSwapInput);

    const encodedBatchSwap = Relayer.encodeBatchSwap(batchSwapInput);
    calls.push(encodedBatchSwap);
    return {
      params: batchSwapInput,
      encoded: calls,
    };
  }
  getAmountIn(): string {
    return this.hasTokenIn
      ? this.limits[this.mainTokenInIndex].toString()
      : '0';
  }
  getAmountOut(): string {
    return this.hasTokenOut
      ? this.limits[this.mainTokenOutIndex].abs().toString()
      : '0';
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
    this.swaps.push(swap.swaps[0]);
    if (swap.opRef[0]) this.opRef.push(swap.opRef[0]);
    this.fromInternal = swap.fromInternal;
    this.toInternal = swap.toInternal;
    this.sender = swap.sender;
    this.receiver = swap.receiver;
    if (swap.isBptIn && !this.isBptIn) {
      // Older pools don't have pre-approval so need to add this as a step
      this.approveTokens.push(swap.assets[swap.swaps[0].assetInIndex]);
      this.isBptIn = true;
    }
    if (swap.hasTokenIn) {
      this.hasTokenIn = true;
      // We need to add amount for each swap that uses tokenIn to get correct total
      this.limits[swap.swaps[0].assetInIndex] = this.limits[
        swap.swaps[0].assetInIndex
      ].add(swap.amountIn);
    } else {
      // This will be a chained swap/input amount
      this.limits[swap.swaps[0].assetInIndex] = MaxInt256;
    }
    if (swap.hasTokenOut) {
      // We need to add amount for each swap that uses tokenOut to get correct total (should be negative)
      this.hasTokenOut = true;
      this.limits[swap.swaps[0].assetOutIndex] = this.limits[
        swap.swaps[0].assetOutIndex
      ].sub(swap.minOut);
    }
  }
}

function isBpt(pools: SubgraphPoolBase[], token: string): boolean {
  return pools.some((p) => p.address.toLowerCase() === token.toLowerCase());
}
