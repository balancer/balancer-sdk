import { BigNumberish, parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  AaveLinearPoolFactory__factory,
  ERC4626LinearPoolFactory__factory,
  EulerLinearPoolFactory__factory,
  WeightedPool__factory,
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
   * @param poolType The Linear Subtype, used to define the pool factory address(Aave, Erc4626, Euler, Yearn, etc)
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
  }: Omit<LinearCreatePoolParameters, 'poolType'>): [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string
  ] => {
    const params = [
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
  };

  encodeCreateFunctionData = (
    params: [string, string, string, string, string, string, string, string]
  ): string => {
    const linearPoolInterface: LinearPoolFactoryInterface =
      LinearFactory.getPoolInterface(this.poolType);
    // TODO: Find an alternative solution to this TS Bug
    // TS Bug report: https://github.com/microsoft/TypeScript/issues/14107
    // TS2769: No overload matches this call. The last overload gave the following error.
    // Argument of type '"create"' is not assignable to parameter of type '"isPoolFromFactory"'.
    console.log(params);
    const encodedData = (
      linearPoolInterface as AaveLinearPoolFactoryInterface
    ).encodeFunctionData('create', params);
    console.log(encodedData);
    return encodedData;
  };

  getFactoryAddress = (poolType: PoolType): string => {
    switch (poolType) {
      case PoolType.AaveLinear:
        if (this.contracts.aaveLinearPoolFactory) {
          return this.contracts.aaveLinearPoolFactory.address;
        } else throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
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
  static getPoolInterface = (
    poolType: PoolType
  ): LinearPoolFactoryInterface => {
    switch (poolType) {
      case PoolType.AaveLinear:
        return AaveLinearPoolFactory__factory.createInterface();
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

  getPoolAddressAndIdWithReceipt = async (
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ): Promise<{ poolId: string; poolAddress: string }> => {
    const poolCreationEvent: LogDescription = findEventInReceiptLogs({
      receipt,
      to: this.getFactoryAddress(this.poolType) || '',
      contractInterface: LinearFactory.getPoolInterface(this.poolType),
      logName: 'PoolCreated',
    });

    const poolAddress = poolCreationEvent.args.pool;
    const weightedPoolInterface = WeightedPool__factory.createInterface();
    const pool = new Contract(poolAddress, weightedPoolInterface, provider);
    const poolId = await pool.getPoolId();
    return {
      poolAddress,
      poolId,
    };
  };
}

type LinearPoolFactoryInterface =
  | AaveLinearPoolFactoryInterface
  | ERC4626LinearPoolFactoryInterface
  | EulerLinearPoolFactoryInterface
  | YearnLinearPoolFactoryInterface;
