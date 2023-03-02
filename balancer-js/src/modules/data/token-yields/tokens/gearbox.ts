import axios from 'axios';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';

import { AprFetcher } from '../repository';

export const yieldTokens = {
  dUSDC: '0xc411dB5f5Eb3f7d552F9B8454B2D74097ccdE6E3'.toLowerCase(),
  dDAI: '0x6CFaF95457d7688022FC53e7AbE052ef8DFBbdBA'.toLowerCase(),
};

export const url =
  'https://generic-apr-proxy.balancer.workers.dev/?provider=gearbox';

interface APIResponse {
  data: {
    dieselToken: string;
    depositAPY_RAY: string;
  }[];
}

/**
 * APR fetching
 *
 * @returns APR for gearbox tokens
 */
export const gearbox: AprFetcher = async () => {
  const aprs: Record<string, number> = {};

  try {
    const response = await axios.get(url);
    const { data } = response.data as APIResponse;
    data.forEach((token) => {
      aprs[token.dieselToken.toLowerCase()] = Math.round(
        // depositAPY_RAY is 1e27 and apr is in bps (1e4), all we need is to parse as 1e23
        parseFloat(formatFixed(BigNumber.from(token.depositAPY_RAY), 23))
      );
    });
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.dUSDC]: aprs[yieldTokens.dUSDC],
    [yieldTokens.dDAI]: aprs[yieldTokens.dDAI],
  };
};
