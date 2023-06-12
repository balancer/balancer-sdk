import { LogDescription } from '@ethersproject/abi';
import { BytesLike } from '@ethersproject/bytes';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  AaveLinearPool__factory,
  AaveLinearPoolFactory__factory,
  ERC4626LinearPool__factory,
  ERC4626LinearPoolFactory__factory,
  EulerLinearPool__factory,
  EulerLinearPoolFactory__factory,
  GearboxLinearPool__factory,
  GearboxLinearPoolFactory__factory,
  YearnLinearPool__factory,
  YearnLinearPoolFactory__factory,
} from '@/contracts';
import { AaveLinearPoolInterface } from '@/contracts/AaveLinearPool';
import { ERC4626LinearPoolInterface } from '@/contracts/ERC4626LinearPool';
import { EulerLinearPoolInterface } from '@/contracts/EulerLinearPool';
import { EulerLinearPoolFactoryInterface } from '@/contracts/EulerLinearPoolFactory';
import { GearboxLinearPoolInterface } from '@/contracts/GearboxLinearPool';
import { YearnLinearPoolInterface } from '@/contracts/YearnLinearPool';
import { ContractInstances } from '@/modules/contracts/contracts.module';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import {
  InitJoinPoolAttributes,
  LinearCreatePoolParameters,
  LinearPoolFactoryInterface,
  ProtocolId,
} from '@/modules/pools/factory/types';
import { PoolType } from '@/types';
import { findEventInReceiptLogs, getRandomBytes32 } from '@/lib/utils';

type LinearPoolParamsToEncode = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  BytesLike
];

type EulerLinearPoolParamsToEncode = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

export class LinearFactory implements PoolFactory {
  private contracts: ContractInstances;
  private readonly poolType: PoolType;

  constructor(contracts: ContractInstances, poolType: PoolType) {
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
      case PoolType.GearboxLinear:
        return GearboxLinearPoolFactory__factory.createInterface();
      case PoolType.YearnLinear:
        return YearnLinearPoolFactory__factory.createInterface();
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  };

  getPoolInterface = ():
    | AaveLinearPoolInterface
    | ERC4626LinearPoolInterface
    | EulerLinearPoolInterface
    | GearboxLinearPoolInterface
    | YearnLinearPoolInterface => {
    switch (this.poolType) {
      case PoolType.AaveLinear:
        return AaveLinearPool__factory.createInterface();
      case PoolType.Linear:
      case PoolType.ERC4626Linear:
        return ERC4626LinearPool__factory.createInterface();
      case PoolType.EulerLinear:
        return EulerLinearPool__factory.createInterface();
      case PoolType.GearboxLinear:
        return GearboxLinearPool__factory.createInterface();
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
   * @param mainToken The main token
   * @param wrappedToken The wrapped token
   * @param upperTargetEvm The maximum balance of the main token
   * @param swapFeeEvm The swap fee of the pool
   * @param owner The address of the owner of the pool
   * @param protocolId The protocolId, to check the available value
   */
  create({
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTargetEvm,
    swapFeeEvm,
    owner,
    protocolId,
    salt,
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
      upperTargetEvm,
      swapFeeEvm,
      owner,
      protocolId,
      salt,
    });
    const data = this.encodeCreateFunctionData(params);
    return {
      to: this.getFactoryAddress(),
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
    this.getFactoryAddress();
  };

  parseCreateParamsForEncoding = ({
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTargetEvm,
    swapFeeEvm,
    owner,
    protocolId,
    salt,
  }: Omit<LinearCreatePoolParameters, 'poolType'>):
    | LinearPoolParamsToEncode
    | EulerLinearPoolParamsToEncode => {
    if (this.poolType === PoolType.EulerLinear) {
      return [
        name,
        symbol,
        mainToken,
        wrappedToken,
        upperTargetEvm,
        swapFeeEvm,
        owner,
        protocolId.toString(),
      ] as [string, string, string, string, string, string, string, string];
    }
    return [
      name,
      symbol,
      mainToken,
      wrappedToken,
      upperTargetEvm,
      swapFeeEvm,
      owner,
      protocolId.toString(),
      salt || getRandomBytes32(),
    ] as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      BytesLike
    ];
  };

  encodeCreateFunctionData = (
    params: LinearPoolParamsToEncode | EulerLinearPoolParamsToEncode
  ): string => {
    const linearPoolInterface: LinearPoolFactoryInterface =
      this.getPoolFactoryInterface();
    const encodedData =
      // YearnLinearPools doesn't have protocolId, the encoding of the params is different
      this.poolType === PoolType.EulerLinear
        ? (
            linearPoolInterface as EulerLinearPoolFactoryInterface
          ).encodeFunctionData(
            'create',
            params as EulerLinearPoolParamsToEncode
          )
        : (
            linearPoolInterface as Exclude<
              LinearPoolFactoryInterface,
              EulerLinearPoolFactoryInterface
            >
          ).encodeFunctionData('create', params as LinearPoolParamsToEncode);
    return encodedData;
  };

  getFactoryAddress = (): string => {
    switch (this.poolType) {
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
      case PoolType.GearboxLinear:
        if (this.contracts.gearboxLinearPoolFactory) {
          return this.contracts.gearboxLinearPoolFactory.address;
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
      to: this.getFactoryAddress() || '',
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
