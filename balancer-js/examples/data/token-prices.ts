/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn example ./examples/data/token-prices.ts
 */
import { BalancerSDK } from '@/.';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;
const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const ohm = '0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5';
const matic = '0x0000000000000000000000000000000000001010';
const tetuBal = '0x7fc9e0aa043787bfad28e29632ada302c790ce33';

(async () => {
  // It will be just one request to coingecko
  const ps = [
    eth,
    weth,
    dai,
    ohm,
    tetuBal,
    matic,
    eth,
    dai,
    tetuBal,
    matic,
  ].map((t) => data.tokenPrices.find(t));
  const price = await Promise.all(ps);

  console.log(price);
})();
