import { ActionStep, ActionType } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

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
    const actionStep = getActionStep(
      mainTokenInIndex,
      mainTokenOutIndex,
      swapAssetInIndex,
      swapAssetOutIndex
    );
    // Will get actual amount if input or chain amount if part of chain
    this.amountIn = getActionAmount(
      swapAmount,
      ActionType.BatchSwap,
      actionStep,
      opRefKey
    );
    // This will be 0 if not a mainTokenOut action otherwise amount using slippage
    this.minOut = getActionMinOut(swapReturn ?? '0', slippage);
    this.hasTokenIn = this.actionHasTokenIn(actionStep);
    this.hasTokenOut = this.actionHasTokenOut(actionStep);

    // This will set opRef for next chained action if required
    const [opRef, nextOpRefKey] = getActionOutputRef(
      actionStep,
      swapAssetOutIndex,
      opRefKey
    );
    this.nextOpRefKey = nextOpRefKey;
    this.opRefStart = opRef;
    this.sender = this.getSender(this.hasTokenIn, user, relayer);
    this.receiver = this.getReceiver(this.hasTokenOut, user, relayer);
  }
  getFromInternal(hasTokenIn: boolean, isBptIn?: boolean): boolean {
    if (hasTokenIn || isBptIn) return false;
    else return true;
  }

  getToInternal(hasTokenOut: boolean, isBptOut: boolean): boolean {
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
}

export * from './exit';
export * from './join';
export * from './swap';
export { orderActions, getNumberOfOutputActions } from './helpers';
export * from './types';
