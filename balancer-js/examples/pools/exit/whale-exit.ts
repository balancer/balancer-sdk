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
import { impersonateAccount } from '@/test/lib/utils';

// bb-a-usd
const poolId =
  '0xee02583596aee94cccb7e8ccd3921d955f17982a00000000000000000000040a';
const subpools = [
  '0x4739e50b59b552d490d3fdc60d200977a38510c0000000000000000000000409',
  '0x7c82a23b4c48d796dee36a9ca215b641c6a8709d000000000000000000000406',
  '0x9e34631547adcf2f8cefa0f5f223955c7b137571000000000000000000000407',
];

// Amount of testPool BPT that will be used to exit
const amount = parseEther('10000').toString();

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
    network: Network.ARBITRUM,
    rpcUrl: 'http://127.0.0.1:8161',
    subgraphQuery,
  });
  const { provider } = balancer;

  // Reset the local fork to block 17000000
  await reset(provider, 121762104, process.env.ALCHEMY_URL_ARBITRUM as string);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  const pool = await balancer.pools.find(poolId);
  if (!pool) throw 'Pool not found';

  // Setup local fork with correct balances/approval to exit bb-a-usd2 pool
  await setTokenBalance(provider, address, pool.address, amount, 0);
  console.log('here');
  // Use SDK to create exit transaction
  const { estimatedAmountsOut, tokensOut, tokensToUnwrap } =
    await balancer.pools.getExitInfo(pool.id, amount, address, signer);
  console.log('here2');
  // User reviews expectedAmountOut
  console.log(' -- getExitInfo() -- ');
  console.log(tokensToUnwrap.toString());
  console.table({
    tokensOut: truncateAddresses(tokensOut),
    estimatedAmountsOut: estimatedAmountsOut,
    unwrap: tokensOut.map((t) => tokensToUnwrap.includes(t)),
  });
  console.log('here3');
  // User approves relayer
  const { contracts } = balancer;
  console.log('here4');
  const relayerAuth = await Relayer.signRelayerApproval(
    contracts.relayer.address,
    address,
    signer,
    contracts.vault
  );
  console.log('here5');
  // Use SDK to create exit transaction
  const slippage = '100';
  console.log('beforeGeneralisedExit');
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
  console.log('afterGeneralisedExit');
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

exit().catch((e) => console.error(e.message));
