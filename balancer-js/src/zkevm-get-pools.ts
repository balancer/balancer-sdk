import { JsonRpcProvider } from '@ethersproject/providers';
import { BalancerPoolDataQueries__factory } from './contracts';

const provider = new JsonRpcProvider('http://127.0.0.1:8110', 1101);
const poolDataQueryConfig = {
  poolIds: [
    '0x1d0a8a31cdb04efac3153237526fb15cc65a252000000000000000000000000f',
    '0xe1f2c039a68a216de6dd427be6c60decf405762a00000000000000000000000e',
    '0xdf725fde6e89981fb30d9bf999841ac2c160b512000000000000000000000010',
    '0x6f34a44fce1506352a171232163e7716dd073ade000200000000000000000015',
    '0xe274c9deb6ed34cfe4130f8d0a8a948dea5bb28600000000000000000000000d',
    '0x16c9a4d841e88e52b51936106010f27085a529ec00000000000000000000000c',
    '0x4b718e0e2fea1da68b763cd50c446fba03ceb2ea00000000000000000000000b',
    '0x5b125477cd532b892c3a6b206014c6c9518a0afe000200000000000000000018',
    '0x47eeb5e07b8db37f75f29422d90a2b729c8f395500020000000000000000001e',
    '0xc951aebfa361e9d0063355b9e68f5fa4599aa3d1000100000000000000000017',
    '0x68a69c596b3839023c0e08d09682314f582314e5000200000000000000000011',
    '0xa7f602cfaf75a566cb0ed110993ee81c27fa3f53000200000000000000000009',
    '0x195def5dabc4a73c4a6a410554f4e53f3e55f1a900010000000000000000000a',
    '0x5480b5f610fa0e11e66b42b977e06703c07bc5cf000200000000000000000008',
    '0x246e3d0ae7664854e4dcb0d8c85220e714a5f033000200000000000000000022',
    '0x7da2bb31cb168be60025f9122a95cbb3949e7e9e000200000000000000000016',
    '0xe8ca7400eb61d5bdfc3f8f2ea99e687e0a4dbf78000100000000000000000019',
    '0x01e4464604ad0167d9dccda63ecd471b0ca0f0ef000200000000000000000020',
    '0x53ddc1f1ef585b426c03674f278f8107f1524ade000200000000000000000012',
    '0xc27260ee43394bd134007ee9ec078071b04cee2500020000000000000000001c',
    '0x9796631591ba3bc77f972db22b4fca9cece57f3200020000000000000000001f',
    '0xca4d6fff7e481a22273b02b6df5563dc36846cdc00020000000000000000001b',
    '0x9e2d87f904862671eb49cb358e74284762cc9f42000200000000000000000013',
  ],
  loadTokenBalanceUpdatesAfterBlock: true,
  blockNumber: 0,
  loadAmps: true,
  ampPoolIdxs: [0, 1, 2, 4],
  loadSwapFees: true,
  swapFeeTypes: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  loadTotalSupply: true,
  totalSupplyTypes: [
    2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  ],
  loadNormalizedWeights: true,
  weightedPoolIdxs: [
    3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  ],
  loadLinearTargets: true,
  loadLinearWrappedTokenRates: true,
  linearPoolIdxs: [5, 6],
  loadRates: false,
  ratePoolIdxs: [],
  loadScalingFactors: true,
  scalingFactorPoolIdxs: [0, 1, 2, 4, 5, 6],
};

async function getPools() {
  const contractAddress = '0xF24917fB88261a37Cc57F686eBC831a5c0B9fD39';
  const queryContract = BalancerPoolDataQueries__factory.connect(
    contractAddress,
    provider
  );
  const queryResult = await queryContract.getPoolData(
    poolDataQueryConfig.poolIds,
    poolDataQueryConfig
  );
  console.log('result: ', queryResult);
}

getPools();
