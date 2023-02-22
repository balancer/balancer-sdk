import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  usdt: '0x544897A3B944fdEB1f94A0ed973eA31A80ae18E1',
};

export const url =
  'https://generic-apr-proxy.balancer.workers.dev/?provider=idle&contractAddress=0xfa3AfC9a194BaBD56e743fA3b7aA2CcbED3eAaad';

interface IdleAPIResponse {
  idleRate: string;
}

/**
 * APR fetching
 *
 * @returns APR for idle tokens
 */
export const idleUsdt: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(url);
    const [usdt] = response.data as IdleAPIResponse[];

    apr = Math.round(Number(usdt.idleRate) / 1e16);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.usdt]: apr,
  };
};
