/**
 * How to build a swap and send it using ethers.js
 *
 * How to run:
 * yarn example examples/swaps/swap.ts
 */
import { FORK_NODES, RPC_URLS } from '@/test/lib/utils';
import { BalancerSDK, Network } from '@balancer-labs/sdk';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { reset } from 'examples/helpers/forked-utils';

const tokenIn = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
const tokenInDecimals = 6;
const tokenOut = '0x95ab45875cffdba1e5f451b950bc2e42c0053f39';
const tokenOutDecimals = 18;
const amount = parseFixed('100', tokenInDecimals).toString();

const network = Network.ARBITRUM;
const sdk = new BalancerSDK({
  network,
  rpcUrl: RPC_URLS[network],
});

const { swaps } = sdk;

const erc20Out = sdk.contracts.ERC20(tokenOut, sdk.provider);

async function swap() {
  await reset(sdk.provider, undefined, FORK_NODES[network]);

  const signer = sdk.provider.getSigner();
  const account = await signer.getAddress();

  // Finding a trading route rely on on-chain data.
  // fetchPools will fetch the current data from the subgraph.
  const poolsFetched = await swaps.fetchPools();
  console.log('Pools fetched:', poolsFetched);

  const pools = swaps.getPools();
  console.log('Pools:', pools);

  // Set exectution deadline to 60 seconds from now
  const deadline = String(Math.ceil(Date.now() / 1000) + 60);

  // Avoid getting rekt by setting low slippage from expected amounts out, 10 bsp = 0.1%
  const maxSlippage = 10;

  // Building the route payload
  const payload = await swaps.buildRouteExactIn(
    account,
    account,
    tokenIn, // eth
    tokenOut, // wBTC
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
      })
    ).wait();

    // check delta
    const balanceAfter = await erc20Out.balanceOf(account);

    console.log(
      `Amount of token out received: ${formatFixed(
        balanceAfter.sub(balanceBefore),
        tokenOutDecimals
      )}`
    );
  } catch (err) {
    console.log(err);
  }
}

swap();
