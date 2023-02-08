import {Network} from "@/lib/constants";
import {BalancerSDK} from "@/modules/sdk.module";

const sdk = new BalancerSDK({
  network: Network.POLYGON,
  rpcUrl: 'https://rpc.ankr.com/polygon',
});
const { liquidityGauges } = sdk.data;

/**
 * retrieves all the gauges for the pools and shows one example with BAL and one example with BAL and another reward token (LIDO)
 */
(async function () {
  if (!liquidityGauges) throw 'Gauge Subgraph must be initialized';
  const gauges = await liquidityGauges.fetch();
  console.log(`Gauges: `, gauges.length);
  console.log(gauges.find((it) => it.id === '0xa02883e738854a17a7cd37f0871e9c2c0ed8cf7f'));
  console.log(gauges.find((it) => it.id === '0x2aa6fb79efe19a3fce71c46ae48efc16372ed6dd'));
})();

// npm run examples:run -- ./examples/data/liquidity-gauges.ts
