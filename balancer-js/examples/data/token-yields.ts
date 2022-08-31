/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/data/token-yields.ts
 */
import { BalancerSDK } from '../../src/modules/sdk.module';
import { yieldTokens } from '../../src/modules/data/token-yields/tokens/aave';

const sdk = new BalancerSDK({ network: 1, rpcUrl: '' });
const { data } = sdk;

const main = async () => {
  const tokenYield = await data.tokenYields.find(yieldTokens.waDAI);

  console.log(yieldTokens.waDAI, tokenYield);
};

main();
