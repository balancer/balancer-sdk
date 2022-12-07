/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/data/token-prices.ts
 */
import { BalancerSDK } from '@/.';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;
const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const matic = '0x0000000000000000000000000000000000001010';
const tetuBal = '0x7fc9e0aa043787bfad28e29632ada302c790ce33';

(async () => {
  // It will be just one request to coingecko
  const ps = [eth, dai, tetuBal, matic, eth, dai, tetuBal, matic].map((t) => data.tokenPrices.find(t));
  const price = await Promise.all(ps);

  console.log(price);
})();
