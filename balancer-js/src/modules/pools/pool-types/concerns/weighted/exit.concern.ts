import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';
import {
  ExitConcern,
  ExitExactBPTInForTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { AssetHelpers } from '@/lib/utils';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Vault__factory } from '@balancer-labs/typechain';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { balancerVault } from '@/lib/constants/config';
import { ExitPoolRequest } from '@/types';

export class WeightedPoolExit implements ExitConcern {
  // Static

  /**
   * Encode exitPool in an ABI byte string
   *
   * [See method for a exit pool](https://dev.balancer.fi/references/contracts/apis/the-vault#exitpool).
   *
   * _NB: This method doesn't execute an exit pool -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
   * containing the data of the function call on a contract, which can then be sent to the network to be executed.
   * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
   *
   * @param {ExitPool}          exitPool - exit pool information to be encoded
   * @param {string}            exitPool.poolId - id of pool being exited
   * @param {string}            exitPool.sender - account address sending BPT to exit pool
   * @param {string}            exitPool.recipient - account address receiving tokens after exiting pool
   * @param {ExitPoolRequest}   exitPool.exitPoolRequest - object containing exit pool request information
   * @returns {string}          encodedExitPoolData - Returns an ABI byte string containing the data of the function call on a contract
   */
  static encodeExitPool({
    poolId,
    sender,
    recipient,
    exitPoolRequest,
  }: ExitPool): string {
    const vaultInterface = Vault__factory.createInterface();

    return vaultInterface.encodeFunctionData('exitPool', [
      poolId,
      sender,
      recipient,
      exitPoolRequest,
    ]);
  }

  // Exit Concern

  /**
   * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param {ExitExactBPTInForTokensOutParameters}  params - parameters used to build exact BPT in for token amounts out transaction
   * @param {string}                                params.exiter - Account address exiting pool
   * @param {SubgraphPoolBase}                      params.pool - Subgraph pool object of pool being exited
   * @param {string}                                params.bptIn - BPT provided for exiting pool
   * @param {string}                                params.slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns                                       transaction request ready to send with signer.sendTransaction
   */
  async buildExitExactBPTInForTokensOut({
    exiter,
    pool,
    bptIn,
    slippage,
  }: ExitExactBPTInForTokensOutParameters): Promise<ExitPoolAttributes> {
    if (
      !bptIn.length ||
      parseFixed(bptIn, 18).isZero() ||
      parseFixed(bptIn, 18).isNegative()
    ) {
      throw new Error('Must provide bptIn greater than zero');
    }

    const [sortedTokensOut, parsedAmountsOut, parsedBptIn] =
      this.calcTokensOutGivenExactBptIn(pool, bptIn, slippage);

    const userData =
      WeightedPoolEncoder.exitExactBPTInForTokensOut(parsedBptIn);

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: pool.id,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: sortedTokensOut,
        minAmountsOut: parsedAmountsOut,
        userData,
        toInternalBalance: false,
      },
    };
    const data = WeightedPoolExit.encodeExitPool(attributes);

    return { to, functionName, attributes, data };
  }

  // Helper methods

  /**
   * Sort pool info alphabetically by token addresses as required by calcTokensOutGivenExactBptIn
   * @param {SubgraphPoolBase}  pool - Subgraph pool object containing pool info to be sorted
   * @returns                   sorted pool info
   */
  private sortPoolInfo(
    pool: SubgraphPoolBase
  ): [
    sortedTokens: string[],
    sortedBalances: string[],
    sortedDecimals: string[]
  ] {
    const WETH = '0x000000000000000000000000000000000000000F';
    const assetHelpers = new AssetHelpers(WETH);
    const [sortedTokens, sortedBalances, sortedDecimals] =
      assetHelpers.sortTokens(
        pool.tokens.map((token) => token.address),
        pool.tokens.map((token) => token.balance),
        pool.tokens.map((token) => token.decimals)
      ) as [string[], string[], string[]];
    return [sortedTokens, sortedBalances, sortedDecimals];
  }
  /**
   * Parse pool info by respective decimals
   * @param {string[]}  sortedBalances - Token balances to be parsed
   * @param {string[]}  sortedDecimals - Token decimals used for parsing
   * @param {string}    bptIn - BPT in to be parsed
   * @param {string}    totalShares - Pool total supply to be parsed
   * @returns           parsed pool info
   */
  private parseCalcInputs(
    sortedBalances: string[],
    sortedDecimals: string[],
    bptIn: string,
    totalShares: string
  ): [
    parsedBalances: OldBigNumber[],
    parsedBptIn: OldBigNumber,
    parsedTotalShares: OldBigNumber
  ] {
    const bnum = (val: string | number | OldBigNumber): OldBigNumber => {
      const number = typeof val === 'string' ? val : val ? val.toString() : '0';
      return new OldBigNumber(number);
    };
    const _parsedBalances = sortedBalances.map((balance, i) =>
      bnum(parseUnits(balance, sortedDecimals[i]).toString())
    );
    const _parsedBptIn = bnum(parseUnits(bptIn).toString());
    const _parsedTotalShares = bnum(parseUnits(totalShares).toString());
    return [_parsedBalances, _parsedBptIn, _parsedTotalShares];
  }

  /**
   * Calculate token amounts out given exact BPT in
   * @param {SubgraphPoolBase}  pool - Subgraph pool object
   * @param {string}            bptIn - Amount of BPT provided to exit pool
   * @param {string}            slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns                   expected token amounts out factored by slippage tolerance
   */
  private calcTokensOutGivenExactBptIn(
    pool: SubgraphPoolBase,
    bptIn: string,
    slippage: string
  ): [string[], string[], string] {
    const [sortedTokens, sortedBalances, sortedDecimals] =
      this.sortPoolInfo(pool);

    const [parsedBalances, parsedBptIn, parsedTotalShares] =
      this.parseCalcInputs(
        sortedBalances,
        sortedDecimals,
        bptIn,
        pool.totalShares
      );

    const amountsOut = SDK.WeightedMath._calcTokensOutGivenExactBptIn(
      parsedBalances,
      parsedBptIn,
      parsedTotalShares
    ).map((amount) => amount.toString());
    const minAmountsOut = amountsOut.map((amount, i) => {
      const formattedAmount = formatFixed(amount, sortedDecimals[i]);
      const minFormattedAmount = subSlippage(
        formattedAmount,
        parseInt(sortedDecimals[i]),
        slippage
      );
      return parseFixed(minFormattedAmount, sortedDecimals[i]).toString();
    });

    return [sortedTokens, minAmountsOut, parsedBptIn.toString()];
  }
}
