import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  USDR: '0xaf0d9d65fc54de245cda37af3d18cbec860a4d4b',
};

interface USDRAPIResponse {
  usdr: string;
}

/**
 * APR fetching
 *
 * @returns tokens yields
 */
export const usdr: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(
      'https://generic-apr-proxy.balancer.workers.dev/?provider=usdr'
    );

    const { usdr } = response.data as USDRAPIResponse;

    apr = Math.round(parseFloat(usdr) * 100);
  } catch (error) {
    console.error('Failed to fetch USDR APR:', error);
  }

  return {
    [yieldTokens.USDR]: apr,
  };
};
