import { WeightedCreatePoolParameters } from '@/modules/pools/factory/types';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { TransactionRequest } from '@ethersproject/providers';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { networkAddresses } from '@/lib/constants/config';
import { BalancerNetworkConfig } from '@/types';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { BigNumberish } from '@ethersproject/bignumber';

export class WeightedFactory implements PoolFactory {
  private wrappedNativeAsset: string;

  constructor(networkConfig: BalancerNetworkConfig) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  /***
   * @param params
   *  * Builds a transaction for a weighted pool create operation.
   *  * @param factoryAddress - The address of the factory for weighted pool (contract address)
   *  * @param name - The name of the pool
   *  * @param symbol - The symbol of the pool
   *  * @param tokenAddresses - The token's addresses
   *  * @param weights The weights for each token, ordered
   *  * @param swapFee - The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
   *  * @param owner - The address of the owner of the pool
   *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
   */
  create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    weights,
    swapFee,
    owner,
  }: WeightedCreatePoolParameters): TransactionRequest {
    const swapFeeScaled = parseToBigInt18(`${swapFee}`);
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedWeights] = assetHelpers.sortTokens(
      tokenAddresses,
      weights
    ) as [string[], BigNumberish[]];
    const params = [
      name,
      symbol,
      sortedTokens,
      sortedWeights,
      swapFeeScaled.toString(),
      owner,
    ];
    const weightedPoolInterface = new Interface(
      WeightedPoolFactory__factory.abi
    );
    const createFunctionAbi = WeightedPoolFactory__factory.abi.find(
      ({ name }) => name === 'create'
    );
    if (!createFunctionAbi)
      throw new BalancerError(BalancerErrorCode.INTERNAL_ERROR_INVALID_ABI);
    const createFunctionFragment = FunctionFragment.from(createFunctionAbi);
    const encodedFunctionData = weightedPoolInterface.encodeFunctionData(
      createFunctionFragment,
      params
    );
    return {
      to: factoryAddress,
      data: encodedFunctionData,
    };
  }
}
