import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import * as SOR from '@balancer-labs/sor';
import { Vault__factory } from '@balancer-labs/typechain';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { balancerVault } from '@/lib/constants/config';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { _upscaleArray } from '@/lib/utils/solidityMaths';
import { StablePoolEncoder } from '@/pool-stable';
import { Pool } from '@/types';
import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  JoinPoolParameters,
} from '../types';

type SortedValues = {
  parsedTokens: string[];
  parsedAmp: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  upScaledBalances: string[];
  upScaledAmountsIn: bigint[];
  sortedAmountsIn: string[];
};

type EncodeJoinPoolParams = {
  joiner: string;
  poolId: string;
  minBPTOut: string;
} & Pick<SortedValues, 'parsedTokens' | 'sortedAmountsIn'> &
  Pick<JoinPoolParameters, 'amountsIn' | 'tokensIn'>;

export class StablePoolJoin implements JoinConcern {
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
    this.checkInputs(tokensIn, amountsIn, pool);
    const sortedValues = this.sortValues({
      pool,
      wrappedNativeAsset,
      tokensIn,
      amountsIn,
    });

    const { expectedBPTOut, minBPTOut } = this.calcBptOutGivenExactTokensIn({
      ...sortedValues,
      slippage,
    });

    const encodedData = this.encodeJoinPool({
      joiner,
      amountsIn,
      tokensIn,
      poolId: pool.id,
      minBPTOut,
      ...sortedValues,
    });

    return {
      ...encodedData,
      minBPTOut,
      expectedBPTOut,
    };
  };

  checkInputs = (amountsIn: string[], tokensIn: string[], pool: Pool): void => {
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
  };

  sortValues = ({
    pool,
    wrappedNativeAsset,
    amountsIn,
    tokensIn,
  }: Pick<
    JoinPoolParameters,
    'pool' | 'wrappedNativeAsset' | 'amountsIn' | 'tokensIn'
  >): SortedValues => {
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      scalingFactors,
      upScaledBalances,
    } = parsePoolInfo(pool, wrappedNativeAsset);

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // sort inputs
    const [, sortedAmountsIn] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    // Maths should use upscaled amounts, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsIn = _upscaleArray(
      sortedAmountsIn.map((a) => BigInt(a)),
      scalingFactors.map((a) => BigInt(a))
    );
    return {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      upScaledBalances,
      upScaledAmountsIn,
      sortedAmountsIn,
    };
  };

  calcBptOutGivenExactTokensIn = ({
    parsedAmp,
    upScaledBalances,
    upScaledAmountsIn,
    parsedTotalShares,
    parsedSwapFee,
    slippage,
  }: Pick<JoinPoolParameters, 'slippage'> &
    Pick<
      SortedValues,
      | 'parsedAmp'
      | 'upScaledBalances'
      | 'upScaledAmountsIn'
      | 'parsedTotalShares'
      | 'parsedSwapFee'
    >): { expectedBPTOut: string; minBPTOut: string } => {
    const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp as string),
      upScaledBalances.map((b) => BigInt(b)),
      upScaledAmountsIn,
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    return {
      expectedBPTOut,
      minBPTOut,
    };
  };

  encodeJoinPool = ({
    poolId,
    joiner,
    parsedTokens,
    sortedAmountsIn,
    amountsIn,
    tokensIn,
    minBPTOut,
  }: EncodeJoinPoolParams): Pick<
    JoinPoolAttributes,
    'value' | 'data' | 'to' | 'functionName' | 'attributes'
  > => {
    const userData = StablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmountsIn,
      minBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: parsedTokens,
        maxAmountsIn: sortedAmountsIn,
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
    return {
      value,
      data,
      to,
      functionName,
      attributes,
    };
  };
}
