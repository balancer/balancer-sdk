import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import { TransactionRequest } from '@ethersproject/providers';
import {
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  LinearCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { parseToBigInt18 } from '@/lib/utils';
import { BalancerNetworkConfig } from '@/types';
import { networkAddresses } from '@/lib/constants/config';
import { ERC4626LinearPoolFactory__factory } from '@/contracts';

export class LinearFactory implements PoolFactory {
  private wrappedNativeAsset: string;

  constructor(networkConfig: BalancerNetworkConfig) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  buildInitJoin(parameters: InitJoinPoolParameters): InitJoinPoolAttributes {
    console.log(parameters);
    throw new Error('To be implemented');
  }

  /**
   *
   * @param factoryAddress The address of the factory, can be ERC4626, Aave or Euler
   * @param name The name of the pool
   * @param symbol The symbol of the pool (BPT name)
   * @param mainToken The unwrapped token
   * @param wrappedToken The wrapped token
   * @param upperTarget The maximum balance of the unwrapped(main) token
   * @param swapFee The swap fee of the pool
   * @param owner the address of the owner of the pool
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
    const swapFeeScaled = parseToBigInt18(`${swapFee}`);
    const params = [
      name,
      symbol,
      mainToken,
      wrappedToken,
      upperTarget,
      swapFeeScaled.toString(),
      owner,
      protocolId.toString(),
    ] as [string, string, string, string, string, string, string, string];
    const linearPoolInterface =
      ERC4626LinearPoolFactory__factory.createInterface();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const encodedFunctionData = linearPoolInterface.encodeFunctionData(
      'create',
      params
    );
    return {
      to: factoryAddress,
      data: encodedFunctionData,
    };
  }
}
