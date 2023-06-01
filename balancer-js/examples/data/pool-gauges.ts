import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: '',
});
const { poolGauges } = sdk.data;

(async function () {
  if (!poolGauges) throw 'Gauge Subgraph must be initialized';

  const POOL_ADDRESS = '0x27c9f71cc31464b906e0006d4fcbc8900f48f15f';

  const result = await poolGauges.find(POOL_ADDRESS);

  if (result) {
    console.log('All gauges of this pool', result.gauges);
    console.log('Preferential gauge', result.preferentialGauge);
  }
})();

// yarn run example ./examples/data/pool-gauges.ts
