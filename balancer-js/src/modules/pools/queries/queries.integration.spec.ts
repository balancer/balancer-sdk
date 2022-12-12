import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSDK, Network, PoolType } from '@/.';
import { bn } from '@/lib/utils';
import { ParamsBuilder } from '.';

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
  id: '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
  poolType: PoolType.ComposableStable,
  tokensList: [
    '0x2f4eb100552ef93840d5adc30560e5513dfffacb',
    '0x82698aecc9e28e9bb27608bd52cf57f704bd1b83',
    '0xa13a9247ea42d743238089903570127dda72fe44',
    '0xae37d54ae477268b9997d4161b96b8200755935c',
  ],
};

const pools = [stETHPool, balPool, composableStablePool];

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
        const maxAmountsIn = [
          bn(1),
          ...Array(pool.tokensList.length - 1).fill(bn(0)),
        ];

        const params = queryParams.buildQueryJoinExactIn({
          maxAmountsIn,
        });
        const join = await balancerHelpers.queryJoin(...params);
        expect(Number(join.bptOut)).to.be.gt(0);
      });

      it('should joinExactOut', async () => {
        const params = queryParams.buildQueryJoinExactOut({
          bptOut: bn(1),
          tokenIn: pool.tokensList[0],
        });
        const join = await balancerHelpers.queryJoin(...params);
        expect(Number(join.amountsIn[0])).to.be.gt(0);
        expect(Number(join.amountsIn[1])).to.eq(0);
      });

      it('should exitToSingleToken', async () => {
        const params = queryParams.buildQueryExitToSingleToken({
          bptIn: bn(10),
          tokenOut: pool.tokensList[0],
        });
        const exit = await balancerHelpers.queryExit(...params);
        expect(Number(exit.amountsOut[0])).to.be.gt(0);
        expect(Number(exit.amountsOut[1])).to.eq(0);
      });

      it('should exitProportionally', async function () {
        if (pool.poolType == PoolType.ComposableStable) {
          this.skip();
        }
        const params = queryParams.buildQueryExitProportionally({
          bptIn: bn(10),
        });
        const exit = await balancerHelpers.queryExit(...params);
        expect(Number(exit.amountsOut[0])).to.be.gt(0);
        expect(Number(exit.amountsOut[1])).to.be.gt(0);
      });

      it('should exitExactOut', async () => {
        const minAmountsOut = Array(pool.tokensList.length).fill(bn(1));

        const params = queryParams.buildQueryExitExactOut({
          minAmountsOut,
        });
        const exit = await balancerHelpers.queryExit(...params);
        expect(Number(exit.amountsOut[0])).to.be.gt(0);
        expect(Number(exit.amountsOut[1])).to.be.gt(0);
      });
    });
  });
});
