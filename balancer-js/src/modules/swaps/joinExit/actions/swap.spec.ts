// yarn test:only ./src/modules/swaps/joinExit/actions/swap.spec.ts
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { Swap } from './swap';

import poolsList from '@/test/lib/joinExitPools.json';

const pools = cloneDeep(poolsList.pools);
const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const relayer = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';
// e.g.
//    WETH[swap]AURABAL (external, external)
//    WETH[join]BPT (external, relayer)
//    BPT[swap]AURABAL (relayer, external)
//    WETH[swap]wstETH[swap]AURABAL (external, external)
const swaps = [
  {
    poolId:
      '0x0578292cb20a443ba1cde459c985ce14ca2bdee5000100000000000000000269', // swap, (external, external, user, user)
    assetInIndex: 0,
    assetOutIndex: 1,
    amount: '6021654047345106708',
    userData: '0x',
    returnAmount: '579946758625050147190',
  },
  {
    poolId:
      '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014', // join
    assetInIndex: 0,
    assetOutIndex: 2,
    amount: '3978345952654889628',
    userData: '0x',
    returnAmount: '362083706912447325569',
  },
  {
    poolId:
      '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249', // swap, (relayer, external, relayer, user) Should start again?
    assetInIndex: 2,
    assetOutIndex: 1,
    amount: '0',
    userData: '0x',
    returnAmount: '374315221022843007278',
  },
  {
    poolId:
      '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080', // swap, (external, internal, user, relayer) Should start again?
    assetInIndex: 0,
    assetOutIndex: 3,
    amount: '3664',
    userData: '0x',
    returnAmount: '2431',
  },
  {
    poolId:
      '0x0731399bd09ced6765ff1e0cb884bd223298a5a6000200000000000000000398', // swap, (internal, external, relayer, user) Should batch because chained
    assetInIndex: 3,
    assetOutIndex: 1,
    amount: '0',
    userData: '0x',
    returnAmount: '257788',
  },
];
const assets = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  '0x616e8bfa43f920657b3497dbf40d6b1a02d4608d', // auraBal
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56', // 80/20
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstEth
];

const swap0 = new Swap(swaps[0], 0, 1, 0, assets, '0', pools, user, relayer);
const swap1 = new Swap(swaps[2], 0, 1, 1, assets, '0', pools, user, relayer);
const swap2 = new Swap(swaps[3], 0, 1, 2, assets, '0', pools, user, relayer);
const swap3 = new Swap(swaps[4], 0, 1, 3, assets, '0', pools, user, relayer);

describe(`Swap Action`, () => {
  context(`Adding Swaps`, () => {
    it(`different sources - should not add`, () => {
      const canAdd = swap0.canAddSwap(swap1);
      expect(canAdd).to.be.false;
    });
    it(`different sources - should not add`, () => {
      const canAdd = swap1.canAddSwap(swap2);
      expect(canAdd).to.be.false;
    });
    it(`chained swaps - should add`, () => {
      const canAdd = swap2.canAddSwap(swap3);
      expect(canAdd).to.be.true;
    });
    it(`chained and direct swaps - should add`, () => {
      const batchSwap = swap2.copy();
      batchSwap.addSwap(swap3.copy());
      const canAdd = batchSwap.canAddSwap(swap0);
      expect(canAdd).to.be.true;
    });
  });
});
