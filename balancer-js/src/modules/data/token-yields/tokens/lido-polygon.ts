import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  stMATIC: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
};

interface LidoAPIResponse {
  price: string;
  apr: string;
}

/**
 * Lido APR fetching
 *
 * @returns lido APR for stMATIC
 */
export const lidoPolygon: AprFetcher = async () => {
  let returnApr = 0;

  try {
    const response = await axios.get(
      'https://lido-aprs-proxy.balancer.workers.dev/?network=137'
    );
    const { apr } = response.data as LidoAPIResponse;

    returnApr = Math.round(parseFloat(apr) * 100);
  } catch (error) {
    console.error('Failed to fetch stMATIC APR:', error);
  }

  return {
    [yieldTokens.stMATIC]: returnApr,
  };
};
