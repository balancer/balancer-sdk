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
  getNumberOfOutputActions,
} from './joinAndExit';

import poolsList from '@/test/lib/joinExitPools.json';
import { Network } from '@/types';
import { BalancerSDK } from '../sdk.module';
import { OutputReference } from '../relayer/types';

const pool1Bpt = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56';
const DAI = ADDRESSES[Network.MAINNET].DAI;
const USDT = ADDRESSES[Network.MAINNET].USDT;
const BAL = ADDRESSES[Network.MAINNET].BAL;
const WETH = ADDRESSES[Network.MAINNET].WETH;
const USDC = ADDRESSES[Network.MAINNET].USDC;
const auraBAL = ADDRESSES[Network.MAINNET].auraBal;
const BAL8020BPT = ADDRESSES[Network.MAINNET].BAL8020BPT;
const slippage = '0';

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
  const pools = cloneDeep(poolsList.pools);
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const relayer = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';

  context('getActions', () => {
    it('token->BPT (swap + join>swap), exact in', async () => {
      const tokenIn = DAI.address;
      const tokenOut = USDT.address;
      const swapType = SwapTypes.SwapExactIn;
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
        swapType,
        tokenIn,
        tokenOut,
        swapWithJoinExit.swaps,
        swapWithJoinExit.tokenAddresses,
        slippage,
        pools,
        user,
        relayer
      );
      const firstSwap = actions[0] as SwapAction;
      const firstJoin = actions[1] as JoinAction;
      const secondSwap = actions[2] as SwapAction;
      expect(actions.length).to.eq(swapWithJoinExit.swaps.length);
      const expectedFirstSwap: SwapAction = {
        type: ActionType.Swap,
        swap: swapWithJoinExit.swaps[0],
        opRef: [],
        amountIn: swapWithJoinExit.swaps[0].amount,
        hasTokenIn: true,
        hasTokenOut: true,
        fromInternal: false,
        toInternal: false,
        sender: user,
        receiver: user,
        isBptIn: false,
        assets: swapWithJoinExit.tokenAddresses,
        minOut: swapWithJoinExit.swaps[0].returnAmount ?? '0',
      };
      const expectedSecondSwap: SwapAction = {
        type: ActionType.Swap,
        swap: swapWithJoinExit.swaps[2],
        opRef: [],
        amountIn: firstJoin.opRef.key.toString(),
        hasTokenIn: false,
        hasTokenOut: true,
        fromInternal: false,
        toInternal: false,
        sender: relayer,
        receiver: user,
        isBptIn: true,
        assets: swapWithJoinExit.tokenAddresses,
        minOut: swapWithJoinExit.swaps[2].returnAmount ?? '0',
      };
      expect(firstSwap).to.deep.eq(expectedFirstSwap);
      expect(secondSwap).to.deep.eq(expectedSecondSwap);

      const expectedJoin: JoinAction = {
        type: ActionType.Join,
        poolId: swapWithJoinExit.swaps[1].poolId,
        tokenIn:
          swapWithJoinExit.tokenAddresses[
            swapWithJoinExit.swaps[1].assetInIndex
          ],
        bpt: swapWithJoinExit.tokenAddresses[
          swapWithJoinExit.swaps[1].assetOutIndex
        ],
        opRef: {
          index: 2,
          key: BigNumber.from(
            '0xba10000000000000000000000000000000000000000000000000000000000000'
          ),
        },
        amountIn: swapWithJoinExit.swaps[1].amount,
        actionStep: ActionStep.TokenIn,
        minOut: '0',
        assets: swapWithJoinExit.tokenAddresses,
        sender: user,
        receiver: relayer,
        fromInternal: false,
      };
      expect(firstJoin).to.deep.eq(expectedJoin);
    });
    it('BPT->token (swap>exit), exact in', async () => {
      const tokenIn = USDT.address;
      const tokenOut = DAI.address;
      const swapType = SwapTypes.SwapExactIn;
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
        swapType,
        tokenIn,
        tokenOut,
        swapWithJoinExit.swaps,
        swapWithJoinExit.tokenAddresses,
        slippage,
        pools,
        user,
        relayer
      );
      const swap = actions[0] as SwapAction;
      const exit = actions[1] as ExitAction;
      expect(actions.length).to.eq(swapWithJoinExit.swaps.length);
      const expectedSwap: SwapAction = {
        type: ActionType.Swap,
        swap: swapWithJoinExit.swaps[0],
        opRef: [
          {
            index: 1,
            key: BigNumber.from(
              '0xba10000000000000000000000000000000000000000000000000000000000000'
            ),
          },
        ],
        amountIn: swapWithJoinExit.swaps[0].amount,
        hasTokenIn: true,
        hasTokenOut: false,
        fromInternal: false,
        toInternal: false,
        sender: user,
        receiver: relayer,
        isBptIn: false,
        assets: swapWithJoinExit.tokenAddresses,
        minOut: '0',
      };
      expect(swap).to.deep.eq(expectedSwap);
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.opRef.length).to.eq(0);
      expect(exit.amountIn).to.eq(swap.opRef[0].key.toString());
      expect(exit.minOut).to.eq(swapWithJoinExit.returnAmount.toString());
    });
  });
  context('orderActions', () => {
    it('exact in, join', async () => {
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '639359779510000000000000',
        },
      ];
      const assets = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
      ];
      const returnAmount = '639359779510000000000000';
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const join = orderedActions[0] as JoinAction;
      const count = getNumberOfOutputActions(orderedActions);
      const expectedJoin: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[0].poolId,
        tokenIn: assets[swaps[0].assetInIndex],
        bpt: assets[swaps[0].assetOutIndex],
        opRef: {} as OutputReference,
        amountIn: swaps[0].amount,
        actionStep: ActionStep.Direct,
        minOut: returnAmount,
        assets,
        sender: user,
        receiver: user,
        fromInternal: false,
      };
      expect(orderedActions.length).to.eq(actions.length);
      expect(count).to.eq(1);
      expect(join).to.deep.eq(expectedJoin);
    });
    it('exact in, exit', async () => {
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '2557439736413850000000000',
        },
      ];
      const assets = [
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ];
      const returnAmount = '2557439736413850000000000';
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const exit = orderedActions[0] as ExitAction;
      expect(orderedActions.length).to.eq(actions.length);
      expect(exit.type).to.eq(ActionType.Exit);
      expect(exit.opRef.length).to.eq(0);
      expect(exit.amountIn).to.eq(swapAmount);
      expect(exit.minOut).to.eq(returnAmount);
      expect(exit.actionStep).to.eq(ActionStep.Direct);
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, swap and join>swap', async () => {
      // e.g.
      //    DAI[swap]USDT (from External, to External)
      //    DAI[join]BPT (from External, to Internal)
      //    BPT[swap]USDT (from Internal, to External)
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '400000000000',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 0,
          assetOutIndex: 2,
          amount: '300596643487857807229',
          userData: '0x',
          returnAmount: '7777777',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 2,
          assetOutIndex: 1,
          amount: '0',
          userData: '0x',
          returnAmount: '600000000000',
        },
      ];
      const assets = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
      ];
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const join = orderedActions[0] as JoinAction;
      const batchSwapDirect = orderedActions[1] as BatchSwapAction;
      const batchSwapFromJoin = orderedActions[2] as BatchSwapAction;
      expect(orderedActions.length).to.eq(3);
      expect(batchSwapDirect.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapDirect.hasTokenOut).to.eq(true);
      expect(batchSwapDirect.opRef.length).to.eq(0);
      expect(batchSwapDirect.swaps.length).to.eq(1);
      expect(batchSwapDirect.swaps[0].amount).to.eq(
        '1279699403356512142192771'
      );
      expect(batchSwapFromJoin.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapFromJoin.hasTokenOut).to.eq(true);
      expect(batchSwapFromJoin.opRef.length).to.eq(0);
      expect(batchSwapFromJoin.swaps.length).to.eq(1);
      expect(batchSwapFromJoin.swaps[0].amount).to.eq(
        join.opRef.key.toString()
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(2);
      const expectedJoin: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[1].poolId,
        tokenIn: assets[swaps[1].assetInIndex],
        bpt: assets[swaps[1].assetOutIndex],
        opRef: {
          index: 2,
          key: BigNumber.from(
            '0xba10000000000000000000000000000000000000000000000000000000000000'
          ),
        },
        amountIn: swaps[1].amount,
        actionStep: ActionStep.TokenIn,
        minOut: '0',
        assets,
        sender: user,
        receiver: relayer,
        fromInternal: false,
      };
      expect(expectedJoin).to.deep.eq(join);
    });
    it('exact in, swap>exit', async () => {
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '7777777',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
          returnAmount: '94961515248180000000000',
        },
      ];
      const assets = [
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
      ];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
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
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, swap>join>swap', async () => {
      // e.g.
      //    USDT[swap]DAI (from External, to Internal)
      //    DAI[join]BPT (from/to Internal)
      //    BPT[swap]USDC (from Internal, to External)
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '1111111',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
          returnAmount: '2222222',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000376',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
          returnAmount: '94961515248180000000000',
        },
      ];
      const assets = [tokenIn, DAI.address, pool1Bpt, USDC.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
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
      expect(batchSwapSecond.type).to.eq(ActionType.BatchSwap);
      expect(batchSwapSecond.opRef.length).to.eq(0);
      expect(batchSwapSecond.swaps.length).to.eq(1);
      expect(batchSwapSecond.swaps[0].amount).to.eq(join.opRef.key.toString());
      expect(batchSwapSecond.hasTokenOut).to.be.true;
      const expectedJoin: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[1].poolId,
        tokenIn: assets[swaps[1].assetInIndex],
        bpt: assets[swaps[1].assetOutIndex],
        opRef: {
          index: 2,
          key: BigNumber.from(
            '0xba10000000000000000000000000000000000000000000000000000000000001'
          ),
        },
        amountIn: batchSwapFirst.opRef[0].key.toString(),
        actionStep: ActionStep.Middle,
        minOut: '0',
        assets,
        sender: relayer,
        receiver: relayer,
        fromInternal: true,
      };
      expect(expectedJoin).to.deep.eq(join);
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, swap>exit>swap', async () => {
      // e.g.
      //    USDT[swap]BPT
      //    BPT[exit]DAI
      //    DAI[swap]USDC
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '1111111',
        },
        {
          // exit
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
          returnAmount: '2222222',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000376',
          assetInIndex: 2,
          assetOutIndex: 3,
          amount: '0',
          userData: '0x',
          returnAmount: '94961515248180000000000',
        },
      ];
      const assets = [tokenIn, pool1Bpt, DAI.address, USDC.address];
      const returnAmount = '94961515248180000000000';
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
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
      expect(batchSwapSecond.hasTokenOut).to.be.true;
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, join>swap + swap', async () => {
      // e.g.
      //    WETH[join]BPT[Swap]auraBAL
      //    WETH[Swap]auraBAL
      const swapType = SwapTypes.SwapExactIn;
      const tokenIn = WETH.address;
      const tokenOut = auraBAL.address;
      const swaps = [
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 0,
          assetOutIndex: 1,
          amount: '7000000',
          userData: '0x',
          returnAmount: '1111111',
        },
        {
          // swap
          poolId:
            '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '200000000000',
          userData: '0x',
          returnAmount: '6000000',
        },
        {
          // swap
          poolId:
            '0x0578292cb20a443ba1cde459c985ce14ca2bdee5000100000000000000000269',
          assetInIndex: 0,
          assetOutIndex: 2,
          amount: '3000000',
          userData: '0x',
          returnAmount: '40000000',
        },
      ];
      const assets = [tokenIn, BAL8020BPT.address, tokenOut];
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );

      const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);
      const join = orderedActions[0] as JoinAction;
      const batchSwapFirst = orderedActions[1] as BatchSwapAction;
      const batchSwapSecond = orderedActions[2] as BatchSwapAction;
      expect(orderedActions.length).to.eq(3);
      expect(batchSwapFirst.hasTokenOut).to.eq(true);
      expect(batchSwapFirst.opRef.length).to.eq(0);
      expect(batchSwapFirst.swaps.length).to.eq(1);
      expect(batchSwapFirst.swaps[0].amount).to.eq(join.opRef.key.toString());
      expect(batchSwapSecond.hasTokenOut).to.eq(true);
      expect(batchSwapSecond.opRef.length).to.eq(0);
      expect(batchSwapSecond.swaps.length).to.eq(1);
      expect(batchSwapSecond.swaps[0].amount).to.eq('3000000');
      const expectedJoin: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[0].poolId,
        tokenIn: assets[swaps[0].assetInIndex],
        bpt: assets[swaps[0].assetOutIndex],
        opRef: {
          index: 1,
          key: BigNumber.from(
            '0xba10000000000000000000000000000000000000000000000000000000000000'
          ),
        },
        amountIn: swaps[0].amount,
        actionStep: ActionStep.TokenIn,
        minOut: '0',
        assets,
        sender: user,
        receiver: relayer,
        fromInternal: false,
      };
      expect(expectedJoin).to.deep.eq(join);
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(2);
    });
    it('exact in, ending in two joins', async () => {
      // e.g.
      //    USDT[swap]DAI (external, internal)
      //    DAI[join]BPT (internal, external)
      //    USDT[swap]USDC (external, internal)
      //    USDC[join]BPT (internal, external)
      //    Need minOut for both which equals total
      //    Swaps can be batched together and executed before joins
      const swapType = SwapTypes.SwapExactIn;
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
          returnAmount: '1111111',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 1,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
          returnAmount: '6000000',
        },
        {
          // swap
          poolId:
            '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
          assetInIndex: 0,
          assetOutIndex: 3,
          amount: '200000000000',
          userData: '0x',
          returnAmount: '1111111',
        },
        {
          // join
          poolId:
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
          assetInIndex: 3,
          assetOutIndex: 2,
          amount: '0',
          userData: '0x',
          returnAmount: '4000000',
        },
      ];
      const assets = [tokenIn, DAI.address, tokenOut, BAL.address];
      const actions = getActions(
        swapType,
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
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
      expect(batchSwapFirst.hasTokenIn).to.eq(true);
      expect(batchSwapFirst.hasTokenOut).to.eq(false);
      expect(batchSwapFirst.hasTokenOut).to.eq(false);
      const expectedJoinFirst: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[1].poolId,
        tokenIn: assets[swaps[1].assetInIndex],
        bpt: assets[swaps[1].assetOutIndex],
        opRef: {} as OutputReference,
        amountIn: batchSwapFirst.opRef[0].key.toString(),
        actionStep: ActionStep.TokenOut,
        minOut: swaps[1].returnAmount,
        assets,
        sender: relayer,
        receiver: user,
        fromInternal: true,
      };
      expect(expectedJoinFirst).to.deep.eq(joinFirst);
      const expectedJoinSecond: JoinAction = {
        type: ActionType.Join,
        poolId: swaps[3].poolId,
        tokenIn: assets[swaps[3].assetInIndex],
        bpt: assets[swaps[3].assetOutIndex],
        opRef: {} as OutputReference,
        amountIn: batchSwapFirst.opRef[1].key.toString(),
        actionStep: ActionStep.TokenOut,
        minOut: swaps[3].returnAmount,
        assets,
        sender: relayer,
        receiver: user,
        fromInternal: true,
      };
      expect(expectedJoinSecond).to.deep.eq(joinSecond);
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(2);
    });
    // it('exact in, ending in two exits', async () => {
    //   // e.g.
    //   //    USDT[swap]DAI (external, internal)
    //   //    DAI[swap]BPT (internal, internal)
    //   //    BPT[exit]weth (internal, external)
    //   //    USDT[swap]USDC (external, internal)
    //   //    USDC[swap]BPT (internal, internal)
    //   //    BPT[exit]weth (internal, external)
    //   //    Need minOut for both which equals total
    //   const swapType = SwapTypes.SwapExactIn;
    //   const tokenIn = USDT.address;
    //   const tokenOut = WETH.address;
    //   const swaps = [
    //     {
    //       // swap
    //       poolId:
    //         '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
    //       assetInIndex: 0,
    //       assetOutIndex: 1,
    //       amount: '100000000000',
    //       userData: '0x',
    //       returnAmount: '1111111',
    //     },
    //     {
    //       // swap
    //       poolId:
    //         '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011',
    //       assetInIndex: 1,
    //       assetOutIndex: 2,
    //       amount: '0',
    //       userData: '0x',
    //       returnAmount: '2222222',
    //     },
    //     {
    //       // exit
    //       poolId:
    //         '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
    //       assetInIndex: 2,
    //       assetOutIndex: 3,
    //       amount: '0',
    //       userData: '0x',
    //       returnAmount: '6000000',
    //     },
    //     {
    //       // swap
    //       poolId:
    //         '0xf88278315a1d5ace3aaa41712f60602e069208e6000200000000000000000375',
    //       assetInIndex: 0,
    //       assetOutIndex: 4,
    //       amount: '100000000000',
    //       userData: '0x',
    //       returnAmount: '3333333',
    //     },
    //     {
    //       // swap
    //       poolId:
    //         '0x4626d81b3a1711beb79f4cecff2413886d461677000200000000000000000011',
    //       assetInIndex: 4,
    //       assetOutIndex: 2,
    //       amount: '0',
    //       userData: '0x',
    //       returnAmount: '4444444',
    //     },
    //     {
    //       // exit
    //       poolId:
    //         '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
    //       assetInIndex: 2,
    //       assetOutIndex: 3,
    //       amount: '0',
    //       userData: '0x',
    //       returnAmount: '4000000',
    //     },
    //   ];
    //   const assets = [tokenIn, DAI.address, pool1Bpt, tokenOut, USDC.address];
    //   const actions = getActions(
    //     swapType,
    //     tokenIn,
    //     tokenOut,
    //     swaps,
    //     assets,
    //     slippage
    //   );
    //   const orderedActions = orderActions(actions, tokenIn, tokenOut, assets);

    //   const batchSwapFirst = orderedActions[0] as BatchSwapAction;
    //   const batchSwapSecond = orderedActions[1] as BatchSwapAction;
    //   const exitFirst = orderedActions[2] as ExitAction;
    //   const exitSecond = orderedActions[3] as ExitAction;
    //   console.log(orderedActions);
    //   expect(orderedActions.length).to.eq(4);
    //   expect(batchSwapFirst.type).to.eq(ActionType.BatchSwap);
    //   expect(batchSwapFirst.minOut).to.eq('0');
    //   expect(batchSwapFirst.opRef.length).to.eq(4);
    //   expect(batchSwapFirst.opRef[0].index).to.eq(1);
    //   expect(batchSwapFirst.opRef[1].index).to.eq(2);
    //   expect(batchSwapFirst.opRef[2].index).to.eq(4);
    //   expect(batchSwapFirst.opRef[3].index).to.eq(2);
    //   expect(batchSwapFirst.swaps[0].amount).to.eq('100000000000');
    //   expect(batchSwapFirst.swaps[1].amount).to.eq('0');
    //   expect(batchSwapFirst.swaps[2].amount).to.eq('100000000000');
    //   expect(batchSwapFirst.swaps[3].amount).to.eq('0');
    //   expect(batchSwapFirst.hasTokenOut).to.eq(false);
    //   expect(exitFirst.type).to.eq(ActionType.Exit);
    //   expect(exitFirst.opRef.length).to.eq(0);
    //   expect(exitFirst.amountIn).to.eq(batchSwapFirst.opRef[1].key.toString());
    //   expect(exitFirst.actionStep).to.eq(ActionStep.TokenOut);
    //   expect(exitSecond.type).to.eq(ActionType.Exit);
    //   expect(exitSecond.opRef.length).to.eq(0);
    //   expect(exitSecond.amountIn).to.eq(batchSwapFirst.opRef[3].key.toString());
    //   expect(exitSecond.actionStep).to.eq(ActionStep.TokenOut);
    //   const count = getNumberOfOutputActions(orderedActions);
    //   expect(count).to.eq(2);
    //   expect(exitFirst.minOut).to.not.eq(exitSecond.minOut); // TODO - Can't be same for both
    //   expect(exitSecond.minOut).to.eq('94961515248180000000000');
    //   expect(orderedActions[5].minOut).to.eq('94961515248180000000000');
    // });
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
