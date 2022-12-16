import {
  CreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
} from '@/modules/pools/factory/types';
import { AssetHelpers, scale } from '@/lib/utils';
import BigNumber from 'bignumber.js';
import { TransactionRequest } from '@ethersproject/providers';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import composableStableAbi from '../../../../lib/abi/ComposableStableFactory.json';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { Vault__factory } from '@balancer-labs/typechain';
import { balancerVault } from '@/lib/constants/config';

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

  /**
   * Build Init join pool transaction parameters (Can only be made once per pool)
   * @param {JoinPoolParameters} params - parameters used to build exact tokens in for bpt out transaction
   * @param {string}                          params.joiner - Account address joining pool
   * @param {SubgraphPoolBase}                params.pool - Subgraph pool object of pool being joined
   * @param {string[]}                        params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}                        params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
   * @param {string}                          wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for joining with ETH.
   * @returns                                 transaction request ready to send with signer.sendTransaction
   */
  buildInitJoin({
    joiner,
    poolId,
    poolAddress,
    tokensIn,
    amountsIn,
    wrappedNativeAsset,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // sort inputs
    tokensIn.push(poolAddress);
    amountsIn.push('0');

    console.log('tokensIn: ' + tokensIn);
    console.log('amountsIn: ' + amountsIn);

    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    let userDataAmounts = [];
    const bptIndex = sortedTokens
      .map((t) => t.toLowerCase())
      .indexOf(poolAddress.toLowerCase());
    if (bptIndex === -1) {
      userDataAmounts = sortedAmounts;
    } else {
      userDataAmounts = [
        ...sortedAmounts.slice(0, bptIndex),
        ...sortedAmounts.slice(bptIndex + 1),
      ];
    }

    console.log('userDataAmounts: ' + userDataAmounts);
    console.log('sortedAmounts: ' + sortedAmounts);
    console.log('sortedTokens: ' + sortedTokens);

    const userData = ComposableStablePoolEncoder.joinInit(userDataAmounts);
    const functionName = 'joinPool';

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

    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);

    return {
      to: balancerVault,
      functionName,
      attributes,
      data,
    };
  }
}
