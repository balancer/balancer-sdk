import { GraphQLArgs } from '@balancer-labs/sor';
import { BalancerSDK, formatFixed, parseFixed } from '../../src';
import { OrderDirection, Pool_OrderBy } from '@/modules/subgraph/subgraph';
import { BigNumber } from '@ethersproject/bignumber';

const rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA}`;

async function historicalSwap() {
  const balancer = new BalancerSDK({
    network: 1,
    rpcUrl: rpcUrl,
  });

  const swapsService = balancer.swaps;
  const queryArgWithBlock: GraphQLArgs = {
    orderBy: Pool_OrderBy.TotalLiquidity,
    block: {
      number: 17_000_000,
    },
    orderDirection: OrderDirection.Desc,
    where: {
      swapEnabled: {
        eq: true,
      },
      totalShares: {
        gt: 0.000000000001,
      },
    },
  };

  const poolsFetchSuccess = await swapsService.fetchPools(queryArgWithBlock);

  const swapInfo = await swapsService.findRouteGivenIn({
    tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    amount: parseFixed('1', 18),
    gasPrice: BigNumber.from('0'),
    maxPools: 4,
  });

  const balancerNow = new BalancerSDK({
    network: 1,
    rpcUrl: rpcUrl,
  });

  const swapsServiceNow = balancerNow.swaps;

  const poolsFetchSuccessNow = await swapsServiceNow.fetchPools();

  const swapInfoNow = await swapsServiceNow.findRouteGivenIn({
    tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDT
    amount: parseFixed('1', 18),
    gasPrice: BigNumber.from('0'),
    maxPools: 4,
  });

  console.log(
    `1 WETH is ${formatFixed(
      swapInfoNow.returnAmount,
      6
    )} USDC using the most recent data`
  );

  console.log(
    `1 WETH was ${formatFixed(swapInfo.returnAmount, 6)} USDC at block ${
      queryArgWithBlock.block?.number
    }`
  );
}

// start with "npm run example -- ./examples/swaps/historicalSwap.ts"
historicalSwap();
