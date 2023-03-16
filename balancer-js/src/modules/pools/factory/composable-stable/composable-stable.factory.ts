import { parseFixed } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
} from '@/modules/pools/factory/types';
import { balancerVault, networkAddresses } from '@/lib/constants/config';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { BalancerNetworkConfig } from '@/types';
import { ComposableStableFactory__factory } from '@/contracts';

type JoinPoolDecodedAttributes = {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequestDecodedAttributes;
};

type JoinPoolRequestDecodedAttributes = {
  assets: string[];
  maxAmountsIn: string[];
  userData: string;
  fromInternalBalance: boolean;
};

export class ComposableStableFactory implements PoolFactory {
  private wrappedNativeAsset: string;

  constructor(networkConfig: BalancerNetworkConfig) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  /***
   * @param params
   *  * Builds a transaction for a composable pool create operation.
   *  * @param contractAddress The address of the factory for composable stable pool (contract address)
   *  * @param name The name of the pool
   *  * @param symbol The symbol of the pool
   *  * @param swapFee The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
   *  * @param tokenAddresses The token's addresses
   *  * @param rateProviders The addresses of the rate providers for each token, ordered
   *  * @param tokenRateCacheDurations the Token Rate Cache Duration of each token
   *  * @param owner The address of the owner of the pool
   *  * @param amplificationParameter The amplification parameter(must be greater than 1)
   *  * @param exemptFromYieldProtocolFeeFlags Array containing boolean for each token exemption from yield protocol fee flags
   *  * @returns A TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
   */
  create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
  }: ComposableStableCreatePoolParameters): TransactionRequest {
    this.checkCreateInputs({
      rateProviders,
      tokenAddresses,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags,
      swapFee,
    });
    const params = this.parseCreateParamsForEncoding({
      name,
      symbol,
      tokenAddresses,
      amplificationParameter,
      rateProviders,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags,
      swapFee,
      owner,
    });
    const encodedFunctionData = this.encodeCreateFunctionData(params);
    return {
      to: factoryAddress,
      data: encodedFunctionData,
    };
  }

  checkCreateInputs = ({
    tokenAddresses,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    rateProviders,
    swapFee,
  }: Pick<
    ComposableStableCreatePoolParameters,
    | 'rateProviders'
    | 'tokenRateCacheDurations'
    | 'tokenAddresses'
    | 'exemptFromYieldProtocolFeeFlags'
    | 'swapFee'
  >): void => {
    if (
      tokenAddresses.length !== tokenRateCacheDurations.length ||
      tokenRateCacheDurations.length !==
        exemptFromYieldProtocolFeeFlags.length ||
      exemptFromYieldProtocolFeeFlags.length !== rateProviders.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
    if (parseFixed(swapFee.toString(), 18).toBigInt() === BigInt(0)) {
      throw new BalancerError(BalancerErrorCode.MIN_SWAP_FEE_PERCENTAGE);
    }
  };
  parseCreateParamsForEncoding = ({
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
  }: Omit<ComposableStableCreatePoolParameters, 'factoryAddress'>): [
    string,
    string,
    string[],
    string,
    string[],
    string[],
    boolean[],
    string,
    string
  ] => {
    const swapFeeScaled = parseToBigInt18(`${swapFee}`);
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [
      sortedTokens,
      sortedRateProviders,
      sortedTokenRateCacheDurations,
      sortedExemptFromYieldProtocols,
    ] = assetHelpers.sortTokens(
      tokenAddresses,
      rateProviders,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags
    ) as [string[], string[], string[], boolean[]];
    const params = [
      name,
      symbol,
      sortedTokens,
      amplificationParameter,
      sortedRateProviders,
      sortedTokenRateCacheDurations,
      sortedExemptFromYieldProtocols,
      swapFeeScaled.toString(),
      owner,
    ] as [
      string,
      string,
      string[],
      string,
      string[],
      string[],
      boolean[],
      string,
      string
    ];
    return params;
  };

  encodeCreateFunctionData = (
    params: [
      string,
      string,
      string[],
      string,
      string[],
      string[],
      boolean[],
      string,
      string
    ]
  ): string => {
    const composablePoolFactoryInterface =
      ComposableStableFactory__factory.createInterface();
    return composablePoolFactoryInterface.encodeFunctionData('create', params);
  };

  /***
   * @param params
   *  * Returns an array of calculated weights for every token in the PoolSeedToken array "tokens"
   *  * @param joiner The address of the joiner of the pool
   *  * @param poolId The id of the pool
   *  * @param poolAddress The address of the pool
   *  * @param tokensIn Array with the address of the tokens
   *  * @param amountsIn Array with the amount of each token
   *  * @param wrappedNativeAsset Address of wrapped ether wETH
   *  * @returns A InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a composable stable pool
   */
  buildInitJoin({
    joiner,
    poolId,
    poolAddress,
    tokensIn,
    amountsIn,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    this.checkInitJoinInputs({
      tokensIn,
      amountsIn,
      poolId,
      poolAddress,
    });
    const { attributes, params } = this.parseParamsForInitJoin({
      joiner,
      poolId,
      poolAddress,
      tokensIn,
      amountsIn,
    });
    const { functionName, data } = this.encodeInitJoinFunctionData(params);

    return {
      to: balancerVault,
      functionName,
      data,
      attributes,
    };
  }

  checkInitJoinInputs = ({
    poolId,
    poolAddress,
    tokensIn,
    amountsIn,
  }: Pick<
    InitJoinPoolParameters,
    'tokensIn' | 'amountsIn' | 'poolId' | 'poolAddress'
  >): void => {
    if (!poolId || !poolAddress) {
      throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
    }
    if (tokensIn.length !== amountsIn.length) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
  };

  parseParamsForInitJoin = ({
    joiner,
    poolId,
    poolAddress,
    tokensIn,
    amountsIn,
  }: InitJoinPoolParameters): {
    attributes: JoinPoolDecodedAttributes;
    params: [string, string, string, JoinPoolRequestDecodedAttributes];
  } => {
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    // sort inputs
    const tokensWithBpt = [...tokensIn, poolAddress];
    const amountsWithBpt = [...amountsIn, '0'];
    const maxAmountsWithBpt = [
      ...amountsIn,
      // this max amount needs to be >= PREMINT - bptAmountOut,
      // The vault returns BAL#506 if it's not,
      // PREMINT is around 2^111, but here we set the max amount of BPT as MAX_UINT_256-1 for safety
      BigInt.asUintN(256, BigInt(-1)).toString(),
    ];
    const [sortedTokens, sortedAmounts, sortedMaxAmounts] =
      assetHelpers.sortTokens(
        tokensWithBpt,
        amountsWithBpt,
        maxAmountsWithBpt
      ) as [string[], string[], string[]];

    const userData = ComposableStablePoolEncoder.joinInit(sortedAmounts);

    const attributes: JoinPoolDecodedAttributes = {
      poolId: poolId,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedMaxAmounts,
        userData,
        fromInternalBalance: false,
      },
    };
    return {
      attributes,
      params: [
        attributes.poolId,
        attributes.sender,
        attributes.recipient,
        attributes.joinPoolRequest,
      ],
    };
  };
  encodeInitJoinFunctionData = (
    params: [string, string, string, JoinPoolRequestDecodedAttributes]
  ): {
    functionName: string;
    data: string;
  } => {
    const functionName = 'joinPool';
    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, params);

    return { functionName, data };
  };
}
