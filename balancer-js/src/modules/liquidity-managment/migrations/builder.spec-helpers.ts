import { SubgraphLiquidityGauge } from '@/modules/subgraph/subgraph';
import { factories } from '@/test/factories';
import { Pool } from '@/types';
import pools from '@/test/fixtures/pools-mainnet.json';
import polygon from '@/test/fixtures/pools-polygon.json';

const metaStable = {
  ...pools.data.pools.find(
    (p) => p.address === '0x32296969ef14eb0c6d29669c550d4a0449130230'
  ),
} as Pool;
const bDaiPool = {
  ...pools.data.pools.find(
    (p) => p.address === '0xae37d54ae477268b9997d4161b96b8200755935c'
  ),
} as Pool;
const bUsdcPool = {
  ...pools.data.pools.find(
    (p) => p.address === '0x82698aecc9e28e9bb27608bd52cf57f704bd1b83'
  ),
} as Pool;
const bUsdtPool = {
  ...pools.data.pools.find(
    (p) => p.address === '0x2f4eb100552ef93840d5adc30560e5513dfffacb'
  ),
} as Pool;
const composableStable = {
  ...pools.data.pools.find(
    (p) => p.address === '0xa13a9247ea42d743238089903570127dda72fe44'
  ),
} as Pool;
const vitaDao1 = {
  ...pools.data.pools.find(
    (p) => p.address === '0xbaeec99c90e3420ec6c1e7a769d2a856d2898e4d'
  ),
} as Pool;
const vitaDao2 = {
  ...pools.data.pools.find(
    (p) => p.address === '0x350196326aeaa9b98f1903fb5e8fc2686f85318c'
  ),
} as Pool;
export { vitaDao1, vitaDao2, metaStable, composableStable, bDaiPool };

const poolsMap = new Map([
  [metaStable.id, metaStable as Pool],
  [composableStable.id, composableStable as Pool],
  [bDaiPool.id, bDaiPool as Pool],
  [bUsdcPool.id, bUsdcPool as Pool],
  [bUsdtPool.id, bUsdtPool as Pool],
  [vitaDao1.id, vitaDao1 as Pool],
  [vitaDao2.id, vitaDao2 as Pool],
]);

export const poolsRepository = factories.data.findable<Pool>(poolsMap);

const metaStableGauge = '0xcd4722b7c24c29e0413bdcd9e51404b4539d14ae';
const composableStableGauge = '0xa6325e799d266632d347e41265a69af111b05403';
const gaugesMap = new Map([
  [
    composableStableGauge,
    {
      id: composableStableGauge,
      poolId:
        '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
    } as unknown as SubgraphLiquidityGauge,
  ],
  [
    metaStableGauge,
    {
      id: metaStableGauge,
      poolId:
        '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
    } as unknown as SubgraphLiquidityGauge,
  ],
]);

export const gaugesRepository =
  factories.data.findable<SubgraphLiquidityGauge>(gaugesMap);

const polygonbDaiPool = {
  ...polygon.data.pools.find(
    (p) => p.address === '0x178e029173417b1f9c8bc16dcec6f697bc323746'
  ),
} as Pool;
const polygonbUsdcPool = {
  ...polygon.data.pools.find(
    (p) => p.address === '0xf93579002dbe8046c43fefe86ec78b1112247bb8'
  ),
} as Pool;
const polygonbUsdtPool = {
  ...polygon.data.pools.find(
    (p) => p.address === '0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea6'
  ),
} as Pool;
const polygonComposableStable = {
  ...polygon.data.pools.find(
    (p) => p.address === '0x48e6b98ef6329f8f0a30ebb8c7c960330d648085'
  ),
} as Pool;

export { polygonComposableStable };

const polygonPoolsMap = new Map([
  [polygonComposableStable.id, polygonComposableStable as Pool],
  [polygonbDaiPool.id, polygonbDaiPool as Pool],
  [polygonbUsdcPool.id, polygonbUsdcPool as Pool],
  [polygonbUsdtPool.id, polygonbUsdtPool as Pool],
]);

export const polygonPoolRepository =
  factories.data.findable<Pool>(polygonPoolsMap);
