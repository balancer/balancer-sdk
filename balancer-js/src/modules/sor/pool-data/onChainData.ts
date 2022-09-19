import { formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { PoolFilter, SubgraphPoolBase } from '@balancer-labs/sor';
import { Multicaller } from '@/lib/utils/multiCaller';
import { isSameAddress } from '@/lib/utils';
import { Vault__factory } from '@balancer-labs/typechain';

// TODO: decide whether we want to trim these ABIs down to the relevant functions
import aTokenRateProvider from '@/lib/abi/StaticATokenRateProvider.json';
import weightedPoolAbi from '@/lib/abi/WeightedPool.json';
import stablePoolAbi from '@/lib/abi/StablePool.json';
import elementPoolAbi from '@/lib/abi/ConvergentCurvePool.json';
import linearPoolAbi from '@/lib/abi/LinearPool.json';
import composableStableAbi from '@/lib/abi/ComposableStable.json';

export async function getOnChainBalances(
  subgraphPoolsOriginal: SubgraphPoolBase[],
  multiAddress: string,
  vaultAddress: string,
  provider: Provider
): Promise<SubgraphPoolBase[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abis: any = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [
        ...Vault__factory.abi,
        ...aTokenRateProvider,
        ...weightedPoolAbi,
        ...stablePoolAbi,
        ...elementPoolAbi,
        ...linearPoolAbi,
        ...composableStableAbi,
      ].map((row) => [row.name, row])
    )
  );

  const multiPool = new Multicaller(multiAddress, provider, abis);

  const supportedPoolTypes: string[] = Object.values(PoolFilter);
  const subgraphPools: SubgraphPoolBase[] = [];
  subgraphPoolsOriginal.forEach((pool) => {
    if (!supportedPoolTypes.includes(pool.poolType)) {
      console.error(`Unknown pool type: ${pool.poolType} ${pool.id}`);
      return;
    }

    subgraphPools.push(pool);

    multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [
      pool.id,
    ]);
    multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');

    // Pools with pre minted BPT
    if (pool.poolType.includes('Linear') || pool.poolType === 'StablePhantom') {
      multiPool.call(
        `${pool.id}.virtualSupply`,
        pool.address,
        'getVirtualSupply'
      );
    }

    /**
     * Returns the effective BPT supply.
     * In other pools, this would be the same as `totalSupply`, but there are two key differences here:
     *  - this pool pre-mints BPT and holds it in the Vault as a token, and as such we need to subtract the Vault's
     *    balance to get the total "circulating supply". This is called the 'virtualSupply'.
     *  - the Pool owes debt to the Protocol in the form of unminted BPT, which will be minted immediately before the
     *    next join or exit. We need to take these into account since, even if they don't yet exist, they will
     *    effectively be included in any Pool operation that involves BPT.
     * In the vast majority of cases, this function should be used instead of `totalSupply()`.
     */
    if (pool.poolType === 'ComposableStable')
      multiPool.call(
        `${pool.id}.actualSupply`,
        pool.address,
        'getActualSupply'
      );

    // TO DO - Make this part of class to make more flexible?
    if (
      pool.poolType === 'Weighted' ||
      pool.poolType === 'LiquidityBootstrapping' ||
      pool.poolType === 'Investment'
    ) {
      multiPool.call(
        `${pool.id}.weights`,
        pool.address,
        'getNormalizedWeights'
      );
      multiPool.call(
        `${pool.id}.swapFee`,
        pool.address,
        'getSwapFeePercentage'
      );
    } else if (
      pool.poolType === 'Stable' ||
      pool.poolType === 'MetaStable' ||
      pool.poolType === 'StablePhantom' ||
      pool.poolType === 'ComposableStable'
    ) {
      // MetaStable & StablePhantom is the same as Stable for multicall purposes
      multiPool.call(
        `${pool.id}.amp`,
        pool.address,
        'getAmplificationParameter'
      );
      multiPool.call(
        `${pool.id}.swapFee`,
        pool.address,
        'getSwapFeePercentage'
      );
    } else if (pool.poolType === 'Element') {
      multiPool.call(`${pool.id}.swapFee`, pool.address, 'percentFee');
    } else if (pool.poolType.toString().includes('Linear')) {
      multiPool.call(
        `${pool.id}.swapFee`,
        pool.address,
        'getSwapFeePercentage'
      );

      multiPool.call(`${pool.id}.targets`, pool.address, 'getTargets');
      multiPool.call(`${pool.id}.rate`, pool.address, 'getWrappedTokenRate');
    } else if (pool.poolType.toString().includes('Gyro')) {
      multiPool.call(
        `${pool.id}.swapFee`,
        pool.address,
        'getSwapFeePercentage'
      );
    }
  });

  let pools = {} as Record<
    string,
    {
      amp?: string[];
      swapFee: string;
      weights?: string[];
      targets?: string[];
      poolTokens: {
        tokens: string[];
        balances: string[];
      };
      totalSupply: string;
      virtualSupply?: string;
      rate?: string;
      actualSupply?: string;
    }
  >;

  try {
    pools = (await multiPool.execute()) as Record<
      string,
      {
        amp?: string[];
        swapFee: string;
        weights?: string[];
        poolTokens: {
          tokens: string[];
          balances: string[];
        };
        totalSupply: string;
        virtualSupply?: string;
        rate?: string;
        actualSupply?: string;
      }
    >;
  } catch (err) {
    throw `Issue with multicall execution.`;
  }

  const onChainPools: SubgraphPoolBase[] = [];

  Object.entries(pools).forEach(([poolId, onchainData], index) => {
    try {
      const {
        poolTokens,
        swapFee,
        weights,
        totalSupply,
        virtualSupply,
        actualSupply,
      } = onchainData;

      if (
        subgraphPools[index].poolType === 'Stable' ||
        subgraphPools[index].poolType === 'MetaStable' ||
        subgraphPools[index].poolType === 'StablePhantom' ||
        subgraphPools[index].poolType === 'ComposableStable'
      ) {
        if (!onchainData.amp) {
          console.error(`Stable Pool Missing Amp: ${poolId}`);
          return;
        } else {
          // Need to scale amp by precision to match expected Subgraph scale
          // amp is stored with 3 decimals of precision
          subgraphPools[index].amp = formatFixed(onchainData.amp[0], 3);
        }
      }

      if (subgraphPools[index].poolType.includes('Linear')) {
        if (!onchainData.targets) {
          console.error(`Linear Pool Missing Targets: ${poolId}`);
          return;
        } else {
          subgraphPools[index].lowerTarget = formatFixed(
            onchainData.targets[0],
            18
          );
          subgraphPools[index].upperTarget = formatFixed(
            onchainData.targets[1],
            18
          );
        }

        const wrappedIndex = subgraphPools[index].wrappedIndex;
        if (wrappedIndex === undefined || onchainData.rate === undefined) {
          console.error(
            `Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`
          );
          return;
        }
        // Update priceRate of wrappedToken
        subgraphPools[index].tokens[wrappedIndex].priceRate = formatFixed(
          onchainData.rate,
          18
        );
      }

      subgraphPools[index].swapFee = formatFixed(swapFee, 18);

      poolTokens.tokens.forEach((token, i) => {
        const T = subgraphPools[index].tokens.find((t) =>
          isSameAddress(t.address, token)
        );
        if (!T) throw `Pool Missing Expected Token: ${poolId} ${token}`;
        T.balance = formatFixed(poolTokens.balances[i], T.decimals);
        if (weights) {
          // Only expected for WeightedPools
          T.weight = formatFixed(weights[i], 18);
        }
      });

      // Pools with pre minted BPT
      if (
        subgraphPools[index].poolType.includes('Linear') ||
        subgraphPools[index].poolType === 'StablePhantom'
      ) {
        if (virtualSupply === undefined) {
          console.error(
            `Pool with pre-minted BPT missing Virtual Supply: ${poolId}`
          );
          return;
        }
        subgraphPools[index].totalShares = formatFixed(virtualSupply, 18);
      } else if (subgraphPools[index].poolType === 'ComposableStable') {
        if (actualSupply === undefined) {
          console.error(`ComposableStable missing Actual Supply: ${poolId}`);
          return;
        }
        subgraphPools[index].totalShares = formatFixed(actualSupply, 18);
      } else {
        subgraphPools[index].totalShares = formatFixed(totalSupply, 18);
      }

      onChainPools.push(subgraphPools[index]);
    } catch (err) {
      throw `Issue with pool onchain data: ${err}`;
    }
  });

  return onChainPools;
}
