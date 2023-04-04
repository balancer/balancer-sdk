import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  EncodeJoinPoolInput,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionStep, ActionType, Action, CallData } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

export class Join implements Action {
  type: ActionType.Join;
  poolId: string;
  nextOpRefKey: number;
  hasTokenIn: boolean;
  hasTokenOut: boolean;
  private sender: string;
  private receiver: string;
  private fromInternal: boolean;
  private tokenIn: string;
  private amountIn: string;
  private minAmountOut: string;
  private opRef: OutputReference;

  constructor(
    swap: SwapV2,
    mainTokenInIndex: number,
    mainTokenOutIndex: number,
    public opRefKey: number,
    assets: string[],
    slippage: string,
    user: string,
    relayerAddress: string
  ) {
    this.type = ActionType.Join;
    this.poolId = swap.poolId;
    this.tokenIn = assets[swap.assetInIndex];

    const actionStep = getActionStep(
      mainTokenInIndex,
      mainTokenOutIndex,
      swap.assetInIndex,
      swap.assetOutIndex
    );
    // Will get actual amount if input or chain amount if part of chain
    this.amountIn = getActionAmount(
      swap.amount,
      ActionType.Join,
      actionStep,
      opRefKey
    );
    this.hasTokenIn = this.actionHasTokenIn(actionStep);
    this.hasTokenOut = this.actionHasTokenOut(actionStep);
    this.fromInternal = this.getFromInternal(this.hasTokenIn);
    this.sender = this.getSender(this.hasTokenIn, user, relayerAddress);
    this.receiver = this.getReceiver(this.hasTokenOut, user, relayerAddress);
    // This will be 0 if not a mainTokenOut action otherwise amount using slippage
    this.minAmountOut = getActionMinOut(swap.returnAmount ?? '0', slippage);
    // This will set opRef for next chained action if required
    const [opRef, nextOpRefKey] = getActionOutputRef(
      actionStep,
      swap.assetOutIndex,
      opRefKey
    );
    this.opRef = opRef;
    this.nextOpRefKey = nextOpRefKey;
  }

  private getFromInternal(hasTokenIn: boolean): boolean {
    if (hasTokenIn) return false;
    else return true;
  }

  private actionHasTokenIn(actionStep: ActionStep): boolean {
    return actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn
      ? true
      : false;
  }

  private actionHasTokenOut(actionStep: ActionStep): boolean {
    return actionStep === ActionStep.Direct ||
      actionStep === ActionStep.TokenOut
      ? true
      : false;
  }

  private getSender(
    hasTokenIn: boolean,
    user: string,
    relayer: string
  ): string {
    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (hasTokenIn) return user;
    else return relayer;
  }

  private getReceiver(
    hasTokenOut: boolean,
    user: string,
    relayer: string
  ): string {
    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (hasTokenOut) return user;
    else return relayer;
  }

  public callData(
    pool: SubgraphPoolBase,
    wrappedNativeAsset: string
  ): CallData {
    const assets = pool.tokensList;
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // tokens must have same order as pool getTokens
    const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
    const joinToken = this.tokenIn;
    const joinTokenIndex = sortedTokens.findIndex(
      (t) => t.toLowerCase() === joinToken.toLowerCase()
    );
    const maxAmountsIn = Array(assets.length).fill('0');
    // Uses exact amounts of tokens in
    maxAmountsIn[joinTokenIndex] = this.amountIn;
    // Variable amount of BPT out (this has slippage applied)
    const bptAmountOut = this.minAmountOut;
    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      maxAmountsIn,
      bptAmountOut
    );
    const params: EncodeJoinPoolInput = {
      poolId: this.poolId,
      sender: this.sender,
      recipient: this.receiver,
      kind: 0,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn,
        userData,
        fromInternalBalance: this.fromInternal,
      },
      value: '0',
      outputReference: this.opRef.key ? this.opRef.key.toString() : '0',
    };
    const callData = Relayer.encodeJoinPool(params);

    return {
      params,
      encoded: callData,
    };
  }

  public getAmountIn(): string {
    return this.hasTokenIn ? this.amountIn : '0';
  }

  public getAmountOut(): string {
    return this.hasTokenOut ? this.minAmountOut : '0';
  }
}
