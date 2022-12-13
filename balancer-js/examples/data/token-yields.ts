/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/data/token-yields.ts
 */
import { BalancerSDK } from '../../src/modules/sdk.module';
import { yieldTokens } from '../../src/modules/data/token-yields/tokens/aave';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;

const tokens = [
  yieldTokens[1].waDAI,
  '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4', // stMatic
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
  '0xac3e018457b222d93114458476f3e3416abbe38f', // sfrxETH
]

const main = async () => {
  const yields = await Promise.all(
    tokens.map((token) => data.tokenYields.find(token))
  )

  tokens.forEach((token, id) => {
    console.log(token, yields[id])
  })
};

main();
