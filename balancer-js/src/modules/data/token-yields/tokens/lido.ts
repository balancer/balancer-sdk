import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  stETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
};

interface LidoAPIResponse {
  data: {
    eth: string;
    steth: string;
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
    const response = await axios.get('https://stake.lido.fi/api/apr');
    const { data: aprs } = response.data as LidoAPIResponse;

    apr = Math.round(parseFloat(aprs.steth) * 100);
  } catch (error) {
    console.error('Failed to fetch stETH APR:', error);
  }

  return {
    [yieldTokens.stETH]: apr,
  };
};
