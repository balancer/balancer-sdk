/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/data/token-prices.ts
 */
import { BalancerSDK } from '@/modules/sdk.module';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;
const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const matic = '0x0000000000000000000000000000000000001010';

(async () => {
  // It will be just one request to coingecko
  const ps = [dai, eth, dai, eth, dai, eth, matic].map((t) => data.tokenPrices.find(t));
  const price = await Promise.all(ps);

  console.log(price);
})();
