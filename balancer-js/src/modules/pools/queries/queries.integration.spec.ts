import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, PoolType } from '@/.';
import { bn } from '@/lib/utils';
import { ParamsBuilder } from '.';
import { BigNumber } from '@ethersproject/bignumber';
dotenv.config();

const rpcUrl = process.env.ALCHEMY_URL || 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { contracts } = sdk;

const stETHPool = {
  id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
  poolType: PoolType.MetaStable,
  tokensList: [
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ],
};

const balPool = {
  id: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
  poolType: PoolType.Weighted,
  tokensList: [
    '0xba100000625a3754423978a60c9317c58a424e3d',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ],
};

const composableStablePool = {
  id: '0x4edcb2b46377530bc18bb4d2c7fe46a992c73e100000000000000000000003ec',
  poolType: PoolType.ComposableStable,
  tokensList: [
    '0x4edcb2b46377530bc18bb4d2c7fe46a992c73e10',
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    '0xbe9895146f7af43049ca1c1ae358b0541ea49704',
  ],
};

// const composableStablePoolWithTokenAtZero = {
//   id: '0x02d928e68d8f10c0358566152677db51e1e2dc8c00000000000000000000051e',
//   poolType: PoolType.ComposableStable,
//   tokensList: [
//     '0x02d928e68d8f10c0358566152677db51e1e2dc8c',
//     '0x60d604890feaa0b5460b28a424407c24fe89374a',
//     '0xf951e335afb289353dc249e82926178eac7ded78',
//   ],
// };

const pools = [
  stETHPool,
  balPool,
  composableStablePool,
  // composableStablePoolWithTokenAtZero,
];

let queryParams: ParamsBuilder;
const { balancerHelpers } = contracts;

describe('join and exit queries', () => {
  // for each poolType test outputs
  pools.forEach((pool) => {
    context(`${pool.poolType} pool`, () => {
      before(async () => {
        queryParams = new ParamsBuilder(pool);
      });

      it('should joinExactIn', async () => {
        const maxAmountsInByToken = new Map<string, BigNumber>([
          [pool.tokensList[1], bn(1)],
        ]);

        const params = queryParams.buildQueryJoinExactIn({
          maxAmountsInByToken,
        });
        const join = await balancerHelpers.callStatic.queryJoin(...params);
        expect(Number(join.bptOut)).to.be.gt(0);
      });

      it('should joinExactOut', async () => {
        const params = queryParams.buildQueryJoinExactOut({
          bptOut: bn(1),
          tokenIn: pool.tokensList[1],
        });
        const join = await balancerHelpers.callStatic.queryJoin(...params);
        expect(Number(join.amountsIn[0])).to.eq(0);
        expect(Number(join.amountsIn[1])).to.be.gt(0);
      });

      it('should exitToSingleToken', async () => {
        const params = queryParams.buildQueryExitToSingleToken({
          bptIn: bn(10),
          tokenOut: pool.tokensList[1],
        });
        const exit = await balancerHelpers.callStatic.queryExit(...params);
        expect(Number(exit.amountsOut[0])).to.eq(0);
        expect(Number(exit.amountsOut[1])).to.be.gt(0);
      });

      it('should exitProportionally', async function () {
        if (pool.poolType == PoolType.ComposableStable) {
          this.skip();
        }
        const params = queryParams.buildQueryExitProportionally({
          bptIn: bn(10),
        });
        const exit = await balancerHelpers.callStatic.queryExit(...params);
        expect(Number(exit.amountsOut[0])).to.be.gt(0);
        expect(Number(exit.amountsOut[1])).to.be.gt(0);
      });

      it('should exitExactOut', async () => {
        const bptIndex = pool.tokensList.findIndex((token) =>
          pool.id.includes(token)
        );
        const minAmountsOut = Array(pool.tokensList.length).fill(bn(1));
        const tokensOut = pool.tokensList;
        if (bptIndex > -1) minAmountsOut[bptIndex] = bn(0);

        const params = queryParams.buildQueryExitExactOut({
          minAmountsOut,
          tokensOut,
        });
        const exit = await balancerHelpers.callStatic.queryExit(...params);
        expect(Number(exit.bptIn)).to.be.gt(0);
        exit.amountsOut.forEach((a, i) => {
          if (i === bptIndex) expect(a.toString()).to.eq('0');
          else expect(a.toString()).to.eq(bn(1).toString());
        });
      });
    });
  });
});
