import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Zero } from '@ethersproject/constants';
import { bnum } from '@balancer-labs/sor';

import { PoolDictionary, Pool } from '../poolSource';
import { WeightedPoolDecoder } from '@/pool-weighted/decoder';
import { WeightedPoolJoinKind } from '@/pool-weighted/encoder';
import { isSameAddress } from '@/lib/utils';
import { Relayer } from '@/modules/relayer/relayer.module';
import { RelayerModel } from '../relayer';
import { ActionType } from '../vaultModel.module';
import { PoolToken } from '@/types';

export interface JoinPoolRequest {
  actionType: ActionType.Join;
  poolId: string;
  encodedUserData: string;
  outputReference: string;
}

export class JoinModel {
  constructor(private relayerModel: RelayerModel) {}

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

  allTokensInForExactBPTOut(): string {
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
    pool: Pool
  ): [string, string[], string[]] {
    // This does not include a value for pre-minted BPT
    const amountsInWithRef = this.decodeJoinData(
      encodedUserData,
      WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT
    ) as string[];

    const amountsIn =
      this.relayerModel.doChainedRefReplacements(amountsInWithRef);
    // Calculate amount of BPT out given exact amounts in
    const bptAmountOut = pool._calcBptOutGivenExactTokensIn(
      amountsIn.map((a) => BigNumber.from(a))
    );

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
      // subtract value because joining pool reduces pre-minted BPT being held by the pool
      pool.updateTokenBalanceForPool(
        pool.address,
        bptBalanceEVM.sub(bptAmountOut)
      );
    } else {
      // For pools that do not contain BPT as a token, update totalShares directly
      pool.updateTokenBalanceForPool(
        pool.address,
        pool.totalShares.add(bptAmountOut)
      );
    }

    const tokensWithoutBpt = pool.tokens.filter(
      (t: PoolToken) => !isSameAddress(t.address, pool.address)
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
      tokensWithoutBpt.map((t: PoolToken) => t.address),
      amountsIn,
    ];
  }

  joinTokenInForExactBPTOut(
    encodedUserData: string,
    pool: Pool
  ): [string, string, string] {
    const [bptAmountOutWithRef, tokenInIndex] = this.decodeJoinData(
      encodedUserData,
      WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT
    ) as string;

    const bptAmountOut =
      this.relayerModel.doChainedRefReplacement(bptAmountOutWithRef);
    // Uses an existing SOR functionality so need to deal with pairData and scaling
    const pairData = pool.parsePoolPairData(
      pool.tokensList[Number(tokenInIndex)],
      pool.address
    );

    const bptAmountOutHuman = formatFixed(bptAmountOut, 18);
    // Needs human scale
    const amountInHuman = pool
      ._tokenInForExactTokenOut(
        pairData as never,
        bnum(bptAmountOutHuman.toString())
      )
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
    joinPoolRequest: JoinPoolRequest,
    pools: PoolDictionary
  ): Promise<[string[], string[]]> {
    const pool = pools[joinPoolRequest.poolId];
    const joinKind = this.joinKind(joinPoolRequest.encodedUserData);
    let bptOut = '0';
    let tokens: string[] = [];
    let amounts: string[] = [];
    if (joinKind === WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT) {
      // Returns amount of tokens in - This isn't currently implemented
      bptOut = this.allTokensInForExactBPTOut();
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
      this.relayerModel.setChainedReferenceValue(
        joinPoolRequest.outputReference,
        bptOut
      );
    }
    return [tokens, amounts];
  }
}
