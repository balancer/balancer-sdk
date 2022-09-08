import { AprFetcher } from '../repository';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import axios from 'axios';

// can be fetched from subgraph
// aave-js: supplyAPR = graph.liquidityRate = core.getReserveCurrentLiquidityRate(_reserve)
// or directly from RPC:
// wrappedAaveToken.LENDING_POOL.getReserveCurrentLiquidityRate(mainTokenAddress)

export const yieldTokens = {
  waUSDT: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
  waUSDC: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
  waDAI: '0x02d60b84491589974263d922d9cc7a3152618ef6',
};

export const wrappedTokensMap = {
  // USDT
  [yieldTokens.waUSDT]: {
    aToken: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
    underlying: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  // USDC
  [yieldTokens.waUSDC]: {
    aToken: '0xbcca60bb61934080951369a648fb03df4f96263c',
    underlying: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  // DAI
  [yieldTokens.waDAI]: {
    aToken: '0x028171bca77440897b824ca71d1c56cac55b68a3',
    underlying: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
};

const aTokens = Object.values(wrappedTokensMap).map((t) => t.aToken);
const underlyingAssets = Object.values(wrappedTokensMap).map(
  (t) => t.underlying
);
const underlyingToWrapped = Object.fromEntries(
  Object.keys(wrappedTokensMap).map((wrapped) => [
    wrappedTokensMap[wrapped as keyof typeof wrappedTokensMap].underlying,
    wrapped,
  ])
);

// Subgraph
// liquidityRate, depositors APR (in rays - 27 digits)
const endpoint = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';
const query = `
  query getReserves($aTokens: [String!], $underlyingAssets: [Bytes!]) {
    reserves(
      where: {
        aToken_in: $aTokens
        underlyingAsset_in: $underlyingAssets
        isActive: true
      }
    ) {
      underlyingAsset
      liquidityRate
    }
  }
`;

interface ReserveResponse {
  data: {
    reserves: [
      {
        underlyingAsset: string;
        liquidityRate: string;
      }
    ];
  };
}

/**
 * Fetching and parsing aave APRs from a subgraph
 *
 * @returns APRs for aave tokens
 */
export const aave: AprFetcher = async () => {
  try {
    const graphqlQuery = {
      operationName: 'getReserves',
      query,
      variables: { aTokens, underlyingAssets },
    };

    const response = await axios.post(endpoint, graphqlQuery);

    const {
      data: { reserves },
    } = response.data as ReserveResponse;

    const aprEntries = reserves.map((r) => [
      underlyingToWrapped[r.underlyingAsset],
      // Note: our assumption is frontend usage, this service is not a good source where more accuracy is needed.
      // Converting from aave ray number (27 digits) to bsp
      // essentially same as here:
      // https://github.com/aave/aave-utilities/blob/master/packages/math-utils/src/formatters/reserve/index.ts#L231
      Math.round(
        parseFloat(formatUnits(BigNumber.from(r.liquidityRate), 27)) * 10000
      ),
    ]);

    return Object.fromEntries(aprEntries);
  } catch (error) {
    console.log(error);

    return Object.fromEntries(
      Object.keys(wrappedTokensMap).map((key) => [key, 0])
    );
  }
};

// TODO: RPC multicall
// always upto date
// const lendingPoolAddress = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9';
