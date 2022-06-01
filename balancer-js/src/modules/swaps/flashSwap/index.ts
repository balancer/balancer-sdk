import {
  QuerySimpleFlashSwapParameters,
  QuerySimpleFlashSwapResponse,
  SimpleFlashSwapParameters,
  SwapType,
} from '../types';
import { queryBatchSwap } from '../queryBatchSwap';
import { BatchSwap } from '../types';
import { sum } from 'lodash';

function checkSimpleFlashSwapParams(params: {
  poolIds: string[];
  assets: string[];
}) {
  if (params.poolIds.length > 2) {
    throw new Error('Simple flash swap only supports a maximum of two pools');
  }

  if (params.assets.length > 2) {
    throw new Error(
      'Simple flash swap only supports a maximum of to two assets (tokens)'
    );
  }
}

function createSwaps(
  poolIds: SimpleFlashSwapParameters['poolIds'],
  amount: string
): BatchSwap['swaps'] {
  return [
    {
      poolId: poolIds[0],
      assetInIndex: 0,
      assetOutIndex: 1,
      amount,
      userData: '0x',
    },
    {
      poolId: poolIds[1],
      assetInIndex: 1,
      assetOutIndex: 0,
      amount: '0',
      userData: '0x',
    },
  ];
}

export function convertSimpleFlashSwapToBatchSwapParameters({
  poolIds,
  assets,
  flashLoanAmount,
  walletAddress,
}: SimpleFlashSwapParameters & {
  walletAddress: string;
}): BatchSwap {
  checkSimpleFlashSwapParams({ poolIds, assets });

  const swaps = createSwaps(poolIds, flashLoanAmount);

  const funds = {
    sender: walletAddress,
    fromInternalBalance: false,
    recipient: walletAddress,
    toInternalBalance: false,
  };

  const limits = ['0', '0'];

  const deadline = '999999999999999999';

  return {
    kind: SwapType.SwapExactIn,
    swaps,
    assets,
    funds,
    limits,
    deadline,
  };
}

function deltaToExpectedProfit(delta: string) {
  return Number(delta) * -1;
}

function calcProfit(profits: string[]) {
  return sum(profits);
}

/**
 * Simple interface to test if a simple flash swap is valid and see potential profits.
 *
 * A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
 * swapping in the first pool and then back in the second pool for a profit. For more
 * complex flash swaps, you will have to use the batch swap method.
 *
 * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
 *
 * _NB: This method doesn't execute a flashSwap
 *
 * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
 * @param {Contract}                    params.vaultContract - the ethersjs contract for the Balancer Vault.
 * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
 * @param {string[]}                    params.poolIds - array of Balancer pool ids
 * @param {string[]}                    params.assets - array of token addresses
 * @returns {Promise<QuerySimpleFlashSwapResponse}>}       Returns an ethersjs transaction response
 */
export async function querySimpleFlashSwap(
  params: QuerySimpleFlashSwapParameters
): Promise<QuerySimpleFlashSwapResponse> {
  checkSimpleFlashSwapParams(params);

  const [tokenAddress0, tokenAddress1] = params.assets;

  try {
    const deltas = await queryBatchSwap(
      params.vaultContract,
      SwapType.SwapExactIn,
      createSwaps(params.poolIds, params.flashLoanAmount),
      params.assets
    );

    const profits = {
      [tokenAddress0]: deltaToExpectedProfit(deltas[0]).toString(),
      [tokenAddress1]: deltaToExpectedProfit(deltas[1]).toString(),
    };

    return {
      profits,
      isProfitable:
        calcProfit([profits[tokenAddress0], profits[tokenAddress1]]) > 0,
    };
  } catch (err) {
    throw `Failed to querySimpleFlashSwap: ${err}`;
  }
}
