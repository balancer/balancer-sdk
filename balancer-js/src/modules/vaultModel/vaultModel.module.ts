import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Zero } from '@ethersproject/constants';
import { cloneDeep } from 'lodash';
import {
  SubgraphPoolBase,
  parseToPoolsDict,
  PoolDictionary,
  SubgraphToken,
  bnum,
  PoolDataService,
  PoolBase,
} from '@balancer-labs/sor';

import { ComposableStablePoolExitKind } from '@/pool-composable-stable';
import { WeightedPoolDecoder } from '@/pool-weighted/decoder';
import { EncodeBatchSwapInput, OutputReference } from '@/modules/relayer/types';
import {
  WeightedPoolExitKind,
  WeightedPoolJoinKind,
} from '@/pool-weighted/decoder';
import { SwapType } from '@/modules/swaps/types';
import { AssetHelpers, isSameAddress } from '@/lib/utils';
import { Relayer } from '@/modules/relayer/relayer.module';
import { PoolType } from '@/types';

export enum ActionType {
  BatchSwap,
  Join,
  Exit,
}

export interface BatchSwapRequest
  extends Pick<
    EncodeBatchSwapInput,
    'swaps' | 'assets' | 'funds' | 'swapType' | 'outputReferences'
  > {
  actionType: ActionType.BatchSwap;
}

export interface ExitPoolRequest {
  actionType: ActionType.Exit;
  poolId: string;
  poolType: PoolType;
  encodedUserData: string;
  outputReferences: OutputReference[];
}

export interface JoinPoolRequest {
  actionType: ActionType.Join;
  poolId: string;
  encodedUserData: string;
  outputReference: string;
}
export type Requests = BatchSwapRequest | JoinPoolRequest | ExitPoolRequest;

function getBalancesForTokens(pool: PoolBase, tokens: string[]): string[] {
  const balances: string[] = [];
  tokens.forEach((t) => {
    const tokenIndex = pool.tokens.findIndex((pt) =>
      isSameAddress(pt.address, t)
    );
    if (tokenIndex < 0) throw 'Pool does not contain tokenIn';
    balances.push(
      parseFixed(
        pool.tokens[tokenIndex].balance,
        pool.tokens[tokenIndex].decimals
      ).toString()
    );
  });
  return balances;
}

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class VaultModel {
  poolsArray: SubgraphPoolBase[] = [];
  poolsDict: PoolDictionary = {};
  chainedRefs: Record<string, string> = {};
  constructor(
    private poolDataService: PoolDataService,
    private wrappedNativeAsset: string
  ) {}

  dataSource(): PoolDataService {
    return this.poolDataService;
  }

  async all(refresh = false): Promise<SubgraphPoolBase[]> {
    if (refresh || this.poolsArray.length === 0) {
      const list = cloneDeep(await this.dataSource().getPools());
      const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
      for (const pool of list) {
        // Sort tokens here
        // tokens must have same order as pool getTokens
        const [sortedTokensList, sortedTokens] = assetHelpers.sortTokens(
          pool.tokensList,
          pool.tokens
        );
        pool.tokensList = sortedTokensList;
        pool.tokens = sortedTokens as SubgraphToken[];
        // For non pre-minted BPT pools we add the BPT to the token list. This makes the SOR functions work for joins/exits
        if (
          [
            'Weighted',
            'Investment',
            'Stable',
            'LiquidityBootstrapping',
          ].includes(pool.poolType)
        ) {
          const BptAsToken: SubgraphToken = {
            address: pool.address,
            balance: pool.totalShares,
            decimals: 18,
            priceRate: '1',
            weight: '0',
          };
          pool.tokens.push(BptAsToken);
          pool.tokensList.push(pool.address);
        }
      }
      this.poolsArray = list;
    }
    return this.poolsArray;
  }

  /**
   * Converts Subgraph array into PoolDictionary
   * @param refresh
   * @returns
   */
  async poolsDictionary(refresh = false): Promise<PoolDictionary> {
    if (refresh || Object.keys(this.poolsDict).length === 0) {
      const poolsArray = await this.all(refresh);
      this.poolsDict = parseToPoolsDict(poolsArray, 0);
    }
    return this.poolsDict;
  }

  updateDeltas(
    deltas: Record<string, BigNumber>,
    assets: string[],
    amounts: string[]
  ): Record<string, BigNumber> {
    assets.forEach((t, i) => {
      if (!deltas[t]) deltas[t] = Zero;
      deltas[t] = deltas[t].add(amounts[i]);
    });
    return deltas;
  }

  async multicall(rawCalls: Requests[]): Promise<Record<string, BigNumber>> {
    const deltas: Record<string, BigNumber> = {};
    for (const call of rawCalls) {
      if (call.actionType === ActionType.Join) {
        const [tokens, amounts] = await this.doJoinPool(call);
        this.updateDeltas(deltas, tokens, amounts);
      } else if (call.actionType === ActionType.Exit) {
        const [tokens, amounts] = await this.doExitPool(call);
        this.updateDeltas(deltas, tokens, amounts);
      } else {
        const swapDeltas = await this.doBatchSwap(call);
        this.updateDeltas(deltas, call.assets, swapDeltas);
      }
    }
    return deltas;
  }

  /**
   * Stores `value` as the amount referenced by chained reference `ref`.
   * @param ref
   * @param value
   */
  setChainedReferenceValue(ref: string, value: string): void {
    this.chainedRefs[ref] = value;
  }

  /**
   * Returns the amount referenced by chained reference `ref`.
   * @param ref
   * @returns
   */
  getChainedReferenceValue(ref: string): string {
    return this.chainedRefs[ref];
  }

  doChainedRefReplacement(amount: string): string {
    if (Relayer.isChainedReference(amount.toString())) {
      return this.getChainedReferenceValue(amount.toString());
    } else return amount;
  }

  doChainedRefReplacements(amounts: string[]): string[] {
    return amounts.map((amount) =>
      this.doChainedRefReplacement(amount).toString()
    );
  }

  /**
   * Finds join kind given encoded user data.
   * @param encodedUserData
   * @returns
   */
  joinKind(encodedUserData: string): WeightedPoolJoinKind {
    const decodedUserData = defaultAbiCoder.decode(
      ['uint256'],
      encodedUserData
    );
    const joinKind = decodedUserData[0] as BigNumber;
    if (!joinKind) throw new Error('No exit kind.');
    return joinKind.toNumber() as WeightedPoolJoinKind;
  }
  /**
   * Decodes user join data and returns token input amounts
   * @param encodedUserData
   * @param joinKind
   * @returns
   */
  decodeJoinData(
    encodedUserData: string,
    joinKind: WeightedPoolJoinKind
  ): string | string[] {
    // At the moment all pools have same structure so just use WeightedPoolDecoded for all
    if (joinKind === WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT) {
      const bptAmountOut =
        WeightedPoolDecoder.joinAllTokensInForExactBPTOut(encodedUserData);
      return bptAmountOut.toString();
    } else if (joinKind === WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT) {
      const [, amountsIn] =
        WeightedPoolDecoder.joinExactTokensInForBPTOut(encodedUserData);
      return amountsIn;
    } else if (joinKind === WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT) {
      const [, bptAmountOut, tokenIndex] =
        WeightedPoolDecoder.joinTokenInForExactBPTOut(encodedUserData);
      return [bptAmountOut.toString(), tokenIndex];
    } else throw new Error('Non supported join data');
  }

  allTokensInForExactBPTOut(encodedUserData: string, pool: PoolBase): string {
    throw new Error('joinAllTokensInForExactBPTOut not supported');
    /*
      We need maths for _calcAllTokensInGivenExactBptOut
      From SC:
      uint256 bptAmountOut = userData.allTokensInForExactBptOut();
      // Note that there is no maximum amountsIn parameter: this is handled by `IVault.joinPool`.

      uint256[] memory amountsIn = WeightedMath._calcAllTokensInGivenExactBptOut(balances, bptAmountOut, totalSupply);

      return (bptAmountOut, amountsIn);

      const bptAmountOut = this.decodeJoinData(
      encodedUserData,
      PoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT
    );
    */
  }

  joinExactTokensInForBPTOut(
    encodedUserData: string,
    pool: PoolBase
  ): [string, string[], string[]] {
    // This does not include a value for pre-minted BPT
    const amountsInWithRef = this.decodeJoinData(
      encodedUserData,
      WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT
    ) as string[];

    const amountsIn = this.doChainedRefReplacements(amountsInWithRef);
    // Calculate amount of BPT out given exact amounts in
    const bptAmountOut = pool._calcBptOutGivenExactTokensIn(
      amountsIn.map((a) => BigNumber.from(a))
    );
    // Updates BPT/totalShares value for pool
    pool.updateTokenBalanceForPool(
      pool.address,
      pool.totalShares.add(bptAmountOut)
    );
    const tokensWithoutBpt = pool.tokens.filter(
      (t) => !isSameAddress(t.address, pool.address)
    );
    // Update each tokens balance
    amountsIn.forEach((amount, i) => {
      const balanceEvm = parseFixed(
        tokensWithoutBpt[i].balance.toString(),
        tokensWithoutBpt[i].decimals
      );
      pool.updateTokenBalanceForPool(
        tokensWithoutBpt[i].address,
        balanceEvm.add(amount)
      );
    });
    return [
      bptAmountOut.toString(),
      tokensWithoutBpt.map((t) => t.address),
      amountsIn,
    ];
  }

  joinTokenInForExactBPTOut(
    encodedUserData: string,
    pool: PoolBase
  ): [string, string, string] {
    const [bptAmountOutWithRef, tokenInIndex] = this.decodeJoinData(
      encodedUserData,
      WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT
    ) as string;

    const bptAmountOut = this.doChainedRefReplacement(bptAmountOutWithRef);
    // Uses an existing SOR functionality so need to deal with pairData and scaling
    const pairData = pool.parsePoolPairData(
      pool.tokensList[Number(tokenInIndex)],
      pool.address
    );

    const bptAmountOutHuman = formatFixed(bptAmountOut, 18);
    // Needs human scale
    const amountInHuman = pool
      ._tokenInForExactTokenOut(pairData, bnum(bptAmountOutHuman.toString()))
      .dp(pairData.decimalsIn);
    const amountInEvm = parseFixed(
      amountInHuman.toString(),
      pairData.decimalsIn
    );

    // Update balances of tokenIn and tokenOut - use EVM scale
    pool.updateTokenBalanceForPool(
      pairData.tokenIn,
      pairData.balanceIn.add(amountInEvm)
    );
    // For a join we have to add the extra BPT to the balance as this is equivalent to bptTotalSupply
    pool.updateTokenBalanceForPool(
      pairData.tokenOut,
      pairData.balanceOut.add(bptAmountOut)
    );

    return [amountInEvm.toString(), pairData.tokenIn, amountInEvm.toString()];
  }

  /**
   * Perform the specified exit type.
   * @param joinPoolRequest
   * @returns tokens out
   */
  async doJoinPool(
    joinPoolRequest: JoinPoolRequest
  ): Promise<[string[], string[]]> {
    const pools = await this.poolsDictionary();
    const pool = pools[joinPoolRequest.poolId];
    const joinKind = this.joinKind(joinPoolRequest.encodedUserData);
    let bptOut = '0';
    let tokens: string[] = [];
    let amounts: string[] = [];
    if (joinKind === WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT) {
      // Returns amount of tokens in - This isn't currently implemented
      bptOut = this.allTokensInForExactBPTOut(
        joinPoolRequest.encodedUserData,
        pool
      );
    } else if (joinKind === WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT) {
      // Returns amount of BPT out
      [bptOut, tokens, amounts] = this.joinExactTokensInForBPTOut(
        joinPoolRequest.encodedUserData,
        pool
      );
    } else if (joinKind === WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT) {
      // Returns amount of tokenIn
      let tokenIn: string, amountIn: string;
      [bptOut, tokenIn, amountIn] = this.joinTokenInForExactBPTOut(
        joinPoolRequest.encodedUserData,
        pool
      );
      tokens.push(tokenIn);
      amounts.push(amountIn);
    } else throw new Error('Exit type not implemented');

    tokens.push(pool.address);
    // -ve because coming from Vault
    amounts.push(Zero.sub(bptOut).toString());

    if (
      joinPoolRequest.outputReference &&
      Relayer.isChainedReference(joinPoolRequest.outputReference)
    ) {
      this.setChainedReferenceValue(joinPoolRequest.outputReference, bptOut);
    }
    return [tokens, amounts];
  }

  /**
   * Finds exit kind given encoded user data and pool type.
   * @param poolType
   * @param encodedUserData
   * @returns
   */
  exitKind(poolType: PoolType, encodedUserData: string): WeightedPoolExitKind {
    const decodedUserData = defaultAbiCoder.decode(
      ['uint256'],
      encodedUserData
    );
    const exitKind = decodedUserData[0] as BigNumber;
    if (!exitKind) throw new Error('No exit kind.');
    if (poolType === PoolType.ComposableStable) {
      if (
        exitKind.toNumber() ===
        ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT
      )
        return WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT;
      else {
        return WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT;
      }
    } else {
      return exitKind.toNumber() as WeightedPoolExitKind;
    }
  }
  /**
   * Decodes user exit data and returns token input amounts
   * @param encodedUserData
   * @param exitKind
   * @returns
   */
  decodeExitData(
    encodedUserData: string,
    exitKind: WeightedPoolExitKind
  ): string[] {
    // At the moment all pools have same structure so just use WeightedPoolDecoded for all
    if (exitKind === WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT) {
      const [, amountsOut, maxBPTAmountIn] =
        WeightedPoolDecoder.exitBPTInForExactTokensOut(encodedUserData);
      return [amountsOut.toString(), maxBPTAmountIn.toString()];
    } else if (
      exitKind === WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    ) {
      const [, bptIn, tokenIndex] =
        WeightedPoolDecoder.exitExactBPTInForOneTokenOut(encodedUserData);
      return [bptIn.toString(), tokenIndex.toString()];
    } else if (exitKind === WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT) {
      const [, bptIn] =
        WeightedPoolDecoder.exitExactBPTInForTokensOut(encodedUserData);
      return [bptIn.toString()];
    } else throw new Error('Non supported exit data');
  }

  /**
   * Exit pool, BPT in to tokens out.
   * Updates pool balances.
   * @param encodedUserData
   * @param pool
   * @returns tokensOut
   */
  exactBptInForTokensOut(
    encodedUserData: string,
    pool: PoolBase
  ): [string, string[], string[]] {
    const [bptInWithRef] = this.decodeExitData(
      encodedUserData,
      WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT
    );

    const bptIn = this.doChainedRefReplacement(bptInWithRef);
    // Calculate amount of tokens out given an exact amount of BPT in
    const amountsOut = pool
      ._calcTokensOutGivenExactBptIn(BigNumber.from(bptIn))
      .map((a) => a.toString());

    // Updates BPT/totalShares value for pool
    pool.updateTokenBalanceForPool(pool.address, pool.totalShares.sub(bptIn));
    const tokensWithoutBpt = pool.tokens.filter(
      (t) => !isSameAddress(t.address, pool.address)
    );
    // Update each tokens balance
    amountsOut.forEach((t, i) => {
      const balanceEvm = parseFixed(
        tokensWithoutBpt[i].balance.toString(),
        tokensWithoutBpt[i].decimals
      );
      pool.updateTokenBalanceForPool(
        tokensWithoutBpt[i].address,
        balanceEvm.sub(t)
      );
    });
    return [bptIn, tokensWithoutBpt.map((t) => t.address), amountsOut];
  }

  /**
   * Exit pool, BPT in to single token out.
   * Updates pool balances.
   * @param encodedUserData
   * @param pool
   * @returns tokens out
   */
  exactBptInForOneTokenOut(
    encodedUserData: string,
    pool: PoolBase
  ): [string, string[], string[]] {
    const [bptInWithRef, tokenIndex] = this.decodeExitData(
      encodedUserData,
      WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    );
    const bptIn = this.doChainedRefReplacement(bptInWithRef);
    // Uses an existing SOR functionality so need to deal with pairData and scaling
    const pairData = pool.parsePoolPairData(
      pool.address,
      pool.tokensList[Number(tokenIndex)]
    );
    // Calculation requires floating point number input
    const amountInHuman: string = formatFixed(bptIn, pairData.decimalsIn);
    // Calculate amount of token out given an exact amount of BPT in
    const amountOutHuman = pool
      ._exactTokenInForTokenOut(pairData, bnum(amountInHuman))
      .dp(pairData.decimalsOut);
    const amountOutEvm = parseFixed(
      amountOutHuman.toString(),
      pairData.decimalsOut
    );

    const poolBalances = getBalancesForTokens(pool, [
      pool.address,
      pairData.tokenOut,
    ]);
    // Update balances use EVM scaled
    // Exiting a pool is equivalent to removing from totalSupply so must sub here
    pool.updateTokenBalanceForPool(
      pool.address,
      BigNumber.from(poolBalances[0]).sub(bptIn)
    );
    // Subtract token out amount from pool
    pool.updateTokenBalanceForPool(
      pairData.tokenOut,
      BigNumber.from(poolBalances[1]).sub(amountOutEvm)
    );
    const tokensWithoutBpt = pool.tokensList.filter(
      (t) => !isSameAddress(t, pool.address)
    );
    const amountsOut = new Array(tokensWithoutBpt.length).fill('0');
    amountsOut[Number(tokenIndex)] = amountOutEvm.toString();
    return [bptIn, tokensWithoutBpt, amountsOut];
  }

  /**
   * Perform the specified exit type.
   * @param exitPoolRequest
   * @returns tokens out
   */
  async doExitPool(
    exitPoolRequest: ExitPoolRequest
  ): Promise<[string[], string[]]> {
    const pools = await this.poolsDictionary();
    const pool = pools[exitPoolRequest.poolId];
    const exitKind = this.exitKind(
      exitPoolRequest.poolType,
      exitPoolRequest.encodedUserData
    );
    let amountsOut: string[] = [];
    let bptIn: string;
    let tokensOut: string[] = [];
    const tokens: string[] = [];
    const deltas: string[] = [];
    if (exitKind === WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT) {
      [bptIn, tokensOut, amountsOut] = this.exactBptInForTokensOut(
        exitPoolRequest.encodedUserData,
        pool
      );
    } else if (
      exitKind === WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    ) {
      [bptIn, tokensOut, amountsOut] = this.exactBptInForOneTokenOut(
        exitPoolRequest.encodedUserData,
        pool
      );
    } else throw new Error('Exit type not implemented');

    // Save any chained references
    for (let i = 0; i < exitPoolRequest.outputReferences.length; i++) {
      this.setChainedReferenceValue(
        exitPoolRequest.outputReferences[i].key.toString(),
        amountsOut[exitPoolRequest.outputReferences[i].index]
      );
    }
    tokens.push(pool.address, ...tokensOut);
    deltas.push(bptIn, ...amountsOut.map((a) => Zero.sub(a).toString()));
    return [tokens, deltas];
  }

  /**
   * Performs a series of swaps with one or multiple Pools.
   * @param batchSwapRequest
   * @returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.
   */
  async doBatchSwap(batchSwapRequest: BatchSwapRequest): Promise<string[]> {
    const assets = batchSwapRequest.assets;
    const pools = await this.poolsDictionary();
    const deltas = new Array(assets.length).fill(Zero);
    // Used for multihop swaps where previous swap return is used as input to next swap
    let previousAmount: string;

    for (let i = 0; i < batchSwapRequest.swaps.length; ++i) {
      const amount = batchSwapRequest.swaps[i].amount;
      if (Relayer.isChainedReference(amount)) {
        batchSwapRequest.swaps[i].amount =
          this.getChainedReferenceValue(amount);
      }
    }

    // Handle each swap in order
    batchSwapRequest.swaps.forEach((swap) => {
      const tokenIn = assets[swap.assetInIndex];
      const tokenOut = assets[swap.assetOutIndex];
      const pool = pools[swap.poolId];
      let amount = swap.amount;
      if (amount === '0') amount = previousAmount;
      const [amountInEvm, amountOutEvm] = this.doSwap(
        tokenIn,
        tokenOut,
        pool,
        batchSwapRequest.swapType,
        amount
      );

      previousAmount =
        batchSwapRequest.swapType === SwapType.SwapExactIn
          ? amountOutEvm.toString()
          : amountInEvm.toString();

      deltas[swap.assetInIndex] = deltas[swap.assetInIndex].add(amountInEvm);
      deltas[swap.assetOutIndex] = deltas[swap.assetOutIndex].sub(amountOutEvm);
    });

    for (let i = 0; i < batchSwapRequest.outputReferences.length; i++) {
      // Batch swap return values are signed, as they are Vault deltas (positive values correspond to assets sent
      // to the Vault, and negative values are assets received from the Vault). To simplify the chained reference
      // value model, we simply store the absolute value.
      this.setChainedReferenceValue(
        batchSwapRequest.outputReferences[i].key.toString(),
        deltas[batchSwapRequest.outputReferences[i].index].abs().toString()
      );
    }
    return deltas.map((d) => d.toString());
  }

  /**
   * Perform swap against a pool (and update balances)
   * @param tokenIn
   * @param tokenOut
   * @param pool
   * @param swapType
   * @param amount (EVM Scale)
   * @returns
   */
  doSwap(
    tokenIn: string,
    tokenOut: string,
    pool: PoolBase,
    swapType: SwapType,
    amount: string
  ): BigNumber[] {
    const pairData = pool.parsePoolPairData(tokenIn, tokenOut);
    const isExactIn = swapType === SwapType.SwapExactIn;
    let amountInEvm: string | BigNumber = isExactIn
      ? BigNumber.from(amount)
      : Zero;
    let amountOutEvm: string | BigNumber = isExactIn
      ? Zero
      : BigNumber.from(amount);
    const amountInHuman: string | BigNumber = formatFixed(
      amountInEvm,
      pairData.decimalsIn
    );
    const amountOutHuman: string | BigNumber = formatFixed(
      amountOutEvm,
      pairData.decimalsOut
    );

    if (isExactIn) {
      // Needs human scale
      const amountOutHuman = pool
        ._exactTokenInForTokenOut(pairData, bnum(amountInHuman.toString()))
        .dp(pairData.decimalsOut);
      amountOutEvm = parseFixed(
        amountOutHuman.toString(),
        pairData.decimalsOut
      );
    } else {
      // Needs human scale
      const amountInHuman = pool
        ._tokenInForExactTokenOut(pairData, bnum(amountOutHuman.toString()))
        .dp(pairData.decimalsIn);
      amountInEvm = parseFixed(amountInHuman.toString(), pairData.decimalsIn);
    }
    // Update balances of tokenIn and tokenOut - use EVM scale
    pool.updateTokenBalanceForPool(
      pairData.tokenIn,
      pairData.balanceIn.add(amountInEvm)
    );
    pool.updateTokenBalanceForPool(
      pairData.tokenOut,
      pairData.balanceOut.sub(amountOutEvm)
    );
    return [amountInEvm, amountOutEvm];
  }
}
