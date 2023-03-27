import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  AaveLinearPool__factory,
  AaveLinearPoolFactory__factory,
  ERC4626LinearPool__factory,
  ERC4626LinearPoolFactory__factory,
  EulerLinearPool__factory,
  EulerLinearPoolFactory__factory,
  YearnLinearPool__factory,
  YearnLinearPoolFactory__factory,
} from '@/contracts';
import { AaveLinearPoolFactoryInterface } from '@/contracts/AaveLinearPoolFactory';
import { ERC4626LinearPoolFactoryInterface } from '@/contracts/ERC4626LinearPoolFactory';
import { EulerLinearPoolFactoryInterface } from '@/contracts/EulerLinearPoolFactory';
import { YearnLinearPoolFactoryInterface } from '@/contracts/YearnLinearPoolFactory';
import { networkAddresses } from '@/lib/constants/config';
import { ContractInstances } from '@/modules/contracts/contracts.module';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import {
  InitJoinPoolAttributes,
  LinearCreatePoolParameters,
  ProtocolId,
} from '@/modules/pools/factory/types';
import { BalancerNetworkConfig, PoolType } from '@/types';
import { BytesLike } from '@ethersproject/bytes';
import { LogDescription } from '@ethersproject/abi';
import { findEventInReceiptLogs } from '@/lib/utils';
import { Contract } from '@ethersproject/contracts';
import { ERC4626LinearPoolInterface } from '@/contracts/ERC4626LinearPool';
import { EulerLinearPoolInterface } from '@/contracts/EulerLinearPool';
import { AaveLinearPoolInterface } from '@/contracts/AaveLinearPool';
import { YearnLinearPoolInterface } from '@/contracts/YearnLinearPool';

type LinearPoolFactoryInterface =
  | AaveLinearPoolFactoryInterface
  | ERC4626LinearPoolFactoryInterface
  | EulerLinearPoolFactoryInterface
  | YearnLinearPoolFactoryInterface;

type LinearPoolFactoryInterfaceWithoutYearn =
  | AaveLinearPoolFactoryInterface
  | ERC4626LinearPoolFactoryInterface
  | EulerLinearPoolFactoryInterface;

type LinearPoolParamsToEncode = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

type YearnLinearPoolParamsToEncode = [
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

export class LinearFactory implements PoolFactory {
  private wrappedNativeAsset: string;
  private contracts: ContractInstances;
  private readonly poolType: PoolType;

  constructor(
    networkConfig: BalancerNetworkConfig,
    contracts: ContractInstances,
    poolType: PoolType
  ) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.contracts = contracts;
    this.poolType = poolType;
  }

  getPoolFactoryInterface = (): LinearPoolFactoryInterface => {
    switch (this.poolType) {
      case PoolType.AaveLinear:
        return AaveLinearPoolFactory__factory.createInterface();
      case PoolType.Linear:
      case PoolType.ERC4626Linear:
        return ERC4626LinearPoolFactory__factory.createInterface();
      case PoolType.EulerLinear:
        return EulerLinearPoolFactory__factory.createInterface();
      case PoolType.YearnLinear:
        return YearnLinearPoolFactory__factory.createInterface();
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  };

  getPoolInterface = ():
    | ERC4626LinearPoolInterface
    | EulerLinearPoolInterface
    | AaveLinearPoolInterface
    | YearnLinearPoolInterface => {
    switch (this.poolType) {
      case PoolType.Linear:
      case PoolType.ERC4626Linear:
        return ERC4626LinearPool__factory.createInterface();
      case PoolType.EulerLinear:
        return EulerLinearPool__factory.createInterface();
      case PoolType.AaveLinear:
        return AaveLinearPool__factory.createInterface();
      case PoolType.YearnLinear:
        return YearnLinearPool__factory.createInterface();
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  };

  buildInitJoin(): InitJoinPoolAttributes {
    // Linear Pools doesn't need to be initialized, they are initialized on deploy
    throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
  }

  /**
   *
   * @param name The name of the pool
   * @param symbol The symbol of the pool (BPT name)
   * @param mainToken The unwrapped token
   * @param wrappedToken The wrapped token
   * @param upperTarget The maximum balance of the unwrapped(main) token (normal number, no need to fix to 18 decimals)
   * @param swapFeeEvm The swap fee of the pool
   * @param owner The address of the owner of the pool
   * @param protocolId The protocolId, to check the available value
   */
  create({
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTarget,
    swapFeeEvm,
    owner,
    protocolId,
  }: LinearCreatePoolParameters): {
    to?: string;
    data: BytesLike;
  } {
    this.checkCreateInputs({ swapFeeEvm, protocolId });
    const params = this.parseCreateParamsForEncoding({
      name,
      symbol,
      mainToken,
      wrappedToken,
      upperTarget,
      swapFeeEvm,
      owner,
      protocolId,
    });
    const data = this.encodeCreateFunctionData(params);
    return {
      to: this.getFactoryAddress(this.poolType),
      data,
    };
  }

  checkCreateInputs = ({
    swapFeeEvm,
    protocolId,
  }: {
    swapFeeEvm: string;
    protocolId: ProtocolId;
  }): void => {
    if (!ProtocolId[protocolId]) {
      throw new BalancerError(BalancerErrorCode.INVALID_PROTOCOL_ID);
    }
    if (BigInt(swapFeeEvm) <= BigInt(0) || BigInt(swapFeeEvm) > BigInt(1e17)) {
      throw new BalancerError(BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE);
    }
    this.getFactoryAddress(this.poolType);
  };

  parseCreateParamsForEncoding = ({
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTarget,
    swapFeeEvm,
    owner,
    protocolId,
  }: Omit<LinearCreatePoolParameters, 'poolType'>):
    | LinearPoolParamsToEncode
    | YearnLinearPoolParamsToEncode => {
    let params: LinearPoolParamsToEncode | YearnLinearPoolParamsToEncode;
    if (this.poolType !== PoolType.YearnLinear) {
      params = [
        name,
        symbol,
        mainToken,
        wrappedToken,
        parseFixed(upperTarget, 18).toString(),
        swapFeeEvm.toString(),
        owner,
        protocolId.toString(),
      ] as [string, string, string, string, string, string, string, string];
      return params;
    }
    params = [
      name,
      symbol,
      mainToken,
      wrappedToken,
      parseFixed(upperTarget, 18).toString(),
      swapFeeEvm.toString(),
      owner,
    ] as [string, string, string, string, string, string, string];
    return params;
  };

  encodeCreateFunctionData = (
    params: LinearPoolParamsToEncode | YearnLinearPoolParamsToEncode
  ): string => {
    const linearPoolInterface: LinearPoolFactoryInterface =
      this.getPoolFactoryInterface();
    const encodedData =
      // YearnLinearPools doesn't have protocolId, the encoding of the params is different
      this.poolType === PoolType.YearnLinear
        ? (
            linearPoolInterface as YearnLinearPoolFactoryInterface
          ).encodeFunctionData(
            'create',
            params as YearnLinearPoolParamsToEncode
          )
        : (
            linearPoolInterface as LinearPoolFactoryInterfaceWithoutYearn
          ).encodeFunctionData('create', params as LinearPoolParamsToEncode);
    return encodedData;
  };

  getFactoryAddress = (poolType: PoolType): string => {
    switch (poolType) {
      case PoolType.AaveLinear:
        if (this.contracts.aaveLinearPoolFactory) {
          return this.contracts.aaveLinearPoolFactory.address;
        } else throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      case PoolType.Linear:
      case PoolType.ERC4626Linear:
        if (this.contracts.erc4626LinearPoolFactory) {
          return this.contracts.erc4626LinearPoolFactory.address;
        } else throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      case PoolType.EulerLinear:
        if (this.contracts.eulerLinearPoolFactory) {
          return this.contracts.eulerLinearPoolFactory.address;
        } else throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      case PoolType.YearnLinear:
        if (this.contracts.yearnLinearPoolFactory) {
          return this.contracts.yearnLinearPoolFactory.address;
        } else throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  };

  getPoolAddressAndIdWithReceipt = async (
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ): Promise<{ poolId: string; poolAddress: string }> => {
    const poolCreationEvent: LogDescription = findEventInReceiptLogs({
      receipt,
      to: this.getFactoryAddress(this.poolType) || '',
      contractInterface: this.getPoolFactoryInterface(),
      logName: 'PoolCreated',
    });

    const poolAddress = poolCreationEvent.args.pool;
    const linearPoolInterface = this.getPoolInterface();
    const pool = new Contract(poolAddress, linearPoolInterface, provider);
    const poolId = await pool.getPoolId();
    return {
      poolAddress,
      poolId,
    };
  };
}
