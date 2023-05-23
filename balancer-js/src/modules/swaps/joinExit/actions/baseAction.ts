import { BigNumber } from '@ethersproject/bignumber';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { ActionStep, ActionType } from './types';
import { Relayer, OutputReference } from '@/modules/relayer/relayer.module';

export class BaseAction {
  nextOpRefKey;
  hasTokenOut;
  hasTokenIn;
  sender;
  receiver;
  opRefStart;
  minOut;
  amountIn;

  constructor(
    mainTokenInIndex: number,
    mainTokenOutIndex: number,
    swapAssetInIndex: number,
    swapAssetOutIndex: number,
    swapAmount: string,
    swapReturn: string,
    opRefKey: number,
    slippage: string,
    user: string,
    relayer: string
  ) {
    const actionStep = this.getActionStep(
      mainTokenInIndex,
      mainTokenOutIndex,
      swapAssetInIndex,
      swapAssetOutIndex
    );
    // Will get actual amount if input or chain amount if part of chain
    this.amountIn = this.getActionAmount(
      swapAmount,
      ActionType.BatchSwap,
      actionStep,
      opRefKey
    );
    this.hasTokenIn = this.actionHasTokenIn(actionStep);
    this.hasTokenOut = this.actionHasTokenOut(actionStep);
    // This will be 0 if not a mainTokenOut action otherwise amount using slippage
    const amountOut = this.hasTokenOut ? swapReturn : '0';
    this.minOut = this.getActionMinOut(amountOut, slippage);
    // This will set opRef for next chained action if required
    const [opRef, nextOpRefKey] = this.getActionOutputRef(
      actionStep,
      swapAssetOutIndex,
      opRefKey
    );
    this.nextOpRefKey = nextOpRefKey;
    this.opRefStart = opRef;
    this.sender = this.getSender(this.hasTokenIn, user, relayer);
    this.receiver = this.getReceiver(this.hasTokenOut, user, relayer);
  }

  /**
   * If its not the first action then the amount will come from the previous output ref
   * @param amount
   * @param actionType
   * @param actionStep
   * @param opRefKey
   * @returns
   */
  getActionAmount(
    amount: string,
    actionType: ActionType,
    actionStep: ActionStep,
    opRefKey: number
  ): string {
    let amountIn = amount;
    if (
      actionStep === ActionStep.TokenOut ||
      (actionStep === ActionStep.Middle && actionType === ActionType.Join) ||
      (actionStep === ActionStep.Middle && actionType === ActionType.Exit)
    ) {
      amountIn = Relayer.toChainedReference(opRefKey - 1).toString();
    }
    return amountIn;
  }

  /**
   * If its not the final action then we need an outputReferece to chain to next action as input
   * @param actionStep
   * @param tokenOutIndex
   * @param opRefKey
   * @returns
   */
  getActionOutputRef(
    actionStep: ActionStep,
    tokenOutIndex: number,
    opRefKey: number
  ): [OutputReference, number] {
    let opRef: OutputReference = {} as OutputReference;
    if (actionStep === ActionStep.TokenIn || actionStep === ActionStep.Middle) {
      opRef = this.getOutputRef(opRefKey, tokenOutIndex);
      opRefKey++;
    }
    return [opRef, opRefKey];
  }

  /**
   * Use slippage to set min amount out
   * @param amountOut
   * @param slippage
   * @returns
   */
  getActionMinOut(amountOut: string, slippage: string): string {
    // Currently only handle ExactIn swap. ExactOut would add slippage
    // We should apply slippage to each swaps amountOut
    return subSlippage(
      BigNumber.from(amountOut),
      BigNumber.from(slippage)
    ).toString();
  }

  /**
   * Find if the Action is:
   * Direct: tokenIn > tokenOut
   * TokenIn: tokenIn > chain...
   * TokenOut: ...chain > tokenOut
   * Middle: ...chain > action > chain...
   * @param tokenInIndex
   * @param tokenOutIndex
   * @param tokenInIndexAction
   * @param tokenOutIndexAction
   * @returns
   */
  getActionStep(
    tokenInIndex: number,
    tokenOutIndex: number,
    tokenInIndexAction: number,
    tokenOutIndexAction: number
  ): ActionStep {
    let actionStep: ActionStep;
    if (
      tokenInIndexAction === tokenInIndex &&
      tokenOutIndexAction === tokenOutIndex
    ) {
      actionStep = ActionStep.Direct;
    } else if (tokenInIndexAction === tokenInIndex) {
      actionStep = ActionStep.TokenIn;
    } else if (tokenOutIndexAction === tokenOutIndex) {
      actionStep = ActionStep.TokenOut;
    } else {
      actionStep = ActionStep.Middle;
    }
    return actionStep;
  }

  getOutputRef(key: number, index: number): OutputReference {
    const keyRef = Relayer.toChainedReference(key);
    return { index: index, key: keyRef };
  }

  getFromInternal(hasTokenIn: boolean, isBptIn?: boolean): boolean {
    if (hasTokenIn || isBptIn) return false;
    else return true;
  }

  getToInternal(hasTokenOut: boolean, isBptOut?: boolean): boolean {
    // exits - can't exit using BPT from internal balances
    // Because of ^ we can assume that any tokenOut BPT is going to external (either to user or exit)
    if (hasTokenOut || isBptOut) return false;
    else return true;
  }

  actionHasTokenIn(actionStep: ActionStep): boolean {
    return actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn
      ? true
      : false;
  }

  actionHasTokenOut(actionStep: ActionStep): boolean {
    return actionStep === ActionStep.Direct ||
      actionStep === ActionStep.TokenOut
      ? true
      : false;
  }

  getSender(hasTokenIn: boolean, user: string, relayer: string): string {
    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (hasTokenIn) return user;
    else return relayer;
  }

  getReceiver(hasTokenOut: boolean, user: string, relayer: string): string {
    // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
    if (hasTokenOut) return user;
    else return relayer;
  }

  getPoolKind(poolType: string): number {
    // We have to use correct pool type based off following from Relayer:
    // enum PoolKind { WEIGHTED, LEGACY_STABLE, COMPOSABLE_STABLE, COMPOSABLE_STABLE_V2 }
    // (note only Weighted and COMPOSABLE_STABLE_V2 will support proportional exits)
    let kind = 0;
    if ([`MetaStable`, `Stable`, `StablePhantom`].includes(poolType)) {
      kind = 1;
    } else if (poolType === `ComposableStable`) {
      // In this case we are only doing BPT <> singleToken, not BPT <> tokens, so encoding matches and avoids need to check version so default to 3
      kind = 3;
    }
    return kind;
  }
}
