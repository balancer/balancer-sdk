import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  ExitPoolData,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionType, Action, CallData } from './types';
import { BaseAction } from './baseAction';

export class Exit extends BaseAction implements Action {
  type: ActionType.Exit;
  poolId: string;
  tokenOut: string;
  toInternalBalance: boolean;
  opRef: OutputReference;

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
      relayerAddress
    );
    this.type = ActionType.Exit;
    this.poolId = swap.poolId;
    this.tokenOut = assets[swap.assetOutIndex];
    this.toInternalBalance = this.getToInternal(this.hasTokenOut);
    this.opRef = this.opRefStart;
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
    minAmountsOut[exitTokenIndex] = this.minOut;
    // Uses exact amount in
    const bptAmtIn = this.amountIn;
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
      poolKind: this.getPoolKind(pool.poolType),
      sender: this.sender,
      recipient: this.receiver,
      outputReferences: this.opRef.key ? [this.opRef] : [],
      exitPoolRequest: {} as ExitPoolRequest,
    };
    const exitPoolInput = Relayer.formatExitPoolInput(params);
    const callData = Relayer.encodeExitPool(exitPoolInput);
    return {
      params,
      encoded: callData,
    };
  }

  public getAmountIn(): string {
    return this.hasTokenIn ? this.amountIn : '0';
  }

  public getAmountOut(): string {
    return this.hasTokenOut ? this.minOut : '0';
  }
}
