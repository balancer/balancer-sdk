import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  ankrEth: '0x544897A3B944fdEB1f94A0ed973eA31A80ae18E1',
};

export const url =
  'https://generic-apr-proxy.balancer.workers.dev/?provider=ankr';

interface APIResponse {
  services: {
    serviceName: string;
    apy: string;
  }[];
}

/**
 * APR fetching
 *
 * @returns APR for ankr tokens
 */
export const ankr: AprFetcher = async () => {
  let apr = 0;

  try {
    const response = await axios.get(url);
    const { services } = response.data as APIResponse;
    const eth = services.find((service) => service.serviceName === 'eth');
    if (!eth) throw new Error('Failed to find eth service');

    apr = Math.round(Number(eth.apy) * 100);
  } catch (error) {
    console.error('Failed to fetch APR:', error);
  }

  return {
    [yieldTokens.ankrEth]: apr,
  };
};
