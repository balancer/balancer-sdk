import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  rETH: '0x9559aaa82d9649c7a7b220e7c461d2e74c9a3593',
};

interface StafiAPIResponse {
  data: {
    stakeApr: string;
  };
}

/**
 * APR fetching
 *
 * @returns APR in bsp
 */
export const stafi: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get<StafiAPIResponse>(
      'https://drop-api.stafi.io/reth/v1/poolData/'
    );

    const { stakeApr } = response.data.data;

    apr = Math.round(parseFloat(stakeApr) * 100);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.rETH]: apr,
  };
};
