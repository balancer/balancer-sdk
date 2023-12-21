/**
 * Helper example to facilitate swap debugging within the SDK
 *
 * How to run:
 * yarn example examples/swaps/swapDebug.ts
 */
import { ADDRESSES } from '@/test/lib/constants';
import { FORK_NODES, RPC_URLS, forkSetup } from '@/test/lib/utils';
import { BalancerSDK, Network } from '@balancer-labs/sdk';
import { formatFixed } from '@ethersproject/bignumber';

const network = Network.MAINNET;
const rpcUrl = RPC_URLS[network];
const sdk = new BalancerSDK({
  network,
  rpcUrl,
});

const tokenIn = ADDRESSES[network].BAL8020BPT;
const tokenOut = ADDRESSES[network].auraBal;
const amount = String(BigInt(1000e18)); // 1000 eth

const { swaps } = sdk;
const erc20Out = sdk.contracts.ERC20(tokenOut.address, sdk.provider);

async function swap() {
  const signer = sdk.provider.getSigner();
  const account = await signer.getAddress();

  await forkSetup(
    signer,
    [tokenIn.address],
    [tokenIn.slot],
    [amount],
    FORK_NODES[network]
  );

  // Finding a trading route rely on on-chain data.
  // fetchPools will fetch the current data from the subgraph.
  // Let's fetch just 5 pools with highest liquidity of tokenOut.
  await swaps.fetchPools({
    first: 5,
    where: {
      swapEnabled: {
        eq: true,
      },
      tokensList: {
        contains: [tokenOut.address],
      },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
  });

  // Set exectution deadline to 60 seconds from now
  const deadline = String(Math.ceil(Date.now() / 1000) + 60);

  // Avoid getting rekt by setting low slippage from expected amounts out, 10 bsp = 0.1%
  const maxSlippage = 10;

  // Building the route payload
  const payload = await swaps.buildRouteExactIn(
    account,
    account,
    tokenIn.address,
    tokenOut.address,
    amount,
    {
      maxSlippage,
      deadline,
    }
  );

  // Extract parameters required for sendTransaction
  const { to, data, value } = payload;

  // Execution with ethers.js
  try {
    const balanceBefore = await erc20Out.balanceOf(account);

    await (
      await signer.sendTransaction({
        to,
        data,
        value,
        gasLimit: 8e6,
      })
    ).wait();

    // check delta
    const balanceAfter = await erc20Out.balanceOf(account);

    console.log(
      `Amount of tokenOut received: ${formatFixed(
        balanceAfter.sub(balanceBefore),
        tokenOut.decimals
      )}`
    );
  } catch (err) {
    console.log(err);
  }
}

swap();
