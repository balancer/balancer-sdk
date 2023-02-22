import dotenv from 'dotenv';
import { createGaugesClient } from '../subgraph';

dotenv.config();

(async function () {
  const client = createGaugesClient(`${process.env.GAUGE_SUBGRAPH_URL}`);

  const GAUGESHARE_ID =
    '0x00676e437f1945b85ec3a3c90aae35e0352115ed-0xc5f8b1de80145e3a74524a3d1a772a31ed2b50cc';

  const gaugeShare = await client.GaugeShare({ id: GAUGESHARE_ID });
  console.log(gaugeShare);

  const gaugeShares = await client.GaugeShares({ first: 10 });
  console.log(gaugeShares);
})();

// npm run examples:run -- ./src/modules/subgraph/examples/gauge-shares.ts
