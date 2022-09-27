/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/aprs.ts
 */
import dotenv from 'dotenv';
import { BalancerSDK } from '../../src/modules/sdk.module';

dotenv.config();

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: `${process.env.ALCHEMY_URL}`,
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'
  );

  if (pool) {
    try {
      console.log(pool.apr);

      // Mutate state
      pool.tokens[0].balance = (
        parseFloat(pool.tokens[0].balance) * 2
      ).toString();

      // Calculate new APR
      const newApr = await pools.apr(pool);
      console.log(newApr);
    } catch (e) {
      console.log(e);
    }
  } else {
    return;
  }
};

main();
