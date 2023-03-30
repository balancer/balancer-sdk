import { LogDescription } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { BytesLike } from '@ethersproject/bytes';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { WeightedPoolFactory__factory } from '@/contracts/factories/WeightedPoolFactory__factory';
import { balancerVault, networkAddresses } from '@/lib/constants/config';
import {
  AssetHelpers,
  findEventInReceiptLogs,
  getRandomBytes32,
} from '@/lib/utils';
import { ContractInstances } from '@/modules/contracts/contracts.module';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import {
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  JoinPoolDecodedAttributes,
  JoinPoolRequestDecodedAttributes,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { BalancerNetworkConfig } from '@/types';
import { WeightedPool__factory } from '@/contracts';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { WeightedPoolInterface } from '@/contracts/WeightedPool';

export class WeightedFactory implements PoolFactory {
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
   * Builds a transaction for a weighted pool create operation.
   * @param factoryAddress The address of the factory for weighted pool (contract address)
   * @param name The name of the pool
   * @param symbol The symbol of the pool
   * @param tokenAddresses The token's addresses
   * @param normalizedWeights The weights for each token, ordered
   * @param rateProviders The rate providers for each token, ordered
   * @param swapFeeEvm The swapFee for the owner of the pool in string or bigint formatted to evm(100% is 1e18, 10% is 1e17, 1% is 1e16)
   * @param owner The address of the owner of the pool
   * @param salt The salt of the pool (bytes32)
   * @returns TransactionRequest object, which can be directly inserted in the transaction to create a weighted pool
   */
  create({
    name,
    symbol,
    tokenAddresses,
    normalizedWeights,
    rateProviders,
    swapFeeEvm,
    owner,
    salt,
  }: WeightedCreatePoolParameters): {
    to?: string;
    data: BytesLike;
  } {
    this.checkCreateInputs({
      tokenAddresses,
      normalizedWeights,
      swapFeeEvm,
      rateProviders,
    });
    const params = this.parseCreateParamsForEncoding({
      name,
      symbol,
      tokenAddresses,
      normalizedWeights,
      rateProviders,
      swapFeeEvm,
      owner,
      salt,
    });
    const encodedFunctionData = this.encodeCreateFunctionData(params);
    return {
      to: this.contracts.weightedPoolFactory?.address,
      data: encodedFunctionData,
    };
  }

  checkCreateInputs({
    tokenAddresses,
    normalizedWeights,
    swapFeeEvm,
    rateProviders,
  }: Pick<
    WeightedCreatePoolParameters,
    'tokenAddresses' | 'normalizedWeights' | 'swapFeeEvm' | 'rateProviders'
  >): void {
    if (
      tokenAddresses.length !== normalizedWeights.length ||
      normalizedWeights.length !== rateProviders.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
    if (tokenAddresses.length < 2) {
      throw new BalancerError(BalancerErrorCode.BELOW_MIN_TOKENS);
    }
    if (tokenAddresses.length > 8) {
      throw new BalancerError(BalancerErrorCode.ABOVE_MAX_TOKENS);
    }
    if (BigInt(swapFeeEvm) <= BigInt(0) || BigInt(swapFeeEvm) > BigInt(1e17)) {
      throw new BalancerError(BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE);
    }
    const normalizedWeightsSum = (normalizedWeights as string[]).reduce(
      (acc, cur) => SolidityMaths.add(acc, BigInt(cur)),
      BigInt(0)
    );
    if (normalizedWeightsSum !== BigInt(1e18)) {
      throw new BalancerError(BalancerErrorCode.INVALID_WEIGHTS);
    }
  }

  parseCreateParamsForEncoding = ({
    name,
    symbol,
    tokenAddresses,
    normalizedWeights,
    rateProviders,
    swapFeeEvm,
    owner,
    salt,
  }: WeightedCreatePoolParameters): [
    string,
    string,
    string[],
    BigNumberish[],
    string[],
    string,
    string,
    BytesLike
  ] => {
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedNormalizedWeights, sortedRateProviders] =
      assetHelpers.sortTokens(
        tokenAddresses,
        normalizedWeights,
        rateProviders
      ) as [string[], BigNumberish[], string[]];
    return [
      name,
      symbol,
      sortedTokens,
      sortedNormalizedWeights,
      sortedRateProviders,
      swapFeeEvm.toString(),
      owner,
      salt || getRandomBytes32(),
    ];
  };

  encodeCreateFunctionData = (
    params: [
      string,
      string,
      string[],
      BigNumberish[],
      string[],
      string,
      string,
      BytesLike
    ]
  ): string => {
    const weightedPoolInterface =
      WeightedPoolFactory__factory.createInterface();

    return weightedPoolInterface.encodeFunctionData('create', params);
  };

  /**
   * Returns a InitJoinPoolAttributes to make a init join transaction
   * @param joiner The address of the joiner of the pool
   * @param poolId The id of the pool
   * @param tokensIn Array with the address of the tokens
   * @param amountsIn Array with the amount of each token
   * @returns InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a weighted pool
   */
  buildInitJoin({
    joiner,
    poolId,
    tokensIn,
    amountsIn,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    this.checkInitJoinInputs({
      poolId,
      tokensIn,
      amountsIn,
    });
    const { attributes, params } = this.parseParamsForInitJoin({
      joiner,
      poolId,
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

  parseParamsForInitJoin = ({
    joiner,
    poolId,
    tokensIn,
    amountsIn,
  }: Omit<InitJoinPoolParameters, 'poolAddress'>): {
    attributes: JoinPoolDecodedAttributes;
    params: [string, string, string, JoinPoolRequestDecodedAttributes];
  } => {
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);

    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    const userData = WeightedPoolEncoder.joinInit(sortedAmounts);

    const attributes = {
      poolId: poolId,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedAmounts,
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
  checkInitJoinInputs = ({
    poolId,
    tokensIn,
    amountsIn,
  }: Pick<
    InitJoinPoolParameters,
    'tokensIn' | 'amountsIn' | 'poolId'
  >): void => {
    if (!poolId) {
      throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
    }
    if (tokensIn.length !== amountsIn.length) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
  };

  async getPoolAddressAndIdWithReceipt(
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ): Promise<{ poolId: string; poolAddress: string }> {
    const poolCreationEvent: LogDescription = findEventInReceiptLogs({
      receipt,
      to: this.contracts.weightedPoolFactory?.address || '',
      contractInterface: WeightedPoolFactory__factory.createInterface(),
      logName: 'PoolCreated',
    });

    const poolAddress = poolCreationEvent.args.pool;
    const weightedPoolInterface = this.getPoolInterface();
    const pool = new Contract(poolAddress, weightedPoolInterface, provider);
    const poolId = await pool.getPoolId();
    return {
      poolAddress,
      poolId,
    };
  }

  getPoolInterface(): WeightedPoolInterface {
    return WeightedPool__factory.createInterface();
  }
}
