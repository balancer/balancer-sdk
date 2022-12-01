import { PoolDataService } from '@balancer-labs/sor';
import { defaultAbiCoder } from '@ethersproject/abi';
import TenderlyHelper from '@/lib/utils/tenderlyHelper';
import { BalancerNetworkConfig } from '@/types';
import {
  VaultModel,
  Requests,
  ActionType,
} from '../vaultModel/vaultModel.module';
import { getPoolAddress } from '@/pool-utils';
import { Zero } from '@ethersproject/constants';

export enum SimulationType {
  Tenderly,
  VaultModel,
  Static,
}

export class Simulation {
  private tenderlyHelper: TenderlyHelper;
  private vaultModel: VaultModel | undefined;
  constructor(
    networkConfig: BalancerNetworkConfig,
    poolDataService?: PoolDataService
  ) {
    this.tenderlyHelper = new TenderlyHelper(
      networkConfig.chainId,
      networkConfig.tenderly
    );
    if (!poolDataService) {
      this.vaultModel = undefined;
    } else {
      this.vaultModel = new VaultModel(
        poolDataService,
        networkConfig.addresses.tokens.wrappedNativeAsset
      );
    }
  }

  simulateGeneralisedJoin = async (
    to: string,
    multiRequests: Requests[][],
    encodedCall: string,
    outputIndexes: number[],
    userAddress: string,
    tokensIn: string[],
    simulationType: SimulationType
  ): Promise<{ amountsOut: string[]; totalAmountOut: string }> => {
    const amountsOut: string[] = [];
    let totalAmountOut = Zero;

    switch (simulationType) {
      case SimulationType.Tenderly: {
        const simulationResult = await this.tenderlyHelper.simulateMulticall(
          to,
          encodedCall,
          userAddress,
          tokensIn
        );

        const multicallResult = defaultAbiCoder.decode(
          ['bytes[]'],
          simulationResult
        )[0] as string[];

        // Decode each root output
        outputIndexes.forEach((outputIndex) => {
          const value = defaultAbiCoder.decode(
            ['uint256'],
            multicallResult[outputIndex]
          );
          amountsOut.push(value.toString());
          totalAmountOut = totalAmountOut.add(value.toString());
        });
        return { amountsOut, totalAmountOut: totalAmountOut.toString() };
      }

      case SimulationType.VaultModel: {
        if (this.vaultModel === undefined)
          throw new Error('Missing Vault Model Config.');
        // make one mutlicall for each joinPath
        // take only BPT delta into account
        for (const [i, requests] of multiRequests.entries()) {
          const lastRequest = requests[requests.length - 1];
          let poolId = '';
          switch (lastRequest.actionType) {
            case ActionType.Join:
            case ActionType.Exit:
              poolId = lastRequest.poolId;
              break;
            case ActionType.BatchSwap:
              poolId = lastRequest.swaps[0].poolId;
          }
          const rootPoolAddress = getPoolAddress(poolId); // BPT address of the pool being joined/exited
          const deltas = await this.vaultModel.multicall(requests, i === 0);
          const bptOutDelta = deltas[rootPoolAddress].mul(-1); // delta is negative for BPT out on joins
          if (!bptOutDelta) throw new Error('No delta found for BPT out.');
          amountsOut.push(bptOutDelta.toString());
          totalAmountOut = totalAmountOut.add(bptOutDelta);
        }
        return { amountsOut, totalAmountOut: totalAmountOut.toString() };
      }
      default:
        throw new Error('Simulation type not supported');
    }
  };
}
