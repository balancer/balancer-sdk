/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn example ./examples/data/token-prices.ts
 */
import { ApiTokenPriceService } from '@/modules/sor/token-price/apiTokenPriceService';

const dai = '0x6b175474e89094c44da98b954eedeac495271d0f';
const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const ohm = '0X64AA3364F17A4D01C6F1751FD97C2BD3D7E7F1D5';

(async () => {
  const apiTokenPriceService = new ApiTokenPriceService(1);
  const daiPriceInEth = await apiTokenPriceService.getNativeAssetPriceInToken(
    dai
  );
  console.log('Dai Price In ETH: ' + daiPriceInEth);
  const wethPriceInEth = await apiTokenPriceService.getNativeAssetPriceInToken(
    weth
  );
  console.log('WETH Price In ETH: ' + wethPriceInEth);
  const ohmPriceInEth = await apiTokenPriceService.getNativeAssetPriceInToken(
    ohm
  );
  console.log('OHM Price In ETH: ' + ohmPriceInEth);
})();
