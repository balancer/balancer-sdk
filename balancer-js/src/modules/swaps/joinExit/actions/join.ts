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
  sender: string;
  receiver: string;
  fromInternal: boolean;
  tokenIn: string;
  amountIn: string;
  hasTokenIn: boolean;
  hasTokenOut: boolean;
  minAmountOut: string;
  opRef: OutputReference;
  nextOpRefKey: number;

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
    this.sender = relayerAddress;
    this.fromInternal = true;
    this.hasTokenIn = false;
    // If using mainTokenIn we can assume it comes from user
    if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn) {
      this.sender = user;
      this.fromInternal = false;
      this.hasTokenIn = true;
    }
    this.hasTokenOut = false;
    this.receiver = relayerAddress;
    // If using mainTokenOut we can assume it goes to user
    if (
      actionStep === ActionStep.Direct ||
      actionStep === ActionStep.TokenOut
    ) {
      this.receiver = user;
      this.hasTokenOut = true;
    }
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
    this.type = ActionType.Join;
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
