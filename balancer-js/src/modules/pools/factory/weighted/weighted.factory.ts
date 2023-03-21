import { LogDescription } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { BytesLike } from '@ethersproject/bytes';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { WeightedPoolFactory__factory } from '@/contracts/factories/WeightedPoolFactory__factory';
import { balancerVault, networkAddresses } from '@/lib/constants/config';
import { AssetHelpers, findEventInReceiptLogs } from '@/lib/utils';
import { ContractInstances } from '@/modules/contracts/contracts.module';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';
import {
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { BalancerNetworkConfig } from '@/types';
import { WeightedPool__factory } from '@/contracts';

export class WeightedFactory implements PoolFactory {
  private wrappedNativeAsset: string;
  private contracts: ContractInstances;

  constructor(
    networkConfig: BalancerNetworkConfig,
    contracts: ContractInstances
  ) {
    const { tokens } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.contracts = contracts;
  }

  /**
   * Builds a transaction for a weighted pool create operation.
   * @param factoryAddress - The address of the factory for weighted pool (contract address)
   * @param name - The name of the pool
   * @param symbol - The symbol of the pool
   * @param tokenAddresses - The token's addresses
   * @param weights The weights for each token, ordered
   * @param swapFeeEvm - The swapFee for the owner of the pool in string or bigint formatted to evm(100% is 1e18, 10% is 1e17, 1% is 1e16)
   * @param owner - The address of the owner of the pool
   * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a weighted pool
   */
  create({
    name,
    symbol,
    tokenAddresses,
    weights,
    swapFeeEvm,
    owner,
  }: WeightedCreatePoolParameters): {
    to?: string;
    data: BytesLike;
  } {
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedWeights] = assetHelpers.sortTokens(
      tokenAddresses,
      weights
    ) as [string[], BigNumberish[]];
    const weightedPoolInterface =
      WeightedPoolFactory__factory.createInterface();
    const encodedFunctionData = weightedPoolInterface.encodeFunctionData(
      'create',
      [name, symbol, sortedTokens, sortedWeights, swapFeeEvm.toString(), owner]
    );
    return {
      to: this.contracts.weightedPoolFactory?.address,
      data: encodedFunctionData,
    };
  }

  /**
   * Returns a InitJoinPoolAttributes to make a init join transaction
   * @param joiner - The address of the joiner of the pool
   * @param poolId - The id of the pool
   * @param tokensIn - array with the address of the tokens
   * @param amountsIn - array with the amount of each token
   * @returns a InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a weighted pool
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

  async getPoolAddressAndIdWithReceipt(
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ): Promise<{ poolId: string; poolAddress: string }> {
    const poolCreationEvent: LogDescription = findEventInReceiptLogs({
      receipt,
      to: this.contracts.weightedPoolFactory?.address || '',
      contractInterface: WeightedPoolFactory__factory.createInterface(),
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
  }
}
