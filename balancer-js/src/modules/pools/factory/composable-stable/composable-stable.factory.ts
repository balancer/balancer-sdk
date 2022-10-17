import { CreatePoolParameters } from '@/modules/pools/factory/types';
import { scale } from '@/lib/utils';
import BigNumber from 'bignumber.js';
import { TransactionRequest } from '@ethersproject/providers';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import composableStableAbi from '../../../../lib/abi/ComposableStableFactory.json';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class ComposableStableFactory implements PoolFactory {
  /***
   * @param
   *  * Returns an array of calculated weights for every token in the PoolSeedToken array "tokens"
   *  * @param contractAddress - The address of the factory for weighted pool (contract address)
   *  * @param name - The name of the pool
   *  * @param symbol - The symbol of the pool
   *  * @param swapFee - The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
   *  * @param tokenAddresses - The tokens of the pool (each token must be an object that contains "tokenAddress" and "weight" params)
   *  * @param rateProviders The addresses of the rate providers for each token
   *  * @param tokenRateCacheDurations the Token Rate Cache Duration of each token
   *  * @param owner - The address of the owner of the pool
   *  * @param amplificationParameter The amplification parameter(must be greater than 1)
   *  * @param exemptFromYieldProtocolFeeFlags array containing boolean for each token exemption from yield protocol fee flags
   *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
   */
  create({
    contractAddress,
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
  }: CreatePoolParameters): TransactionRequest {
    const swapFeeScaled = scale(new BigNumber(swapFee), 18);

    const params = [
      name,
      symbol,
      tokenAddresses,
      amplificationParameter,
      rateProviders,
      tokenRateCacheDurations,
      exemptFromYieldProtocolFeeFlags,
      swapFeeScaled.toString(),
      owner,
    ];

    const composablePoolInterface = new Interface(composableStableAbi);
    const createFunctionAbi = composableStableAbi.find(
      ({ name }) => name === 'create'
    );
    if (!createFunctionAbi)
      throw new BalancerError(BalancerErrorCode.INTERNAL_ERROR_INVALID_ABI);
    const createFunctionFragment = FunctionFragment.from(createFunctionAbi);
    const encodedFunctionData = composablePoolInterface.encodeFunctionData(
      createFunctionFragment,
      params
    );
    return {
      to: contractAddress,
      data: encodedFunctionData,
    };
  }
}
