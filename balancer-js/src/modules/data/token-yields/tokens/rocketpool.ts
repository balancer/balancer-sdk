import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  rETH: '0xae78736cd615f374d3085123a210448e74fc6393',
};

interface RocketPoolAPIResponse {
  yearlyAPR: string;
}

/**
 * APR fetching
 *
 * @returns APR in bsp
 */
export const rocketpool: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get<RocketPoolAPIResponse>(
      'https://api.rocketpool.net/api/apr'
    );
    const { yearlyAPR } = response.data;

    apr = Math.round(parseFloat(yearlyAPR) * 100);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.rETH]: apr,
  };
};
