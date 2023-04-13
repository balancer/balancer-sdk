import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Zero } from '@ethersproject/constants';
import { bnum } from '@balancer-labs/sor';

import { PoolDictionary, Pool } from '../poolSource';
import { ComposableStablePoolExitKind } from '@/pool-composable-stable';
import { WeightedPoolDecoder } from '@/pool-weighted/decoder';
import { WeightedPoolExitKind } from '@/pool-weighted/encoder';
import { isSameAddress } from '@/lib/utils';
import { RelayerModel } from '../relayer';
import { ActionType } from '../vaultModel.module';
import { OutputReference } from '@/modules/relayer/types';
import { PoolToken } from '@/types';

export interface ExitPoolRequest {
  actionType: ActionType.Exit;
  poolId: string;
  encodedUserData: string;
  outputReferences: OutputReference[];
}

function getBalancesForTokens(pool: Pool, tokens: string[]): string[] {
  const balances: string[] = [];
  tokens.forEach((t) => {
    const tokenIndex = pool.tokens.findIndex((pt: PoolToken) =>
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

export class ExitModel {
  constructor(private relayerModel: RelayerModel) {}

  /**
   * Finds exit kind given encoded user data and pool type.
   * @param poolType
   * @param encodedUserData
   * @returns
   */
  exitKind(poolType: string, encodedUserData: string): WeightedPoolExitKind {
    const decodedUserData = defaultAbiCoder.decode(
      ['uint256'],
      encodedUserData
    );
    const exitKind = decodedUserData[0] as BigNumber;
    if (!exitKind) throw new Error('No exit kind.');
    if (poolType === 'ComposableStable') {
      if (
        exitKind.toNumber() ===
        ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT
      )
        return WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT;
      if (
        exitKind.toNumber() ===
        ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ALL_TOKENS_OUT
      )
        return WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT;
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
    pool: Pool
  ): [string, string[], string[]] {
    const [bptInWithRef] = this.decodeExitData(
      encodedUserData,
      WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT
    );

    const bptIn = this.relayerModel.doChainedRefReplacement(bptInWithRef);
    // Calculate amount of tokens out given an exact amount of BPT in
    const amountsOut = pool
      ._calcTokensOutGivenExactBptIn(BigNumber.from(bptIn))
      .map((a: BigNumber) => a.toString());

    // Updates BPT/totalShares value for pool
    if (
      pool.SubgraphType == 'StablePhantom' ||
      pool.SubgraphType == 'ComposableStable'
    ) {
      // Update BPT balance
      // totalShares will be updated as a side effect within SOR
      const bptAsPoolToken = pool.tokens.find((t: PoolToken) =>
        isSameAddress(t.address, pool.address)
      );
      if (!bptAsPoolToken)
        throw new Error('Pool does not contain BPT as a token');
      const bptBalanceEVM = parseFixed(
        bptAsPoolToken.balance.toString(),
        bptAsPoolToken.decimals
      );
      pool.updateTokenBalanceForPool(
        pool.address,
        bptBalanceEVM.add(bptIn) // add value because exiting pool increases pre-minted BPT being held by the pool
      );
    } else {
      // For pools that do not contain BPT as a token, update totalShares directly
      pool.updateTokenBalanceForPool(pool.address, pool.totalShares.sub(bptIn));
    }

    const tokensWithoutBpt = pool.tokens.filter(
      (t: PoolToken) => !isSameAddress(t.address, pool.address)
    );
    // Update each tokens balance
    amountsOut.forEach((amountOut: string, i: number) => {
      const balanceEvm = parseFixed(
        tokensWithoutBpt[i].balance.toString(),
        tokensWithoutBpt[i].decimals
      );
      pool.updateTokenBalanceForPool(
        tokensWithoutBpt[i].address,
        balanceEvm.sub(amountOut)
      );
    });
    return [
      bptIn,
      tokensWithoutBpt.map((t: PoolToken) => t.address),
      amountsOut,
    ];
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
    pool: Pool
  ): [string, string[], string[]] {
    const [bptInWithRef, tokenIndex] = this.decodeExitData(
      encodedUserData,
      WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    );
    const bptIn = this.relayerModel.doChainedRefReplacement(bptInWithRef);
    // Uses an existing SOR functionality so need to deal with pairData and scaling
    const pairData = pool.parsePoolPairData(
      pool.address,
      pool.tokensList[Number(tokenIndex)]
    );
    // Calculation requires floating point number input
    const amountInHuman: string = formatFixed(bptIn, pairData.decimalsIn);
    // Calculate amount of token out given an exact amount of BPT in
    const amountOutHuman = pool
      ._exactTokenInForTokenOut(pairData as never, bnum(amountInHuman))
      .dp(pairData.decimalsOut);
    const amountOutEvm = parseFixed(
      amountOutHuman.toString(),
      pairData.decimalsOut
    );

    // Update balances use EVM scaled
    const poolBalances = getBalancesForTokens(pool, [
      pool.address,
      pairData.tokenOut,
    ]);
    // Subtract token out amount from pool
    pool.updateTokenBalanceForPool(
      pairData.tokenOut,
      BigNumber.from(poolBalances[1]).sub(amountOutEvm)
    );

    if (
      pool.SubgraphType == 'StablePhantom' ||
      pool.SubgraphType == 'ComposableStable'
    ) {
      // Add value because exiting pool increases pre-minted BPT being held by the pool
      // totalShares is updated as a side effect on SOR
      pool.updateTokenBalanceForPool(
        pool.address,
        BigNumber.from(poolBalances[0]).add(bptIn)
      );
    } else {
      // Exiting a pool is equivalent to removing from totalSupply (totalShares) so must sub here
      pool.updateTokenBalanceForPool(pool.address, pool.totalShares.sub(bptIn));
    }

    const tokensWithoutBpt = pool.tokensList.filter(
      (t: string) => !isSameAddress(t, pool.address)
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
    exitPoolRequest: ExitPoolRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    const pool = pools[exitPoolRequest.poolId];
    const exitKind = this.exitKind(
      pool.SubgraphType,
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
      const tokenOut =
        pool.tokensList[exitPoolRequest.outputReferences[i].index];
      const tokenOutIndex = tokensOut.indexOf(tokenOut);
      if (tokenOutIndex === -1) throw new Error('Token out not found');
      this.relayerModel.setChainedReferenceValue(
        exitPoolRequest.outputReferences[i].key.toString(),
        amountsOut[tokenOutIndex]
      );
    }
    tokens.push(pool.address, ...tokensOut);
    deltas.push(bptIn, ...amountsOut.map((a) => Zero.sub(a).toString()));
    return [tokens, deltas];
  }
}
