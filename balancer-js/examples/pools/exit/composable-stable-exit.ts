/**
 * Expected frontend (FE) flow:
 * 1. User selects BPT amount to exit a pool
 * 2. FE calls exitInfo
 * 3. SDK returns estimatedAmountsOut that is at least 99% accurate and indicates which tokens should be unwrapped (tokensToUnwrap)
 * 4. User agrees estimatedAmountsOut and approves relayer
 * 5. With approvals in place, FE calls exitGeneralised with simulation type Static and tokensToUnwrap
 * 6. SDK calculates expectedAmountsOut that is 100% accurate
 * 7. SDK returns exitGeneralised transaction data with proper minAmountsOut limits in place (calculated using user defined slippage)
 * 8. User is now able to submit a safe transaction to the blockchain
 *
 * Example run:
 * yarn example ./examples/pools/exit/composable-stable-exit.ts
 */
import {
  BalancerSDK,
  GraphQLQuery,
  GraphQLArgs,
  Network,
  truncateAddresses,
  removeItem,
  Relayer,
  SimulationType,
} from '@balancer-labs/sdk';
import { parseEther } from '@ethersproject/units';
import { formatFixed } from '@ethersproject/bignumber';
import { getTokenBalance, reset, setTokenBalance } from 'examples/helpers';

// bb-a-usd
const poolId =
  '0xfebb0bbf162e64fb9d0dfe186e517d84c395f016000000000000000000000502';
const subpools = [
  '0x6667c6fa9f2b3fc1cc8d85320b62703d938e43850000000000000000000004fb',
  '0xa1697f9af0875b63ddc472d6eebada8c1fab85680000000000000000000004f9',
  '0xcbfa4532d8b2ade2c261d3dd5ef2a2284f7926920000000000000000000004fa',
];

// Amount of testPool BPT that will be used to exit
const amount = String(parseEther('10'));

/*
Example showing how to use the SDK generalisedExit method.
This allows exiting a ComposableStable that has nested pools, e.g.:
                  CS0
              /        \
            CS1        CS2
          /    \      /   \
         DAI   USDC  USDT  FRAX

Can exit with CS0_BPT proportionally to: DAI, USDC, USDT and FRAX
*/
const exit = async () => {
  /**
   * Example of subgraph query that allows filtering pools.
   * Might be useful to reduce the response time by limiting the amount of pool
   * data that will be queried by the SDK. Specially when on chain data is being
   * fetched as well.
   */
  const subgraphArgs: GraphQLArgs = {
    where: {
      id: {
        in: [poolId, ...subpools],
      },
    },
  };

  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };

  const balancer = new BalancerSDK({
    network: Network.MAINNET,
    rpcUrl: 'http://127.0.0.1:8545',
    subgraphQuery,
  });

  const { provider } = balancer;

  // Reset the local fork to block 17000000
  await reset(provider, 17700000);

  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const pool = await balancer.pools.find(poolId);
  if (!pool) throw 'Pool not found';

  // Setup local fork with correct balances/approval to exit bb-a-usd2 pool
  await setTokenBalance(provider, address, pool.address, amount, 0);

  // Use SDK to create exit transaction
  const { estimatedAmountsOut, tokensOut, tokensToUnwrap } =
    await balancer.pools.getExitInfo(pool.id, amount, address, signer);

  // User reviews expectedAmountOut
  console.log(' -- getExitInfo() -- ');
  console.log(tokensToUnwrap.toString());
  console.table({
    tokensOut: truncateAddresses(tokensOut),
    estimatedAmountsOut: estimatedAmountsOut,
    unwrap: tokensOut.map((t) => tokensToUnwrap.includes(t)),
  });

  // User approves relayer
  const { contracts } = balancer;

  const relayerAuth = await Relayer.signRelayerApproval(
    contracts.relayer.address,
    address,
    signer,
    contracts.vault
  );

  // Use SDK to create exit transaction
  const slippage = '100';
  const query = await balancer.pools.generalisedExit(
    pool.id,
    amount,
    address,
    slippage,
    signer,
    SimulationType.Static,
    relayerAuth,
    tokensToUnwrap
  );

  // Submit transaction and check balance deltas to confirm success
  await signer.sendTransaction({ to: query.to, data: query.encodedCall });

  const balanceDeltas = await Promise.all(
    [pool.address, ...query.tokensOut].map((token) =>
      getTokenBalance(token, address, balancer.provider)
    )
  );

  console.log(' -- Simulating using Static Call -- ');
  console.log('Price impact: ', formatFixed(query.priceImpact, 18));
  console.log(`Amount Pool Token In: ${balanceDeltas[0].toString()}`);
  console.table({
    tokensOut: truncateAddresses(query.tokensOut),
    minAmountsOut: query.minAmountsOut,
    expectedAmountsOut: query.expectedAmountsOut,
    balanceDeltas: removeItem(balanceDeltas, 0).map((b) => b.toString()),
  });
};

exit();
