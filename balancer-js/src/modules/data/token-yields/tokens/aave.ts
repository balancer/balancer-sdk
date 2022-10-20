import { Network } from '@/types';
import { AprFetcher } from '../repository';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import axios from 'axios';

// can be fetched from subgraph
// aave-js: supplyAPR = graph.liquidityRate = core.getReserveCurrentLiquidityRate(_reserve)
// or directly from RPC:
// wrappedAaveToken.LENDING_POOL.getReserveCurrentLiquidityRate(mainTokenAddress)

export const yieldTokens = {
  [Network.MAINNET]: {
    waUSDT: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
    waUSDC: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
    waDAI: '0x02d60b84491589974263d922d9cc7a3152618ef6',
  },
  [Network.POLYGON]: {
    wamDAI: '0xee029120c72b0607344f35b17cdd90025e647b00',
    wamUSDC: '0x221836a597948dce8f3568e044ff123108acc42a',
    wamUSDT: '0x19c60a251e525fa88cd6f3768416a8024e98fc19',
  },
};

export const allYieldTokens = {
  ...yieldTokens[Network.MAINNET],
  ...yieldTokens[Network.POLYGON],
};

export const wrappedTokensMap = {
  [Network.MAINNET]: {
    // USDT
    [yieldTokens[Network.MAINNET].waUSDT]: {
      aToken: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
      underlying: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // USDC
    [yieldTokens[Network.MAINNET].waUSDC]: {
      aToken: '0xbcca60bb61934080951369a648fb03df4f96263c',
      underlying: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    // DAI
    [yieldTokens[Network.MAINNET].waDAI]: {
      aToken: '0x028171bca77440897b824ca71d1c56cac55b68a3',
      underlying: '0x6b175474e89094c44da98b954eedeac495271d0f',
    },
  },
  [Network.POLYGON]: {
    // USDT
    [yieldTokens[Network.POLYGON].wamUSDT]: {
      aToken: '0x60d55f02a771d515e077c9c2403a1ef324885cec',
      underlying: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    },
    // USDC
    [yieldTokens[Network.POLYGON].wamUSDC]: {
      aToken: '0x1a13f4ca1d028320a707d99520abfefca3998b7f',
      underlying: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    },
    // DAI
    [yieldTokens[Network.POLYGON].wamDAI]: {
      aToken: '0x27f8d03b3a2196956ed754badc28d73be8830a6e',
      underlying: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    },
  },
};

const aTokens = {
  [Network.MAINNET]: Object.values(wrappedTokensMap[Network.MAINNET]).map(
    (t) => t.aToken
  ),
  [Network.POLYGON]: Object.values(wrappedTokensMap[Network.POLYGON]).map(
    (t) => t.aToken
  ),
};

const underlyingAssets = {
  [Network.MAINNET]: Object.values(wrappedTokensMap[Network.MAINNET]).map(
    (t) => t.underlying
  ),
  [Network.POLYGON]: Object.values(wrappedTokensMap[Network.POLYGON]).map(
    (t) => t.underlying
  ),
};

const underlyingToWrapped = {
  [Network.MAINNET]: Object.fromEntries(
    Object.keys(wrappedTokensMap[Network.MAINNET]).map((wrapped) => [
      wrappedTokensMap[Network.MAINNET][
        wrapped as keyof typeof wrappedTokensMap[Network.MAINNET]
      ].underlying,
      wrapped,
    ])
  ),
  [Network.POLYGON]: Object.fromEntries(
    Object.keys(wrappedTokensMap[Network.POLYGON]).map((wrapped) => [
      wrappedTokensMap[Network.POLYGON][
        wrapped as keyof typeof wrappedTokensMap[Network.POLYGON]
      ].underlying,
      wrapped,
    ])
  ),
};

// Subgraph
// liquidityRate, depositors APR (in rays - 27 digits)
const endpoint = {
  [Network.MAINNET]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2',
  [Network.POLYGON]:
    'https://api.thegraph.com/subgraphs/name/aave/aave-v2-matic',
};

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
export const aave: AprFetcher = async (network?: Network) => {
  const noRates = Object.fromEntries(
    Object.keys(wrappedTokensMap).map((key) => [key, 0])
  );

  if (!network || (network != Network.MAINNET && network != Network.POLYGON)) {
    return noRates;
  }

  try {
    const graphqlQuery = {
      operationName: 'getReserves',
      query,
      variables: {
        aTokens: aTokens[network],
        underlyingAssets: underlyingAssets[network],
      },
    };

    const response = await axios.post(endpoint[network], graphqlQuery);

    const {
      data: { reserves },
    } = response.data as ReserveResponse;

    const aprEntries = reserves.map((r) => [
      underlyingToWrapped[network][r.underlyingAsset],
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

    return noRates;
  }
};

// TODO: RPC multicall
// always upto date
// const lendingPoolAddress = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9';
