import { AprFetcher } from '../repository';
import axios from 'axios';

export const yieldTokens = {
  usdcUSDplus: '0x1aafc31091d93c3ff003cff5d2d8f7ba2e728425',
  usdcUSDplus2: '0x6933ec1ca55c06a894107860c92acdfd2dd8512f',
};

/**
 * Overnight token APR fetching
 *
 * @returns cached APR for USD+
 */
export const overnight: AprFetcher = async () => {
  let bsp = 0;
  try {
    const { data: rate } = await axios.get(
      'https://app.overnight.fi/api/balancer/week/apr'
    );
    bsp = Math.round((parseFloat(rate) * 10000) / 100);
  } catch (error) {
    console.error('Failed to fetch USD+ APR:', error);
  }

  return Object.fromEntries(
    Object.values(yieldTokens).map((address) => [address, bsp])
  );
};
