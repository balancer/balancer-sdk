import { AprFetcher } from '../repository';
import { Network } from '@/types';
import axios from 'axios';
import { formatUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';

export const yieldTokens = {
  eUSDC: '0xeb91861f8a4e1c12333f42dce8fb0ecdc28da716',
  eDAI: '0xe025e3ca2be02316033184551d4d3aa22024d9dc',
  eUSDT: '0x4d19f33948b99800b6113ff3e83bec9b537c85d2',
  eFRAX: '0x5484451a88a35cd0878a1be177435ca8a0e4054e',
};

const query = `
  query getAssetsAPY($eTokenAddress_in: [String!]) {
    assets(
      where: {
        eTokenAddress_in: $eTokenAddress_in
      }
    ) {
      eTokenAddress
      supplyAPY
    }
  }
`;

interface EulerResponse {
  data: {
    assets: [
      {
        eTokenAddress: string;
        supplyAPY: string;
      }
    ];
  };
}

const endpoint = {
  [Network.MAINNET]:
    'https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet',
};
/**
 * Euler APR fetching
 *
 * @returns Euler APR for USDC, USDT and DAI
 */
export const euler: AprFetcher = async () => {
  const network = Network.MAINNET;
  const graphqlQuery = {
    operationName: 'getAssetsAPY',
    query,
    variables: {
      eTokenAddress_in: Object.values(yieldTokens),
    },
  };
  const response = await axios.post(endpoint[network], graphqlQuery);
  const {
    data: { assets },
  } = response.data as EulerResponse;
  const aprs = {
    eUSDT: 0,
    eDAI: 0,
    eUSDC: 0,
    eFRAX: 0,
  };
  assets.forEach(({ eTokenAddress, supplyAPY }) => {
    const key: 'eUSDT' | 'eDAI' | 'eUSDC' | 'eFRAX' = Object.entries(
      yieldTokens
    ).filter(([, value]) => {
      return value.toLocaleLowerCase() === eTokenAddress.toLocaleLowerCase();
    })[0][0] as 'eUSDT' | 'eDAI' | 'eUSDC' | 'eFRAX';
    aprs[key] = Math.round(
      // supplyAPY is 1e27 = 100% and the apy must be returned with 1e4 = 100% (100% is 10000 in this case)
      parseFloat(formatUnits(BigNumber.from(supplyAPY), 27)) * 10000
    );
  });
  return {
    [yieldTokens.eUSDT]: aprs.eUSDT,
    [yieldTokens.eDAI]: aprs.eDAI,
    [yieldTokens.eUSDC]: aprs.eUSDC,
    [yieldTokens.eFRAX]: aprs.eFRAX,
  };
};
