import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  ExitPoolData,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionStep, ActionType, Action, CallData } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

export class Exit implements Action {
  type: ActionType.Exit;
  poolId: string;
  tokenOut: string;
  hasTokenOut: boolean;
  minAmountOut: string;
  bptAmtIn: string;
  sender: string;
  receiver: string;
  hasTokenIn: boolean;
  toInternalBalance: boolean;
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
    this.type = ActionType.Exit;
    this.tokenOut = assets[swap.assetOutIndex];

    const actionStep = getActionStep(
      mainTokenInIndex,
      mainTokenOutIndex,
      swap.assetInIndex,
      swap.assetOutIndex
    );

    // Will get actual amount if input or chain amount if part of chain
    this.bptAmtIn = getActionAmount(
      swap.amount,
      ActionType.Exit,
      actionStep,
      opRefKey
    );

    this.sender = relayerAddress;
    this.hasTokenIn = false;
    if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn) {
      this.sender = user;
      this.hasTokenIn = true;
    }

    // Send to relayer unless this is main token out
    this.hasTokenOut = false;
    this.toInternalBalance = true;
    this.receiver = relayerAddress;
    if (
      actionStep === ActionStep.Direct ||
      actionStep === ActionStep.TokenOut
    ) {
      this.receiver = user;
      this.toInternalBalance = false;
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
  }

  public callData(
    pool: SubgraphPoolBase,
    wrappedNativeAsset: string
  ): CallData {
    const assets = pool.tokensList;
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // tokens must have same order as pool getTokens
    const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
    const exitToken = this.tokenOut;
    const exitTokenIndex = sortedTokens.findIndex(
      (t) => t.toLowerCase() === exitToken.toLowerCase()
    );
    const minAmountsOut = Array(assets.length).fill('0');
    // Variable amount of token out (this has slippage applied)
    minAmountsOut[exitTokenIndex] = this.minAmountOut;
    // Uses exact amount in
    const bptAmtIn = this.bptAmtIn;
    const userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
      bptAmtIn,
      exitTokenIndex
    );
    const params: ExitPoolData = {
      assets: sortedTokens,
      minAmountsOut,
      userData,
      toInternalBalance: this.toInternalBalance,
      poolId: this.poolId,
      poolKind: 0, // TODO - This will always be 0 to match supported Relayer types
      sender: this.sender,
      recipient: this.receiver,
      outputReferences: this.opRef.key ? [this.opRef] : [],
      exitPoolRequest: {} as ExitPoolRequest,
    };
    // console.log(exitParams);
    const exitPoolInput = Relayer.formatExitPoolInput(params);
    const callData = Relayer.encodeExitPool(exitPoolInput);
    return {
      params,
      encoded: callData,
    };
  }

  public getAmountIn(): string {
    return this.hasTokenIn ? this.bptAmtIn : '0';
  }

  public getAmountOut(): string {
    return this.hasTokenOut ? this.minAmountOut : '0';
  }
}
