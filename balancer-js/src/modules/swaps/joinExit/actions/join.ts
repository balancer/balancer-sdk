import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  EncodeJoinPoolInput,
  OutputReference,
} from '@/modules/relayer/relayer.module';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionType, Action, CallData } from './types';
import { BaseAction } from './baseAction';

export class Join extends BaseAction implements Action {
  type: ActionType.Join;
  poolId: string;
  tokenIn: string;
  opRef: OutputReference;
  fromInternal;

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
    this.type = ActionType.Join;
    this.poolId = swap.poolId;
    this.tokenIn = assets[swap.assetInIndex];
    this.fromInternal = this.getFromInternal(this.hasTokenIn);
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
    const joinToken = this.tokenIn;
    const joinTokenIndex = sortedTokens.findIndex(
      (t) => t.toLowerCase() === joinToken.toLowerCase()
    );
    const maxAmountsIn = Array(assets.length).fill('0');
    // Uses exact amounts of tokens in
    maxAmountsIn[joinTokenIndex] = this.amountIn;
    // Variable amount of BPT out (this has slippage applied)
    const bptAmountOut = this.minOut;
    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      maxAmountsIn,
      bptAmountOut
    );
    const params: EncodeJoinPoolInput = {
      poolId: this.poolId,
      sender: this.sender,
      recipient: this.receiver,
      kind: this.getPoolKind(pool.poolType),
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
    return this.hasTokenOut ? this.minOut : '0';
  }
}
