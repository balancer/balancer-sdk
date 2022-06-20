import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';

import { WeightedPoolEncoder } from '@/pool-weighted';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  ExactTokensInJoinPoolParameters,
} from '../types';
import { JoinPoolRequest } from '@/types';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { AssetHelpers } from '@/lib/utils';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';

export class WeightedPoolJoin implements JoinConcern {
  // Static

  /**
   * Encode joinPool in an ABI byte string
   *
   * [See method for a join pool](https://dev.balancer.fi/references/contracts/apis/the-vault#joinpool).
   *
   * _NB: This method doesn't execute a join pool -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
   * containing the data of the function call on a contract, which can then be sent to the network to be executed.
   * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
   *
   * @param {JoinPool}          joinPool - join pool information to be encoded
   * @param {string}            joinPool.poolId - id of pool being joined
   * @param {string}            joinPool.sender - account address sending tokens to join pool
   * @param {string}            joinPool.recipient - account address receiving BPT after joining pool
   * @param {JoinPoolRequest}   joinPool.joinPoolRequest - object containing join pool request information
   * @returns {string}          encodedJoinPoolData - Returns an ABI byte string containing the data of the function call on a contract
   */
  static encodeJoinPool({
    poolId,
    sender,
    recipient,
    joinPoolRequest,
  }: JoinPool): string {
    const vaultInterface = Vault__factory.createInterface();

    return vaultInterface.encodeFunctionData('joinPool', [
      poolId,
      sender,
      recipient,
      joinPoolRequest,
    ]);
  }

  // Join Concern Interface

  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {ExactTokensInJoinPoolParameters} params - parameters used to build exact tokens in for bpt out transaction
   * @param {string}                          params.joiner - Account address joining pool
   * @param {SubgraphPoolBase}                params.pool - Subgraph pool object of pool being joined
   * @param {string[]}                        params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}                        params.amountsIn - Token amounts provided for joining pool (same length and order as tokensIn)
   * @param {string}                          params.slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns                                 transaction request ready to send with signer.sendTransaction
   */
  async buildExactTokensInJoinPool({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
  }: ExactTokensInJoinPoolParameters): Promise<JoinPoolAttributes> {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new Error('Must provide amount for all tokens in the pool');
    }
    const [sortedTokensIn, parsedAmountsIn, parsedMinBPTOut] =
      this.calcBptOutGivenExactTokensIn(pool, tokensIn, amountsIn, slippage);

    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      parsedAmountsIn,
      parsedMinBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokensIn,
        maxAmountsIn: parsedAmountsIn,
        userData,
        fromInternalBalance: false,
      },
    };
    const data = WeightedPoolJoin.encodeJoinPool(attributes);

    return { to, functionName, attributes, data };
  }

  // Helper methods

  /**
   * Sort pool info alphabetically by token addresses as required by calcBptOutGivenExactTokensIn
   * @param {SubgraphPoolBase}  pool - Subgraph pool object containing pool info to be sorted
   * @param {string[]}          tokensIn - Array containing addresses of tokens to be sorted
   * @param {string[]}          amountsIn - Array containing amounts of tokens to be sorted
   * @returns                   sorted pool info
   */
  private sortPoolInfo(
    pool: SubgraphPoolBase,
    tokensIn: string[],
    amountsIn: string[]
  ): [
    sortedTokens: string[],
    sortedBalances: string[],
    sortedWeights: string[],
    sortedAmounts: string[],
    sortedDecimals: string[]
  ] {
    const WETH = '0x000000000000000000000000000000000000000F';
    const assetHelpers = new AssetHelpers(WETH);
    const [sortedTokensIn, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];
    const [sortedTokens, sortedBalances, sortedWeights, sortedDecimals] =
      assetHelpers.sortTokens(
        pool.tokens.map((token) => token.address),
        pool.tokens.map((token) => token.balance),
        pool.tokens.map((token) => token.weight),
        pool.tokens.map((token) => token.decimals)
      ) as [string[], string[], string[], string[]];
    return [
      sortedTokens,
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
    ];
  }

  /**
   * Parse pool info by respective decimals
   * @param {string[]}  sortedBalances - Token balances to be parsed
   * @param {string[]}  sortedWeights - Token weights to be parsed
   * @param {string[]}  sortedAmounts - Token amounts to be parsed
   * @param {string[]}  sortedDecimals - Token decimals used for parsing
   * @param {string}    totalShares - Pool total supply to be parsed
   * @param {string}    swapFee - Pool swap fee to be parsed
   * @returns           parsed pool info
   */
  private parseCalcInputs(
    sortedBalances: string[],
    sortedWeights: string[],
    sortedAmounts: string[],
    sortedDecimals: string[],
    totalShares: string,
    swapFee: string
  ): [
    parsedBalances: OldBigNumber[],
    parsedWeights: OldBigNumber[],
    parsedAmounts: OldBigNumber[],
    parsedTotalShares: OldBigNumber,
    parsedSwapFee: OldBigNumber
  ] {
    const bnum = (val: string | number | OldBigNumber): OldBigNumber => {
      const number = typeof val === 'string' ? val : val ? val.toString() : '0';
      return new OldBigNumber(number);
    };
    const _parsedBalances = sortedBalances.map((balance, i) =>
      bnum(parseUnits(balance, sortedDecimals[i]).toString())
    );
    const _parsedWeights = sortedWeights.map((weight) =>
      bnum(parseUnits(weight).toString())
    );
    const _parsedAmounts = sortedAmounts.map((amount, i) =>
      bnum(parseUnits(amount, sortedDecimals[i]).toString())
    );
    const _parsedTotalShares = bnum(parseUnits(totalShares).toString());
    const _parsedSwapFee = bnum(parseUnits(swapFee).toString());
    return [
      _parsedBalances,
      _parsedWeights,
      _parsedAmounts,
      _parsedTotalShares,
      _parsedSwapFee,
    ];
  }

  /**
   * Calculate BPT out given exact tokens in
   * @param {SubgraphPoolBase}  pool - Subgraph pool object
   * @param {string[]}          tokensIn - Token addresses
   * @param {string[]}          amountsIn - Token amounts
   * @param {string}            slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns                   expected BPT out factored by slippage tolerance
   */
  private calcBptOutGivenExactTokensIn(
    pool: SubgraphPoolBase,
    tokensIn: string[],
    amountsIn: string[],
    slippage?: string
  ): [string[], string[], string] {
    const [
      sortedTokens,
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
    ] = this.sortPoolInfo(pool, tokensIn, amountsIn);

    const [
      parsedBalances,
      parsedWeights,
      parsedAmounts,
      parsedTotalShares,
      parsedSwapFee,
    ] = this.parseCalcInputs(
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
      pool.totalShares,
      pool.swapFee
    );

    // TODO: replace third-party BPT calculation in order to remove bignumber.js
    let fullBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
      parsedBalances,
      parsedWeights,
      parsedAmounts,
      parsedTotalShares,
      parsedSwapFee
    ).toString();

    if (slippage) {
      fullBPTOut = subSlippage(fullBPTOut, 0, slippage);
    }
    return [
      sortedTokens,
      parsedAmounts.map((amount) => amount.toString()),
      fullBPTOut,
    ];
  }
}
