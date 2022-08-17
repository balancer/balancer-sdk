import { Factory } from 'fishery';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';

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

interface BoostedPoolParams {
  linearPoolsParams: LinearPoolsParams;
  id: string;
  address: string;
}

const boostedPool = Factory.define<BoostedPoolInfo, BoostedPoolParams>(
  ({ transientParams }) => {
    const {
      linearPoolsParams,
      address = 'address_boosted',
      id = 'id_boosted',
    } = transientParams;
    let linearPoolInfo;
    if (linearPoolsParams)
      linearPoolInfo = linearPools.transient(linearPoolsParams).build();
    else linearPoolInfo = linearPools.build();
    const phantomBptToken = subgraphToken
      .transient({
        symbol: `bPhantomStable`,
        balance: '5192296829399898',
        address: formatAddress(address),
      })
      .build();

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

export { linearPools, boostedPool };
