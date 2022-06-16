import dotenv from 'dotenv';
import {
  BalancerSDK,
  Network,
  SwapType,
  BatchSwapStep,
  BalancerSdkConfig,
} from '../src/index';

dotenv.config();

async function runQueryBatchSwap() {
  const config: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  };
  const balancer = new BalancerSDK(config);

  const swapType = SwapType.SwapExactOut;
  const swaps: BatchSwapStep[] = [
    {
      poolId:
        '0x6a8c3239695613c0710dc971310b36f9b81e115e00000000000000000000023e',
      assetInIndex: 2,
      assetOutIndex: 3,
      amount: '123456',
      userData: '0x',
    },
    {
      poolId:
        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149000000000000000000000240',
      assetInIndex: 1,
      assetOutIndex: 2,
      amount: '0',
      userData: '0x',
    },
    {
      poolId:
        '0xcd32a460b6fecd053582e43b07ed6e2c04e1536900000000000000000000023c',
      assetInIndex: 0,
      assetOutIndex: 1,
      amount: '0',
      userData: '0x',
    },
  ];

  const assets: string[] = [
    '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd',
    '0xcd32a460b6fecd053582e43b07ed6e2c04e15369',
    '0x6a8c3239695613c0710dc971310b36f9b81e115e',
    '0x13512979ade267ab5100878e2e0f485b568328a4',
  ];

  const deltas = await balancer.swaps.queryBatchSwap({
    kind: swapType,
    swaps,
    assets,
  });
  console.log(deltas.toString());
}

// yarn examples:run ./examples/queryBatchSwap.ts
runQueryBatchSwap();
