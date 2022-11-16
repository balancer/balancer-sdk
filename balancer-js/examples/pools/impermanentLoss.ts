/**
 * calculate impermanent loss for a pool from a given timestamp.
 *
 * Run command: npm run examples:run -- ./examples/pools/impermanentLoss.ts
 *
 */

import dotenv from "dotenv";
import {BalancerError, BalancerErrorCode, BalancerSDK} from "../../src";

dotenv.config();

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: `${process.env.ALCHEMY_URL}`,
});

const { pools } = sdk;

const main = async (): Promise<void> => {
  await impermanentLoss('0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080');
  await impermanentLoss('0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014');
  await impermanentLoss('0xc45d42f801105e861e86658648e3678ad7aa70f900010000000000000000011e');
  await impermanentLoss('0x1e19cf2d73a72ef1332c882f20534b6519be0276000200000000000000000112');
  // await impermanentLoss('0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d');
}

const impermanentLoss = async (poolId: string): Promise<void> => {
  const timestamp = 1656375041;// Tuesday, 28 June 2022 00:10:41 GMT

  const pool = await sdk.pools.find(poolId);
  if (!pool) {
    throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
  }
  try {
    const IL = await pools.impermanentLoss(timestamp, pool);
    console.log(`${poolId} => ${IL}%`);
  } catch (e: any) {
    console.error(`${poolId} => Error: ${e.message}`);
  }
}

main().then(() => console.log('done'));