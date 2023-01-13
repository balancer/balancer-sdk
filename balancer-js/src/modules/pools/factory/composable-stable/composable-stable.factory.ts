import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
} from '@/modules/pools/factory/types';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { TransactionRequest } from '@ethersproject/providers';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import composableStableAbi from '../../../../lib/abi/ComposableStableFactory.json';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { networkAddresses } from '@/lib/constants/config';
import { BalancerNetworkConfig } from '@/types';

export class ComposableStableFactory implements PoolFactory {
  private wrappedNativeAsset: string;

  constructor(networkConfig: BalancerNetworkConfig) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  /***
   * @param params
   *  * Builds a transaction for a composable pool create operation.
   *  * @param contractAddress - The address of the factory for composable stable pool (contract address)
   *  * @param name - The name of the pool
   *  * @param symbol - The symbol of the pool
   *  * @param swapFee - The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
   *  * @param tokenAddresses - The token's addresses
   *  * @param rateProviders The addresses of the rate providers for each token, ordered
   *  * @param tokenRateCacheDurations the Token Rate Cache Duration of each token
   *  * @param owner - The address of the owner of the pool
   *  * @param amplificationParameter The amplification parameter(must be greater than 1)
   *  * @param exemptFromYieldProtocolFeeFlags array containing boolean for each token exemption from yield protocol fee flags
   *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
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
      to: factoryAddress,
      data: encodedFunctionData,
    };
  }

  /***
   * @param params
   *  * Returns an array of calculated weights for every token in the PoolSeedToken array "tokens"
   *  * @param joiner - The address of the joiner of the pool
   *  * @param poolId - The id of the pool
   *  * @param poolAddress - The address of the pool
   *  * @param tokensIn - array with the address of the tokens
   *  * @param amountsIn - array with the amount of each token
   *  * @param wrappedNativeAsset
   *  * @returns a InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a composable stable pool
   */
  buildInitJoin({
    joiner,
    poolId,
    poolAddress,
    tokensIn,
    amountsIn,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    console.log(joiner, poolId, poolAddress, tokensIn, amountsIn);
    throw new Error('To be implemented');
    // const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    // // sort inputs
    // tokensIn.push(poolAddress);
    // amountsIn.push('0');
    //
    // const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
    //   tokensIn,
    //   amountsIn
    // ) as [string[], string[]];
    //
    // let userDataAmounts;
    // const bptIndex = sortedTokens
    //   .map((t) => t.toLowerCase())
    //   .indexOf(poolAddress.toLowerCase());
    // if (bptIndex === -1) {
    //   userDataAmounts = sortedAmounts;
    // } else {
    //   userDataAmounts = [
    //     ...sortedAmounts.slice(0, bptIndex),
    //     ...sortedAmounts.slice(bptIndex + 1),
    //   ];
    // }
    //
    // const userData = ComposableStablePoolEncoder.joinInit(userDataAmounts);
    // const functionName = 'joinPool';
    //
    // const attributes = {
    //   poolId: poolId,
    //   sender: joiner,
    //   recipient: joiner,
    //   joinPoolRequest: {
    //     assets: sortedTokens,
    //     maxAmountsIn: sortedAmounts,
    //     userData,
    //     fromInternalBalance: false,
    //   },
    // };
    //
    // const vaultInterface = Vault__factory.createInterface();
    // const data = vaultInterface.encodeFunctionData(functionName, [
    //   attributes.poolId,
    //   attributes.sender,
    //   attributes.recipient,
    //   attributes.joinPoolRequest,
    // ]);
    //
    // return {
    //   to: balancerVault,
    //   functionName,
    //   attributes,
    //   data,
    // };
  }
}
