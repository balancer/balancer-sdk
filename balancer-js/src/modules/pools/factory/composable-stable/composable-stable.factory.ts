import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  JoinPoolDecodedAttributes,
  JoinPoolRequestDecodedAttributes,
} from '@/modules/pools/factory/types';
import { balancerVault, networkAddresses } from '@/lib/constants/config';
import { AssetHelpers, getRandomBytes32 } from '@/lib/utils';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { BalancerNetworkConfig } from '@/types';
import {
  ComposableStablePool__factory,
  ComposableStablePoolFactory__factory,
} from '@/contracts';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { LogDescription } from '@ethersproject/abi';
import { findEventInReceiptLogs } from '@/lib/utils';
import { Contract } from '@ethersproject/contracts';
import { ContractInstances } from '@/modules/contracts/contracts.module';
import { BytesLike } from '@ethersproject/bytes';
import { ComposableStablePoolInterface } from '@/contracts/ComposableStablePool';

export class ComposableStableFactory implements PoolFactory {
  private wrappedNativeAsset: string;
  private contracts: ContractInstances;

  constructor(
    networkConfig: BalancerNetworkConfig,
    contracts: ContractInstances
  ) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.contracts = contracts;
  }

  /**
   * Builds a transaction for a composable pool create operation.
   * @param name The name of the pool
   * @param symbol The symbol of the pool
   * @param tokenAddresses The token's addresses
   * @param amplificationParameter The amplification parameter(must be greater than 1)
   * @param rateProviders The addresses of the rate providers for each token, ordered
   * @param tokenRateCacheDurations the Token Rate Cache Duration of each token
   * @param exemptFromYieldProtocolFeeFlags Array containing boolean for each token exemption from yield protocol fee flags
   * @param swapFeeEvm The swapFee for the owner of the pool in string format parsed to evm(100% is 1e18, 10% is 1e17, 1% is 1e16)
   * @param owner The address of the owner of the pool
   * @returns A TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
   */
  create({
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFeeEvm,
    owner,
    salt,
  }: ComposableStableCreatePoolParameters): { to?: string; data: BytesLike } {
    this.checkCreateInputs({
      rateProviders,
      tokenAddresses,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags,
      swapFeeEvm,
    });
    const params = this.parseCreateParamsForEncoding({
      name,
      symbol,
      tokenAddresses,
      amplificationParameter,
      rateProviders,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags,
      swapFeeEvm,
      owner,
      salt,
    });
    const encodedFunctionData = this.encodeCreateFunctionData(params);
    return {
      to: this.contracts.composableStablePoolFactory?.address,
      data: encodedFunctionData,
    };
  }

  checkCreateInputs = ({
    tokenAddresses,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    rateProviders,
    swapFeeEvm,
  }: Pick<
    ComposableStableCreatePoolParameters,
    | 'rateProviders'
    | 'tokenRateCacheDurations'
    | 'tokenAddresses'
    | 'exemptFromYieldProtocolFeeFlags'
    | 'swapFeeEvm'
  >): void => {
    if (
      tokenAddresses.length !== tokenRateCacheDurations.length ||
      tokenRateCacheDurations.length !==
        exemptFromYieldProtocolFeeFlags.length ||
      exemptFromYieldProtocolFeeFlags.length !== rateProviders.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
    if (BigInt(swapFeeEvm) <= BigInt(0) || BigInt(swapFeeEvm) > BigInt(1e17)) {
      throw new BalancerError(BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE);
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
    swapFeeEvm,
    owner,
    salt,
  }: ComposableStableCreatePoolParameters): [
    string,
    string,
    string[],
    string,
    string[],
    string[],
    boolean[],
    string,
    string,
    BytesLike
  ] => {
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
      swapFeeEvm.toString(),
      owner,
      salt || getRandomBytes32(),
    ] as [
      string,
      string,
      string[],
      string,
      string[],
      string[],
      boolean[],
      string,
      string,
      BytesLike
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
      string,
      BytesLike
    ]
  ): string => {
    const composablePoolFactoryInterface =
      ComposableStablePoolFactory__factory.createInterface();
    return composablePoolFactoryInterface.encodeFunctionData('create', params);
  };

  /**
   * Builds a transaction for a composable pool init join operation.
   * @param joiner The address of the joiner of the pool
   * @param poolId The id of the pool
   * @param poolAddress The address of the pool
   * @param tokensIn Array with the address of the tokens
   * @param amountsIn Array with the amount of each token
   * @returns A InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a composable stable pool
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

  getPoolAddressAndIdWithReceipt = async (
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ): Promise<{
    poolId: string;
    poolAddress: string;
  }> => {
    const poolCreationEvent: LogDescription = findEventInReceiptLogs({
      receipt,
      to: this.contracts.composableStablePoolFactory?.address || '',
      contractInterface: ComposableStablePoolFactory__factory.createInterface(),
      logName: 'PoolCreated',
    });

    const poolAddress = poolCreationEvent.args.pool;
    const composableStablePoolInterface = this.getPoolInterface();
    const pool = new Contract(
      poolAddress,
      composableStablePoolInterface,
      provider
    );
    const poolId = await pool.getPoolId();
    return {
      poolAddress,
      poolId,
    };
  };

  getPoolInterface(): ComposableStablePoolInterface {
    return ComposableStablePool__factory.createInterface();
  }
}
