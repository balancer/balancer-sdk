// yarn test:only ./src/modules/swaps/joinAndExit.spec.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { cloneDeep } from 'lodash';

import {
  SwapTypes,
  SwapInfo,
  PoolFilter,
  TokenPriceService,
} from '@balancer-labs/sor';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import {
  ActionStep,
  ActionType,
  BatchSwapAction,
  ExitAction,
  getActions,
  JoinAction,
  orderActions,
  SwapAction,
} from './joinAndExit';

import poolsList from '@/test/lib/joinExitPools.json';
import { Network } from '@/types';
import { BalancerSDK } from '../sdk.module';

const pool1Bpt = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56';
const DAI = ADDRESSES[Network.MAINNET].DAI;
const USDT = ADDRESSES[Network.MAINNET].USDT;
const BAL = ADDRESSES[Network.MAINNET].BAL;
const WETH = ADDRESSES[Network.MAINNET].WETH;
const USDC = ADDRESSES[Network.MAINNET].USDC;

export class MockTokenPriceService implements TokenPriceService {
  constructor(private nativeAssetPriceInToken: string = '0') {}

  public setTokenPrice(nativeAssetPriceInToken: string) {
    this.nativeAssetPriceInToken = nativeAssetPriceInToken;
  }

  public async getNativeAssetPriceInToken(): Promise<string> {
    return this.nativeAssetPriceInToken;
  }
}

describe(`Paths with join and exits.`, () => {
  context('getActions', () => {
    it('token->BPT, exact in', async () => {
      const tokenIn = DAI.address;
      const tokenOut = USDT.address;
      const swapType = SwapTypes.SwapExactIn;
      const pools = cloneDeep(poolsList.pools);
      const swapAmount = parseFixed('1280000', 18);
      const swapWithJoinExit = await getSwapInfo(
        tokenIn,
        tokenOut,
        swapType,
        pools,
        swapAmount,
        true
      );
      const actions = getActions(
        tokenIn,
        tokenOut,
        swapWithJoinExit.swaps,
        swapWithJoinExit.tokenAddresses,
        swapWithJoinExit.returnAmount.toString()
      );
      const firstSwap = actions[0] as SwapAction;
      const firstJoin = actions[1] as JoinAction;
      const secondSwap = actions[2] as SwapAction;
      expect(actions.length).to.eq(swapWithJoinExit.swaps.length);
      expect(firstSwap.type).to.eq(ActionType.Swap);
      expect(firstSwap.opRef.length).to.eq(0);
      expect(firstSwap.minOut).to.eq(swapWithJoinExit.returnAmount.toString());
      expect(firstJoin.type).to.eq(ActionType.Join);
      expect(firstJoin.minOut).to.eq('0');
      expect(secondSwap.type).to.eq(ActionType.Swap);
      expect(secondSwap.opRef.length).to.eq(0);
      expect(secondSwap.amountIn).to.eq(firstJoin.opRef.key.toString());
      expect(secondSwap.minOut).to.eq(swapWithJoinExit.returnAmount.toString());
    });
    it('BPT->token, exact in', async () => {
      const tokenIn = USDT.address;
      const tokenOut = DAI.address;
      const swapType = SwapTypes.SwapExactIn;
      const pools = cloneDeep(poolsList.pools);
      pools.splice(1, 1); // removes the stable pool
      const swapAmount = parseFixed('100000', 6);
      const swapWithJoinExit = await getSwapInfo(
        tokenIn,
        tokenOut,
        swapType,
        pools,
        swapAmount,
        true
      );
      const actions = getActions(
        tokenIn,
        tokenOut,
        swapWithJoinExit.swaps,
        swapWithJoinExit.tokenAddresses,
        swapWithJoinExit.returnAmount.toString()
      );
      const swap = actions[0] as SwapAction;
      const exit = actions[1] as ExitAction;
      expect(actions.length).to.eq(swapWithJoinExit.swaps.length);
      expect(actions.length).to.eq(swapWithJoinExit.swaps.length);
      expect(swap.type).to.eq(ActionType.Swap);
      expect(swap.opRef[0].index).to.eq(1);
      expect(swap.minOut).to.eq('0');
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.opRef.length).to.eq(0);
      expect(exit.amountIn).to.eq(swap.opRef[0].key.toString());
      expect(actions[1].minOut).to.eq(swapWithJoinExit.returnAmount.toString());
    });
  });
  context('orderActions', () => {
    it('exact in, join', async () => {
      const tokenIn = DAI.address;
      const tokenOut = pool1Bpt;
      const swapAmount = parseFixed('1280000', 18);
      const swaps = [
        {
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: swapAmount.toString(),
          userData: '0x',
        },
      ];
      const assets = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
      ];
      const returnAmount = '639359779510000000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const join = orderedActions[0] as JoinAction;
      expect(orderedActions.length).to.eq(actions.length);
      expect(join.type).to.eq(ActionType.Join);
      expect(join.opRef.index).to.eq(undefined);
      expect(join.amountIn).to.eq(swapAmount.toString());
      expect(join.minOut).to.eq(returnAmount);
      expect(join.actionStep).to.eq(ActionStep.Direct);
    });
    it('exact in, exit', async () => {
      const tokenIn = pool1Bpt;
      const tokenOut = DAI.address;
      const swapAmount = '1280000000000000000000000';
      const swaps = [
        {
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: swapAmount,
          userData: '0x',
        },
      ];
      const assets = [
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ];
      const returnAmount = '2557439736413850000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const exit = orderedActions[0] as ExitAction;
      expect(orderedActions.length).to.eq(actions.length);
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.opRef.length).to.eq(0);
      expect(exit.amountIn).to.eq(swapAmount);
      expect(exit.minOut).to.eq(returnAmount);
      expect(exit.actionStep).to.eq(ActionStep.Direct);
    });
    it('exact in, swap and join>swap', async () => {
      const tokenIn = DAI.address;
      const tokenOut = USDT.address;
      const swaps = [
        {
          // swap (tokenIn>tokenOut)
          poolId:
            '0xc45d42f801105e861e86658648e3678ad7aa70f900010000000000000000011e',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '1279699403356512142192771',
          userData: '0x',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 0,
          assetOutIndex: 2,
          amount: '300596643487857807229',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 2,
          assetOutIndex: 1,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
      ];
      const returnAmount = '1264585520968';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const join = orderedActions[0] as JoinAction;
      const batchSwap = orderedActions[1] as BatchSwapAction;

      expect(orderedActions.length).to.eq(2);
      expect(join.type).to.eq(ActionType.Join);
      expect(join.opRef.index).to.eq(2);
      expect(join.minOut).to.eq('0');
      expect(join.actionStep).to.eq(ActionStep.TokenIn);
      expect(batchSwap.type).to.eq(ActionType.BatchSwap);
      expect(batchSwap.opRef.length).to.eq(0);
      expect(batchSwap.minOut).to.eq(returnAmount);
      expect(batchSwap.swaps.length).to.eq(2);
      expect(batchSwap.swaps[0].amount).to.eq('1279699403356512142192771');
      expect(batchSwap.swaps[1].amount).to.eq(join.opRef.key.toString());
      expect(batchSwap.hasTokenOut).to.be.true;
    });
    it('exact in, swap>exit', async () => {
      const tokenIn = USDT.address;
      const tokenOut = DAI.address;
      const swaps = [
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const batchSwap = orderedActions[0] as BatchSwapAction;
      const exit = orderedActions[1] as ExitAction;

      expect(orderedActions.length).to.eq(2);
      expect(batchSwap.type).to.eq(ActionType.BatchSwap);
      expect(batchSwap.opRef[0].index).to.eq(1);
      expect(batchSwap.minOut).to.eq('0');
      expect(batchSwap.swaps.length).to.eq(1);
      expect(batchSwap.swaps[0].amount).to.eq('100000000000');
      expect(batchSwap.hasTokenOut).to.be.false;
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.opRef.length).to.eq(0);
      expect(exit.minOut).to.eq(returnAmount);
      expect(exit.amountIn).to.eq(batchSwap.opRef[0].key.toString());
      expect(exit.actionStep).to.eq(ActionStep.TokenOut);
    });
    it('exact in, swap>join>swap', async () => {
      // e.g.
      //    USDT[swap]DAI
      //    DAI[join]BPT
      //    BPT[swap]USDC
      const tokenIn = USDT.address;
      const tokenOut = USDC.address;
      const swaps = [
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000376',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [tokenIn, DAI.address, pool1Bpt, USDC.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const batchSwapFirst = orderedActions[0] as BatchSwapAction;
      const join = orderedActions[1] as JoinAction;
      const batchSwapSecond = orderedActions[2] as BatchSwapAction;

      expect(orderedActions.length).to.eq(3);
      expect(batchSwapFirst.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapFirst.minOut).to.eq('0');
      expect(batchSwapFirst.opRef.length).to.eq(1);
      expect(batchSwapFirst.opRef[0].index).to.eq(1);
      expect(batchSwapFirst.swaps.length).to.eq(1);
      expect(batchSwapFirst.swaps[0].amount).to.eq('100000000000');
      expect(batchSwapFirst.hasTokenOut).to.be.false;
      expect(join.type).to.eq(ActionType.Join);
      expect(join.minOut).to.eq('0');
      expect(join.opRef.index).to.eq(2);
      expect(join.amountIn).to.eq(batchSwapFirst.opRef[0].key.toString());
      expect(join.actionStep).to.eq(ActionStep.Middle);
      expect(batchSwapSecond.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapSecond.opRef.length).to.eq(0);
      expect(batchSwapSecond.swaps.length).to.eq(1);
      expect(batchSwapSecond.swaps[0].amount).to.eq(join.opRef.key.toString());
      expect(batchSwapSecond.minOut).to.eq(returnAmount);
      expect(batchSwapSecond.hasTokenOut).to.be.true;
    });
    it('exact in, swap>exit>swap', async () => {
      // e.g.
      //    USDT[swap]BPT
      //    BPT[exit]DAI
      //    DAI[swap]USDC
      const tokenIn = USDT.address;
      const tokenOut = USDC.address;
      const swaps = [
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000376',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [tokenIn, pool1Bpt, DAI.address, USDC.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const batchSwapFirst = orderedActions[0] as BatchSwapAction;
      const exit = orderedActions[1] as ExitAction;
      const batchSwapSecond = orderedActions[2] as BatchSwapAction;
      expect(orderedActions.length).to.eq(3);
      expect(batchSwapFirst.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapFirst.minOut).to.eq('0');
      expect(batchSwapFirst.opRef.length).to.eq(1);
      expect(batchSwapFirst.opRef[0].index).to.eq(1);
      expect(batchSwapFirst.swaps.length).to.eq(1);
      expect(batchSwapFirst.swaps[0].amount).to.eq('100000000000');
      expect(batchSwapFirst.hasTokenOut).to.be.false;
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.minOut).to.eq('0');
      expect(exit.opRef.length).to.eq(1);
      expect(exit.opRef[0].index).to.eq(2);
      expect(exit.amountIn).to.eq(batchSwapFirst.opRef[0].key.toString());
      expect(exit.actionStep).to.eq(ActionStep.Middle);
      expect(batchSwapSecond.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapSecond.opRef.length).to.eq(0);
      expect(batchSwapSecond.swaps.length).to.eq(1);
      expect(batchSwapSecond.swaps[0].amount).to.eq(
        exit.opRef[0].key.toString()
      );
      expect(batchSwapSecond.minOut).to.eq(returnAmount);
      expect(batchSwapSecond.hasTokenOut).to.be.true;
    });
    it('exact in, ending in two joins', async () => {
      // e.g.
      //    USDT[swap]DAI
      //    DAI[join]BPT
      //    USDT[swap]USDC
      //    USDC[join]BPT
      //    Need minOut for both which equals total
      const tokenIn = USDT.address;
      const tokenOut = pool1Bpt;
      const swaps = [
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 3,
          amount: '200000000000',
          userData: '0x',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 3,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [tokenIn, DAI.address, tokenOut, BAL.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const batchSwapFirst = orderedActions[0] as BatchSwapAction;
      const joinFirst = orderedActions[1] as JoinAction;
      const joinSecond = orderedActions[2] as JoinAction;
      expect(orderedActions.length).to.eq(3);
      expect(batchSwapFirst.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapFirst.minOut).to.eq('0');
      expect(batchSwapFirst.opRef.length).to.eq(2);
      expect(batchSwapFirst.opRef[0].index).to.eq(1);
      expect(batchSwapFirst.opRef[1].index).to.eq(3);
      expect(batchSwapFirst.swaps.length).to.eq(2);
      expect(batchSwapFirst.swaps[0].amount).to.eq('100000000000');
      expect(batchSwapFirst.swaps[1].amount).to.eq('200000000000');
      expect(batchSwapFirst.hasTokenOut).to.be.false;
      expect(joinFirst.type).to.eq(ActionType.Join);
      expect(joinFirst.amountIn).to.eq(batchSwapFirst.opRef[0].key.toString());
      expect(joinFirst.actionStep).to.eq(ActionStep.TokenOut);
      expect(joinSecond.type).to.eq(ActionType.Join);
      expect(joinSecond.amountIn).to.eq(batchSwapFirst.opRef[1].key.toString());
      expect(joinSecond.actionStep).to.eq(ActionStep.TokenOut);
      expect(joinFirst.minOut).to.not.eq(joinSecond.minOut); // TODO - Can't be same for both
    });
    it('exact in, ending in two exits', async () => {
      // e.g.
      //    USDT[swap]DAI
      //    DAI[swap]BPT
      //    BPT[exit]weth
      //    USDT[swap]USDC
      //    USDC[swap]BPT
      //    BPT[exit]weth
      //    Need minOut for both which equals total
      const tokenIn = USDT.address;
      const tokenOut = WETH.address;
      const swaps = [
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 4,
          amount: '100000000000',
          userData: '0x',
        },
        {
          // swap
          poolId:
            '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011',
          assetInIndex: 4,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
        },
      ];
      const assets = [tokenIn, DAI.address, pool1Bpt, tokenOut, USDC.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        returnAmount
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const batchSwapFirst = orderedActions[0] as BatchSwapAction;
      const exitFirst = orderedActions[1] as ExitAction;
      const exitSecond = orderedActions[2] as ExitAction;
      console.log(orderedActions);
      expect(orderedActions.length).to.eq(3);
      expect(batchSwapFirst.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapFirst.minOut).to.eq('0');
      expect(batchSwapFirst.opRef.length).to.eq(4);
      expect(batchSwapFirst.opRef[0].index).to.eq(1);
      expect(batchSwapFirst.opRef[1].index).to.eq(2);
      expect(batchSwapFirst.opRef[2].index).to.eq(4);
      expect(batchSwapFirst.opRef[3].index).to.eq(2);
      expect(batchSwapFirst.swaps[0].amount).to.eq('100000000000');
      expect(batchSwapFirst.swaps[1].amount).to.eq('0');
      expect(batchSwapFirst.swaps[2].amount).to.eq('100000000000');
      expect(batchSwapFirst.swaps[3].amount).to.eq('0');
      expect(batchSwapFirst.hasTokenOut).to.eq(false);
      expect(exitFirst.type).to.eq(ActionType.Exit);
      expect(exitFirst.opRef.length).to.eq(0);
      expect(exitFirst.amountIn).to.eq(batchSwapFirst.opRef[1].key.toString());
      expect(exitFirst.actionStep).to.eq(ActionStep.TokenOut);
      expect(exitSecond.type).to.eq(ActionType.Exit);
      expect(exitSecond.opRef.length).to.eq(0);
      expect(exitSecond.amountIn).to.eq(batchSwapFirst.opRef[3].key.toString());
      expect(exitSecond.actionStep).to.eq(ActionStep.TokenOut);
      expect(exitFirst.minOut).to.not.eq(exitSecond.minOut); // TODO - Can't be same for both
      expect(exitSecond.minOut).to.eq('94961515248180000000000');
      expect(orderedActions[5].minOut).to.eq('94961515248180000000000');
    });
  });
});

async function getSwapInfo(
  tokenIn: string,
  tokenOut: string,
  swapType: SwapTypes,
  pools: any,
  swapAmount: BigNumber,
  useBpts?: boolean
) {
  const network = Network.MAINNET;
  const rpcUrl = 'http://127.0.0.1:8545';
  const maxPools = 4;
  const gasPrice = BigNumber.from('0');
  const sdkConfig = {
    network,
    rpcUrl,
    sor: {
      tokenPriceService: new MockTokenPriceService(),
      poolDataService: new MockPoolDataService(pools),
      fetchOnChainBalances: true,
    },
  };
  const balancer = new BalancerSDK(sdkConfig);
  await balancer.sor.fetchPools();
  const swapInfo: SwapInfo = await balancer.sor.getSwaps(
    tokenIn,
    tokenOut,
    swapType,
    swapAmount,
    {
      gasPrice,
      maxPools,
      timestamp: 0,
      poolTypeFilter: PoolFilter.All,
    },
    useBpts
  );
  return swapInfo;
}
