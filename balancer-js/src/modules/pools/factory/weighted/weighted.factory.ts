import {
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { AssetHelpers, parseToBigInt18 } from '@/lib/utils';
import { TransactionRequest } from '@ethersproject/providers';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { balancerVault, networkAddresses } from '@/lib/constants/config';
import { BalancerNetworkConfig } from '@/types';
import {
  Vault__factory,
  WeightedPoolFactory__factory,
} from '@balancer-labs/typechain';
import { BigNumberish } from '@ethersproject/bignumber';
import { WeightedPoolEncoder } from '@/pool-weighted';

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
   *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a weighted pool
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

  /***
   * @param params
   *  * Returns a InitJoinPoolAttributes to make a init join transaction
   *  * @param joiner - The address of the joiner of the pool
   *  * @param poolId - The id of the pool
   *  * @param tokensIn - array with the address of the tokens
   *  * @param amountsIn - array with the amount of each token
   *  * @returns a InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a weighted pool
   */
  buildInitJoin({
    joiner,
    poolId,
    tokensIn,
    amountsIn,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);

    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    const userData = WeightedPoolEncoder.joinInit(sortedAmounts);
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
