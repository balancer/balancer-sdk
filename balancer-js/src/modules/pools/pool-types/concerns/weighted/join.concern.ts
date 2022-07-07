import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';

import { WeightedPoolEncoder } from '@/pool-weighted';
import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  ExactTokensInJoinPoolParameters,
} from '../types';
import { JoinPoolRequest, Pool } from '@/types';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { AssetHelpers } from '@/lib/utils';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

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
   * @param {string[]}                        params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
   * @param {string}                          params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
   * @returns                                 transaction request ready to send with signer.sendTransaction
   */
  async buildJoin({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: ExactTokensInJoinPoolParameters): Promise<JoinPoolAttributes> {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    const parsedPoolInfo = this.parsePoolInfo(pool); // Parse pool info into EVM amounts in order to match amountsIn scalling
    const sortedCalcInputs = this.sortCalcInputs(
      parsedPoolInfo.tokens,
      parsedPoolInfo.balances,
      parsedPoolInfo.weights,
      parsedPoolInfo.decimals,
      tokensIn,
      amountsIn,
      wrappedNativeAsset
    );
    const expectedBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
      sortedCalcInputs.balances.map((b) => new OldBigNumber(b)),
      sortedCalcInputs.weights.map((w) => new OldBigNumber(w)),
      sortedCalcInputs.amounts.map((a) => new OldBigNumber(a)),
      new OldBigNumber(parsedPoolInfo.totalShares),
      new OldBigNumber(parsedPoolInfo.swapFee)
    ).toString();

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      sortedCalcInputs.amounts,
      minBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedCalcInputs.tokens,
        maxAmountsIn: sortedCalcInputs.amounts,
        userData,
        fromInternalBalance: false,
      },
    };
    const data = WeightedPoolJoin.encodeJoinPool(attributes);
    const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
    const value = values[0] ? BigNumber.from(values[0]) : undefined;

    return { to, functionName, attributes, data, value, minBPTOut };
  }

  // Helper methods

  /**
   * Sort BPT calc. inputs alphabetically by token addresses as required by calcBptOutGivenExactTokensIn
   */
  private sortCalcInputs = (
    poolTokens: string[],
    poolBalances: string[],
    poolWeights: string[],
    poolDecimals: number[],
    tokensIn: string[],
    amountsIn: string[],
    wrappedNativeAsset: string
  ) => {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [tokens, amounts] = assetHelpers.sortTokens(tokensIn, amountsIn) as [
      string[],
      string[]
    ];
    const [, balances, weights, decimals] = assetHelpers.sortTokens(
      poolTokens,
      poolBalances,
      poolWeights,
      poolDecimals
    ) as [string[], string[], string[], number[]];
    return {
      tokens,
      balances,
      weights,
      amounts,
      decimals,
    };
  };

  /**
   * Parse pool info into EVM amounts
   * @param {Pool}  pool
   * @returns       parsed pool info
   */
  private parsePoolInfo = (pool: Pool) => {
    const decimals = pool.tokens.map((token) => {
      if (!token.decimals)
        throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
      return token.decimals;
    });
    const weights = pool.tokens.map((token) => {
      if (!token.weight)
        throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
      return parseUnits(token.weight).toString();
    });
    const tokens = pool.tokens.map((token) => token.address);
    const balances = pool.tokens.map((token) =>
      parseFixed(token.balance, token.decimals).toString()
    );
    const totalShares = parseUnits(pool.totalShares).toString();
    const swapFee = parseUnits(pool.swapFee).toString();
    return {
      tokens,
      balances,
      weights,
      decimals,
      totalShares,
      swapFee,
    };
  };
}
