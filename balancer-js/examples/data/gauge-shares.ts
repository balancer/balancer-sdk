/**
 * This example shows how to get user stake information from gauges.
 *
 * Run with:
 * yarn example ./examples/data/gauge-shares.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: '',
});

const { gaugeShares } = sdk.data;

(async function () {
  if (!gaugeShares) throw 'Gauge Subgraph must be initialized';

  const USER_ADDR = '0x00676e437f1945b85ec3a3c90aae35e0352115ed';
  const GAUGE_ID = '0xc5f8b1de80145e3a74524a3d1a772a31ed2b50cc';
  const GAUGESHARE_ID = `${USER_ADDR}-${GAUGE_ID}`;
  const GAUGESHARE_ID2 =
    '0x79c17982020abb9a2214aa952308e104e5840e2d-0xc5f8b1de80145e3a74524a3d1a772a31ed2b50cc';

  let result;

  result = await gaugeShares.find(GAUGESHARE_ID);
  console.log('Gauge share by id', result);

  result = await gaugeShares.findByUser(USER_ADDR);
  console.log('Gauge shares by user', result);

  result = await gaugeShares.findByGauge(GAUGE_ID, 5);
  console.log('Gauge shares by gauge (first 5)', result);

  result = await gaugeShares.findByGauge(GAUGE_ID, 2, 1);
  console.log('Gauge shares by gauge (#2 & #3)', result);

  result = await gaugeShares.query({
    where: { id_in: [GAUGESHARE_ID, GAUGESHARE_ID2] },
  });
  console.log('Gauge shares subgraph query', result);
  // Gauges subgraph : https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges
})();
