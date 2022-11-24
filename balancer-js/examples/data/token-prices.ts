/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/data/token-prices.ts
 */
import { BalancerSDK } from '@/modules/sdk.module';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;
const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';

(async () => {
  // It will be just one request to coingecko
  const ps = [dai, dai, dai, dai, dai, dai].map((t) => data.tokenPrices.find(t));
  const price = await Promise.all(ps);

  console.log(price);
})();
