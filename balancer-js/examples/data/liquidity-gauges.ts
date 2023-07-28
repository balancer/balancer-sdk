/**
 * Example retrieves all the gauges for the pools and shows one example with BAL and one example with BAL and another reward token (LIDO)
 *
 * Run with:
 * yarn example ./examples/data/liquidity-gauges.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.ARBITRUM,
  rpcUrl: 'https://arb1.arbitrum.io/rpc	',
});
const { liquidityGauges } = sdk.data;

(async function () {
  if (!liquidityGauges) throw 'Gauge Subgraph must be initialized';
  const gauges = await liquidityGauges.fetch();
  console.log(`Gauges: `, gauges.length);
  console.log(
    gauges.find((it) => it.id === '0x914ec5f93ccd6362ba925bedd0bd68107b85d2ca')
  );
  console.log(
    gauges.find((it) => it.id === '0xcf9f895296f5e1d66a7d4dcf1d92e1b435e9f999')
  );
})();
