import { parseFixed } from '@ethersproject/bignumber';
import { TransactionRequest } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { ERC4626LinearPoolFactory__factory } from '@/contracts';
import { networkAddresses } from '@/lib/constants/config';
import { parseToBigInt18 } from '@/lib/utils';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import {
  InitJoinPoolAttributes,
  LinearCreatePoolParameters,
  ProtocolId,
} from '@/modules/pools/factory/types';
import { BalancerNetworkConfig } from '@/types';

export class LinearFactory implements PoolFactory {
  private wrappedNativeAsset: string;

  constructor(networkConfig: BalancerNetworkConfig) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  buildInitJoin(): InitJoinPoolAttributes {
    // Linear Pools doesn't need to be initialized, they are initialized on deploy
    throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
  }

  /**
   *
   * @param factoryAddress The address of the factory, can be ERC4626, Aave or Euler
   * @param name The name of the pool
   * @param symbol The symbol of the pool (BPT name)
   * @param mainToken The unwrapped token
   * @param wrappedToken The wrapped token
   * @param upperTarget The maximum balance of the unwrapped(main) token (normal number, no need to fix to 18 decimals)
   * @param swapFee The swap fee of the pool
   * @param owner The address of the owner of the pool
   * @param protocolId The protocolId, to check the available value
   */
  create({
    factoryAddress,
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTarget,
    swapFee,
    owner,
    protocolId,
  }: LinearCreatePoolParameters): TransactionRequest {
    this.checkCreateInputs({ swapFee, protocolId });
    const params = this.parseCreateParamsForEncoding({
      name,
      symbol,
      mainToken,
      wrappedToken,
      upperTarget,
      swapFee,
      owner,
      protocolId,
    });
    const data = this.encodeCreateFunctionData(params);
    return {
      to: factoryAddress,
      data,
    };
  }

  checkCreateInputs = ({
    swapFee,
    protocolId,
  }: {
    swapFee: string | number;
    protocolId: ProtocolId;
  }): void => {
    if (!ProtocolId[protocolId]) {
      throw new BalancerError(BalancerErrorCode.INVALID_PROTOCOL_ID);
    }
    if (parseFixed(swapFee.toString(), 18).toBigInt() === BigInt(0)) {
      throw new BalancerError(BalancerErrorCode.MIN_SWAP_FEE_PERCENTAGE);
    }
  };

  parseCreateParamsForEncoding = ({
    name,
    symbol,
    mainToken,
    wrappedToken,
    upperTarget,
    swapFee,
    owner,
    protocolId,
  }: Omit<LinearCreatePoolParameters, 'factoryAddress'>): [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string
  ] => {
    const swapFeeScaled = parseToBigInt18(`${swapFee}`);
    const params = [
      name,
      symbol,
      mainToken,
      wrappedToken,
      parseFixed(upperTarget, 18).toString(),
      swapFeeScaled.toString(),
      owner,
      protocolId.toString(),
    ] as [string, string, string, string, string, string, string, string];
    return params;
  };

  encodeCreateFunctionData = (
    params: [string, string, string, string, string, string, string, string]
  ): string => {
    const linearPoolInterface =
      ERC4626LinearPoolFactory__factory.createInterface();
    const encodedFunctionData = linearPoolInterface.encodeFunctionData(
      'create',
      params
    );
    return encodedFunctionData;
  };
}
