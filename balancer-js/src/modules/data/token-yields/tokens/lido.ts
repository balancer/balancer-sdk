import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
  wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  arbitrumStEth: '0x5979d7b546e38e414f7e9822514be443a4800529',
};

interface LidoAPIResponse {
  data: {
    smaApr: string;
  };
}

/**
 * Lido APR fetching
 *
 * @returns lido APR for stETH
 */
export const lido: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(
      'https://lido-aprs-proxy.balancer.workers.dev/?network=1'
    );
    const { data: aprs } = response.data as LidoAPIResponse;

    apr = Math.round(parseFloat(aprs.smaApr) * 100);
  } catch (error) {
    console.error('Failed to fetch stETH APR:', error);
  }

  return {
    [yieldTokens.stETH]: apr,
    [yieldTokens.wstETH]: apr,
    [yieldTokens.arbitrumStEth]: apr,
  };
};
