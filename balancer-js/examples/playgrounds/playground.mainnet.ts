import { BalancerSDK } from '@/modules/sdk.module';
import { Network } from '@/types';
import { parseFixed } from '@ethersproject/bignumber';

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const playground = async () => {
  const balancer = new BalancerSDK({
    network,
    rpcUrl,
  });

  await balancer.swaps.fetchPools();

  const swapInfo = await balancer.swaps.findRouteGivenIn({
    tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    tokenOut: '0xba100000625a3754423978a60c9317c58a424e3d',
    amount: parseFixed('1', 18),
    gasPrice: parseFixed('30000000000', 18),
    maxPools: 200,
  });

  console.log(swapInfo);
  return;
};

playground();
