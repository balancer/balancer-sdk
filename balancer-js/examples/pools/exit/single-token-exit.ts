/**
 * Exit a pool with a single token out.
 *
 * Run command:
 * yarn example ./examples/pools/exit/single-token-exit.ts
 */
import { Network, BalancerSDK } from '@balancer-labs/sdk';
import { reset, setTokenBalance, getTokenBalance } from 'examples/helpers';
import { parseEther } from '@ethersproject/units';

async function singleTokenExit() {
  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545', // Using local fork for simulation
  });

  const signer = balancer.provider.getSigner();
  const address = await signer.getAddress();

  // Setup exit parameters
  const bptIn = String(parseEther('1'));
  const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // weth
  const slippage = '1000'; // 10%

  // 50/50 WBTC/WETH Pool
  const pool = await balancer.pools.find(
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'
  );
  if (!pool) throw Error('Pool not found');

  // Prepare local fork for simulation
  await reset(balancer.provider, 17700000);
  await setTokenBalance(balancer.provider, address, pool.address, bptIn, 0);

  // We are exiting all the BPT to a single token out
  const { to, data, expectedAmountsOut } = pool.buildExitExactBPTIn(
    address,
    bptIn,
    slippage,
    false,
    weth
  );

  // Send transaction
  await (await signer.sendTransaction({ to, data })).wait();

  // Check balances after transaction to confirm success
  const balance = await getTokenBalance(weth, address, balancer.provider);

  console.log('Expected amounts out', `${expectedAmountsOut}`);
  console.log('Actual amount out', String(balance));
}

singleTokenExit();
