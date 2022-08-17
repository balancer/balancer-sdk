import { Factory } from 'fishery';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';

import { subgraphToken, subgraphPoolBase } from './sor';
import { formatAddress, formatId } from '../lib/utils';

type LinearTokens = {
  wrappedSymbol: string;
  mainSymbol: string;
  balance: string;
  proportion: string;
};

type LinearPoolsParams = {
  pools: LinearTokens[];
};

export type LinearPoolInfo = {
  linearPools: SubgraphPoolBase[];
  mainTokens: SubgraphToken[];
  wrappedTokens: SubgraphToken[];
  linearTokens: SubgraphToken[];
  linearProportions: string[];
};

export interface BoostedPoolInfo extends LinearPoolInfo {
  boostedPool: SubgraphPoolBase;
}

export interface BoostedMetaPoolInfo extends BoostedPoolInfo {
  childBoostedPool: {
    pool: SubgraphPoolBase;
    proportion: string;
  };
}

interface BoostedPoolParams {
  linearPoolsParams: LinearPoolsParams;
  id: string;
  address: string;
}

/*
Check a set of Linear pools and associated tokens:
LinearPools consisting of wrappedToken, mainToken, phantomBpt
*/
const linearPools = Factory.define<LinearPoolInfo, LinearPoolsParams>(
  ({ transientParams }) => {
    const { pools } = transientParams;
    const linearPools: SubgraphPoolBase[] = [];
    const mainTokens: SubgraphToken[] = [];
    const wrappedTokens: SubgraphToken[] = [];
    const linearTokens: SubgraphToken[] = [];
    const linearProportions: string[] = [];
    pools?.forEach((pool) => {
      const poolAddress = formatAddress(
        `address-${pool.mainSymbol}_${pool.wrappedSymbol}`
      );
      const mainToken = subgraphToken
        .transient({
          symbol: pool.mainSymbol,
          balance: '1000000',
        })
        .build();
      const wrappedToken = subgraphToken
        .transient({
          symbol: pool.wrappedSymbol,
          balance: '9711834',
        })
        .build();
      const phantomBptToken = subgraphToken
        .transient({
          symbol: `b${pool.mainSymbol}_${pool.wrappedSymbol}`,
          balance: '5192296829399898',
          address: formatAddress(
            `address-${pool.mainSymbol}_${pool.wrappedSymbol}`
          ),
        })
        .build();
      const linearPool = subgraphPoolBase.build({
        id: formatId(`id-${pool.mainSymbol}_${pool.wrappedSymbol}`),
        address: poolAddress,
        poolType: 'AaveLinear',
        tokens: [mainToken, wrappedToken, phantomBptToken],
        wrappedIndex: 1,
        mainIndex: 0,
        tokensList: [
          mainToken.address,
          wrappedToken.address,
          phantomBptToken.address,
        ],
      });
      // Update the pool token to have the expected balance set in input
      phantomBptToken.balance = pool.balance;
      linearTokens.push(phantomBptToken);
      mainTokens.push(mainToken);
      wrappedTokens.push(wrappedToken);
      linearPools.push(linearPool);
      linearProportions.push(pool.proportion);
    });
    return {
      linearPools,
      mainTokens,
      wrappedTokens,
      linearTokens,
      linearProportions,
    };
  }
);

/*
Check a boostedPool, a phantomStable with all constituents being Linear.
Also creates associated LinearPools consisting of wrappedToken, mainToken, phantomBpt.
*/
const boostedPool = Factory.define<BoostedPoolInfo, BoostedPoolParams>(
  ({ transientParams }) => {
    const {
      linearPoolsParams,
      address = 'address_boosted',
      id = 'id_boosted',
    } = transientParams;
    let linearPoolInfo;
    // Create linear pools and tokens
    if (linearPoolsParams)
      linearPoolInfo = linearPools.transient(linearPoolsParams).build();
    else linearPoolInfo = linearPools.build();
    // Create parent phantomStable BPT
    const phantomBptToken = subgraphToken
      .transient({
        symbol: `bPhantomStableBoosted`,
        balance: '5192296829399898',
        address: formatAddress(address),
      })
      .build();

    // Create parent phantomStable
    const boostedPool = subgraphPoolBase.build({
      id: formatId(id),
      address: formatAddress(address),
      poolType: 'StablePhantom',
      totalWeight: undefined,
      tokens: [...linearPoolInfo.linearTokens, phantomBptToken],
    });

    return {
      boostedPool: boostedPool,
      linearPools: linearPoolInfo.linearPools,
      mainTokens: linearPoolInfo.mainTokens,
      wrappedTokens: linearPoolInfo.wrappedTokens,
      linearTokens: linearPoolInfo.linearTokens,
      linearProportions: linearPoolInfo.linearProportions,
    };
  }
);

/*
Check a boostedMetaPool, a phantomStable with one Linear and one boosted.
Also creates associated boosted and LinearPools consisting of wrappedToken, mainToken, phantomBpt.
*/
const boostedMetaPool = Factory.define<BoostedMetaPoolInfo, BoostedPoolParams>(
  ({ transientParams }) => {
    const {
      linearPoolsParams,
      address = 'address_boostedMeta',
      id = 'id_boostedMeta',
    } = transientParams;

    // Build separate Linear pool
    const childLinearToken = linearPoolsParams?.pools.pop();
    if (!childLinearToken) throw Error('Issue creating Child Linear Pool');
    // Create child Linear pool with associated tokens
    const childLinearPool = linearPools
      .transient({ pools: [childLinearToken] })
      .build();
    // Build boostedPool with child id and address
    const boostedPoolInfo = boostedPool
      .transient({
        linearPoolsParams: linearPoolsParams,
        id: 'id_boosted_child',
        address: 'address_boosted_child',
      })
      .build();

    // Create parent phantomStable
    const phantomBptToken = subgraphToken
      .transient({
        symbol: `bPhantomStableBoostedMeta`,
        balance: '5192296829399898',
        address,
      })
      .build();

    // Child Boosted token will be part of parent tokens
    const childBoostedBpt =
      boostedPoolInfo.boostedPool.tokens[
        boostedPoolInfo.boostedPool.tokens.length - 1
      ];
    childBoostedBpt.balance = '500000'; // Make this an input param?
    const boostedBalanceBn = BigNumber.from(childBoostedBpt.balance);
    const total = BigNumber.from(childBoostedBpt.balance).add(
      childLinearPool.linearTokens[0].balance
    );
    // Used for tests
    const childBoostedProportion = formatFixed(
      boostedBalanceBn.mul(BigNumber.from('1000000000000000000')).div(total),
      18
    );

    const boostedPoolRoot = subgraphPoolBase.build({
      id,
      address,
      poolType: 'StablePhantom',
      totalWeight: undefined,
      tokens: [
        childBoostedBpt,
        ...childLinearPool.linearTokens,
        phantomBptToken,
      ],
    });

    return {
      boostedPool: boostedPoolRoot,
      childBoostedPool: {
        pool: boostedPoolInfo.boostedPool,
        proportion: childBoostedProportion,
      },
      linearPools: [
        ...boostedPoolInfo.linearPools,
        ...childLinearPool.linearPools,
      ],
      mainTokens: [
        ...boostedPoolInfo.mainTokens,
        ...childLinearPool.mainTokens,
      ],
      wrappedTokens: [
        ...boostedPoolInfo.wrappedTokens,
        ...childLinearPool.wrappedTokens,
      ],
      linearTokens: [
        ...boostedPoolInfo.linearTokens,
        ...childLinearPool.linearTokens,
      ],
      linearProportions: [
        ...boostedPoolInfo.linearProportions,
        ...childLinearPool.linearProportions,
      ],
    };
  }
);

export { linearPools, boostedPool, boostedMetaPool };
