import {
  SubgraphPoolBase,
  parseToPoolsDict,
  PoolDictionary,
  SubgraphToken,
  bnum,
  PoolDataService,
  PoolBase,
} from '@balancer-labs/sor';
import { EncodeBatchSwapInput } from '@/modules/relayer/types';
import { parseFixed, BigNumber, formatFixed } from '@ethersproject/bignumber';
import { ComposableStablePoolExitKind } from '@/pool-composable-stable';
import { defaultAbiCoder } from '@ethersproject/abi';
import { WeightedPoolDecoder } from '@/pool-weighted/decoder';
import { SwapType } from '../swaps/types';
import { Zero } from '@ethersproject/constants';

enum PoolExitKind {
  EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
  EXACT_BPT_IN_FOR_TOKENS_OUT,
  BPT_IN_FOR_EXACT_TOKENS_OUT,
}

export enum ActionType {
  BatchSwap,
  Join,
  Exit,
}

export interface BatchSwap
  extends Pick<
    EncodeBatchSwapInput,
    'swaps' | 'assets' | 'funds' | 'swapType'
  > {
  actionType: ActionType.BatchSwap;
}

export interface ExitPool {
  actionType: ActionType.Exit;
  poolId: string;
  poolType: string;
  userData: string;
}
export interface JoinPool {
  actionType: ActionType.Join;
  poolId: string;
  tokensIn: string[];
  amountsIn: string[];
}
type Inputs = BatchSwap | JoinPool | ExitPool;

function getPoolBalances(pool: PoolBase, tokens: string[]): string[] {
  const balances: string[] = [];
  tokens.forEach((t) => {
    const tokenIndex = pool.tokens.findIndex(
      (pt) => pt.address.toLowerCase() === t.toLowerCase()
    );
    if (tokenIndex < 0) throw 'Pool does not contain tokenIn';
    balances.push(
      parseFixed(
        pool.tokens[tokenIndex].balance,
        pool.tokens[tokenIndex].decimals
      ).toString()
    );
  });
  return balances;
}

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
      } else if (call.actionType === ActionType.Exit) {
        console.log('ExitPool');
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

  exitKind(poolType: string, data: string): PoolExitKind {
    const decoded = defaultAbiCoder.decode(['uint256'], data);
    const type = decoded[0] as BigNumber;
    if (!type) throw new Error('No exit kind.');
    if (poolType === 'ComposableStable') {
      if (
        type.toNumber() ===
        ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT
      )
        return PoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT;
      else {
        return PoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT;
      }
    } else {
      return type.toNumber() as PoolExitKind;
    }
  }

  decodeExitData(data: string, exitKind: PoolExitKind): string[] {
    if (exitKind === PoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT) {
      const [, amountsOut, maxBPTAmountIn] =
        WeightedPoolDecoder.exitBPTInForExactTokensOut(data);
      return [amountsOut.toString(), maxBPTAmountIn.toString()];
    } else if (exitKind === PoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT) {
      const [, bptIn, tokenIndex] =
        WeightedPoolDecoder.exitExactBPTInForOneTokenOut(data);
      return [bptIn.toString(), tokenIndex.toString()];
    } else if (exitKind === PoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT) {
      const [, bptIn] = WeightedPoolDecoder.exitExactBPTInForTokensOut(data);
      return [bptIn.toString()];
    } else throw new Error('Non supported exit data');
  }

  exactBptInForTokensOut(encodedData: string, pool: PoolBase): string[] {
    const [bptIn] = this.decodeExitData(
      encodedData,
      PoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT
    );
    const tokensOut = pool
      ._calcTokensOutGivenExactBptIn(BigNumber.from(bptIn))
      .map((a) => a.toString());

    // Updates BPT/totalShares value for pool
    pool.updateTokenBalanceForPool(pool.address, pool.totalShares.sub(bptIn));
    // Update each tokens balance
    tokensOut.forEach((t, i) => {
      const balanceEvm = parseFixed(
        pool.tokens[i].balance.toString(),
        pool.tokens[i].decimals
      );
      pool.updateTokenBalanceForPool(pool.tokensList[i], balanceEvm.sub(t));
    });
    return tokensOut;
  }

  exactBptInForOneTokenOut(encodedData: string, pool: PoolBase): string[] {
    const [bptIn, tokenIndex] = this.decodeExitData(
      encodedData,
      PoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    );
    const pairData = pool.parsePoolPairData(
      pool.address,
      pool.tokensList[Number(tokenIndex)]
    );
    const amountInHuman: string = formatFixed(bptIn, pairData.decimalsIn);
    const amountOutHuman = pool
      ._exactTokenInForTokenOut(pairData, bnum(amountInHuman))
      .dp(pairData.decimalsOut);
    const amountOutEvm = parseFixed(
      amountOutHuman.toString(),
      pairData.decimalsOut
    );

    const balances = getPoolBalances(pool, [pool.address, pairData.tokenOut]);
    // Update balances of tokenIn and tokenOut - use EVM scale
    pool.updateTokenBalanceForPool(
      pool.address,
      BigNumber.from(balances[0]).add(bptIn)
    );

    const x = BigNumber.from(balances[1]).sub(amountOutEvm);
    // For a join we have to add the extra BPT to the balance as this is equivalent to bptTotalSupply
    pool.updateTokenBalanceForPool(pairData.tokenOut, x);
    const result = new Array(pool.tokensList.length).fill('0');
    result[Number(tokenIndex)] = amountOutEvm.toString();
    return result;
  }

  async handleExitPool(exitPoolRequest: ExitPool): Promise<string[]> {
    const pools = await this.poolsDictionary();
    const pool = pools[exitPoolRequest.poolId];
    const exitKind = this.exitKind(
      exitPoolRequest.poolType,
      exitPoolRequest.userData
    );

    if (exitKind === PoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT) {
      return this.exactBptInForTokensOut(exitPoolRequest.userData, pool);
    } else if (exitKind === PoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT) {
      return this.exactBptInForOneTokenOut(exitPoolRequest.userData, pool);
    } else throw new Error('Exit type not implemented');
  }

  async handleBatchSwap(batchSwapRequest: BatchSwap): Promise<string[]> {
    const assets = batchSwapRequest.assets;
    const pools = await this.poolsDictionary();
    const deltas = new Array(assets.length).fill(Zero);

    batchSwapRequest.swaps.forEach((swap) => {
      const tokenIn = assets[swap.assetInIndex];
      const tokenOut = assets[swap.assetOutIndex];
      const pool = pools[swap.poolId];
      const pairData = pool.parsePoolPairData(tokenIn, tokenOut);
      const isExactIn = batchSwapRequest.swapType === SwapType.SwapExactIn;
      let amountInEvm: string | BigNumber = isExactIn
        ? BigNumber.from(swap.amount)
        : Zero;
      let amountOutEvm: string | BigNumber = isExactIn
        ? Zero
        : BigNumber.from(swap.amount);
      const amountInHuman: string | BigNumber = formatFixed(
        amountInEvm,
        pairData.decimalsIn
      );
      const amountOutHuman: string | BigNumber = formatFixed(
        amountOutEvm,
        pairData.decimalsOut
      );

      if (batchSwapRequest.swapType === SwapType.SwapExactIn) {
        // Needs human scale
        const amountOutHuman = pool._exactTokenInForTokenOut(
          pairData,
          bnum(amountInHuman.toString())
        );
        amountOutEvm = parseFixed(
          amountOutHuman.toString(),
          pairData.decimalsOut
        );
      } else {
        // Needs human scale
        const amountInHuman = pool._tokenInForExactTokenOut(
          pairData,
          bnum(amountOutHuman.toString())
        );
        amountInEvm = parseFixed(amountInHuman.toString(), pairData.decimalsIn);
      }
      deltas[swap.assetInIndex] = deltas[swap.assetInIndex].add(amountInEvm);
      deltas[swap.assetOutIndex] = deltas[swap.assetOutIndex].sub(amountOutEvm);
      // Update balances of tokenIn and tokenOut - use EVM scale
      pool.updateTokenBalanceForPool(
        pairData.tokenIn,
        pairData.balanceIn.add(amountInEvm)
      );
      pool.updateTokenBalanceForPool(
        pairData.tokenOut,
        pairData.balanceOut.sub(amountOutEvm)
      );
    });
    return deltas.map((d) => d.toString());
  }
}
