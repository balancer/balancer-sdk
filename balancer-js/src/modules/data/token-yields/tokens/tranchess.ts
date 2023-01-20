import { BigNumber } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  qETH: '0x93ef1ea305d11a9b2a3ebb9bb4fcc34695292e7d',
};

interface TranchessAPIResponse {
  weeklyAveragePnlPercentage: string;
}

/**
 * APR fetching
 *
 * @returns tokens yields
 */
export const tranchess: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(
      'https://generic-apr-proxy.balancer.workers.dev/?provider=tranchess'
    );

    const [{ weeklyAveragePnlPercentage }] =
      response.data as TranchessAPIResponse[];

    apr = Math.round(
      parseFloat(
        formatEther(
          BigNumber.from(weeklyAveragePnlPercentage).mul(365).mul(10000)
        )
      )
    );
  } catch (error) {
    console.error('Failed to fetch qETH APR:', error);
  }

  return {
    [yieldTokens.qETH]: apr,
  };
};
