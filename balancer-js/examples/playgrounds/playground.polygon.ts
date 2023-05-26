import { BalancerSDK } from '@/modules/sdk.module';
import { Network } from '@/types';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

const network = Network.POLYGON;
const rpcUrl = 'http://127.0.0.1:8137';
const playgroundPolygon = async () => {
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });
  const pool = await balancer.pools.find(
    '0xf0ad209e2e969eaaa8c882aac71f02d8a047d5c2000200000000000000000b49'
  );
  if (!pool) {
    throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
  }
  const apr = await balancer.pools.aprService.apr(pool);
  console.log(apr);
};

playgroundPolygon();
