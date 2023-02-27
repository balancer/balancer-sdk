import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  usdc: '0xc3dA79e0De523eEf7AC1e4ca9aBFE3aAc9973133',
};

export const url =
  'https://generic-apr-proxy.balancer.workers.dev/?provider=idle&contractAddress=0xDc7777C771a6e4B3A82830781bDDe4DBC78f320e';

interface IdleAPIResponse {
  idleRate: string;
}

/**
 * APR fetching
 *
 * @returns APR for idle tokens
 */
export const idleUsdc: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(url);
    const [usdc] = response.data as IdleAPIResponse[];

    apr = Math.round(Number(usdc.idleRate) / 1e16);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.usdc]: apr,
  };
};
