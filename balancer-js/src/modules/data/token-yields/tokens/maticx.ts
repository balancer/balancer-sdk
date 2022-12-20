import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  maticX: '0xfa68fb4628dff1028cfec22b4162fccd0d45efb6',
};

interface StaderLabsAPIResponse {
  value: string;
}

/**
 * APR fetching
 *
 * @returns APR in bsp
 */
export const maticX: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get<StaderLabsAPIResponse>(
      'https://generic-apr-proxy.balancer.workers.dev/?provider=stader'
    );
    const { value } = response.data;

    apr = Math.round(parseFloat(value) * 100);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.maticX]: apr,
  };
};
