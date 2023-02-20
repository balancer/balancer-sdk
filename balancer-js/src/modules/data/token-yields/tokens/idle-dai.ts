import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  dai: '0x0c80F31B840C6564e6c5E18f386FaD96b63514cA',
};

export const url =
  'https://generic-apr-proxy.balancer.workers.dev/?provider=idle&contractAddress=0xeC9482040e6483B7459CC0Db05d51dfA3D3068E1';

interface IdleAPIResponse {
  idleRate: string;
}

/**
 * APR fetching
 *
 * @returns APR for idle tokens
 */
export const idleDai: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(url);
    const [dai] = response.data as IdleAPIResponse[];

    apr = Math.round(Number(dai.idleRate) / 1e16);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.dai]: apr,
  };
};
