import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  sfrxETH: '0xac3e018457b222d93114458476f3e3416abbe38f',
};

interface FraxAPIResponse {
  sfrxethApr: string;
}

/**
 * APR fetching
 *
 * @returns APR in bsp
 */
export const sfrxETH: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get<FraxAPIResponse>(
      'https://api.frax.finance/v2/frxeth/summary/latest'
    );
    const { sfrxethApr } = response.data;

    apr = Math.round(parseFloat(sfrxethApr) * 100);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.sfrxETH]: apr,
  };
};
