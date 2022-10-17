import {
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  JoinPoolParameters,
} from '../types';
import { BigNumber } from '@ethersproject/bignumber';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
import { Vault__factory } from '@balancer-labs/typechain';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import * as SOR from '@balancer-labs/sor';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { StablePoolEncoder } from '@/pool-stable';
import { balancerVault } from '@/lib/constants/config';
import { AddressZero } from '@ethersproject/constants';

export class ComposableStablePoolJoin implements JoinConcern {
  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {JoinPoolParameters}  params - parameters used to build exact tokens in for bpt out transaction
   * @param {string}              params.joiner - Account address joining pool
   * @param {Pool}                params.pool - Subgraph pool object of pool being joined
   * @param {string[]}            params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}            params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
   * @param {string}              params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
   * @returns                     transaction request ready to send with signer.sendTransaction
   */
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // sort inputs
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];
    // sort pool info
    const [, sortedBalances] = assetHelpers.sortTokens(
      parsedTokens,
      parsedBalances
    ) as [string[], string[]];

    const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp as string),
      sortedBalances.map((b) => BigInt(b)),
      sortedAmounts.map((a) => BigInt(a)),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    const userData = StablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmounts,
      minBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedAmounts,
        userData,
        fromInternalBalance: false,
      },
    };
    const vaultInterface = Vault__factory.createInterface();
    // encode transaction data into an ABI byte string which can be sent to the network to be executed
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);
    const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
    const value = values[0] ? BigNumber.from(values[0]) : undefined;

    return { to, functionName, attributes, data, value, minBPTOut };
  };

  /**
   * Build Init join pool transaction parameters (Can only be made once per pool)
   * @param {JoinPoolParameters} params - parameters used to build exact tokens in for bpt out transaction
   * @param {string}                          params.joiner - Account address joining pool
   * @param {SubgraphPoolBase}                params.pool - Subgraph pool object of pool being joined
   * @param {string[]}                        params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}                        params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
   * @param {string}                          wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for joining with ETH.
   * @returns                                 transaction request ready to send with signer.sendTransaction
   */
  buildInitJoin({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    wrappedNativeAsset,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);

    // sort inputs
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    const userData = ComposableStablePoolEncoder.joinInit(sortedAmounts);
    const functionName = 'joinPool';

    const attributes = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedAmounts,
        userData,
        fromInternalBalance: false,
      },
    };

    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);

    return {
      to: pool.address,
      functionName,
      attributes,
      data,
    };
  }
}
