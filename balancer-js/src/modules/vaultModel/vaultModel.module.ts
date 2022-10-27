import type { BalancerDataRepositories } from '@/types';
import {
  SubgraphPoolBase,
  parseToPoolsDict,
  PoolDictionary,
  SubgraphToken,
  bnum,
  SwapTypes,
  PoolBase,
  PoolPairBase,
  PoolDataService,
} from '@balancer-labs/sor';
import { OnChainPoolsRepository } from '../sor/pool-data/subgraphPoolDataService';
import {
  EncodeBatchSwapInput,
  // EncodeWrapAaveDynamicTokenInput,
  // EncodeUnwrapAaveStaticTokenInput,
  EncodeExitPoolInput,
} from '@/modules/relayer/types';
import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
interface Info {
  actionType: ActionType;
  poolId: string;
  tokenIn: string;
  tokenOut: string;
  amount: string;
}
export enum ActionType {
  BatchSwap,
  Join,
  Exit,
}
type BatchSwap = EncodeBatchSwapInput & Info;
type ExitPool = EncodeExitPoolInput & Info;
// export type JoinPool = { Info };
export interface JoinPool {
  actionType: ActionType.Join;
  poolId: string;
  tokensIn: string[];
  amountsIn: string[];
}
type Inputs = BatchSwap | JoinPool | ExitPool;

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class VaultModel {
  poolsArray: SubgraphPoolBase[] = [];
  poolsDict: PoolDictionary = {};
  constructor(private poolDataService: PoolDataService) {}

  dataSource(): PoolDataService {
    return this.poolDataService;
  }

  async all(refresh = false): Promise<SubgraphPoolBase[]> {
    if (refresh || this.poolsArray.length === 0) {
      const list = await this.dataSource().getPools();
      for (const pool of list) {
        if (pool.poolType === 'Weighted' || pool.poolType === 'Investment') {
          const BptAsToken: SubgraphToken = {
            address: pool.address,
            balance: pool.totalShares,
            decimals: 18,
            priceRate: '1',
            weight: '0',
          };
          pool.tokens.push(BptAsToken);
          pool.tokensList.push(pool.address);
        }
      }
      this.poolsArray = list;
    }
    return this.poolsArray;
  }

  async poolsDictionary(refresh = false): Promise<PoolDictionary> {
    if (refresh || Object.keys(this.poolsDict).length === 0) {
      const poolsArray = await this.all(refresh);
      this.poolsDict = parseToPoolsDict(poolsArray, 0);
    }
    return this.poolsDict;
  }

  async multicall(rawCalls: Inputs[]): Promise<string[]> {
    for (const call of rawCalls) {
      if (call.actionType === ActionType.Join) {
        console.log('JoinPool');
      } else if ('exitPoolRequest' in call) {
        console.log(call.exitPoolRequest);
      } else {
        console.log('BatchSwap');
      }
    }
    return [];
  }

  async handleJoinPool(joinPoolRequest: JoinPool): Promise<string> {
    const pools = await this.poolsDictionary();
    const pool = pools[joinPoolRequest.poolId];
    let totalOut = BigNumber.from('0');
    // For each input token do a swap > BPT
    // TODO This is a workaround until there is time to implement correct joinPool maths
    joinPoolRequest.tokensIn.forEach((token, i) => {
      const pairData = pool.parsePoolPairData(token, pool.address);
      // Assume its always a EXACT_TOKENS_IN_FOR_BPT_OUT
      const amountInEvm = BigNumber.from(joinPoolRequest.amountsIn[i]);
      const amountInHuman: string = formatFixed(
        amountInEvm,
        pairData.decimalsIn
      );
      const amountOutHuman = pool._exactTokenInForTokenOut(
        pairData,
        bnum(amountInHuman)
      );
      const amountOutEvm = parseFixed(
        amountOutHuman.toString(),
        pairData.decimalsOut
      );

      // Update balances of tokenIn and tokenOut - use EVM scale
      pool.updateTokenBalanceForPool(
        pairData.tokenIn,
        pairData.balanceIn.add(amountInEvm)
      );
      // For a join we have to add the extra BPT to the balance as this is equivalent to bptTotalSupply
      pool.updateTokenBalanceForPool(
        pairData.tokenOut,
        pairData.balanceOut.add(amountOutEvm)
      );
      totalOut = totalOut.add(amountOutEvm);
    });
    return totalOut.toString();
  }
}
