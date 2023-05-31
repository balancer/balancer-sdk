// yarn test:only ./src/modules/swaps/joinExit/joinAndExit.spec.ts
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { MaxInt256 } from '@ethersproject/constants';
import { cloneDeep } from 'lodash';
import { SwapV2 } from '@balancer-labs/sor';
import { getActions } from './joinAndExit';
import {
  ActionStep,
  ActionType,
  Swap,
  Exit,
  Join,
  orderActions,
  Actions,
} from './actions';
import { Network } from '@/types';
import { Relayer, OutputReference } from '@/modules/relayer/relayer.module';
import { ADDRESSES } from '@/test/lib/constants';

import poolsList from '@/test/lib/joinExitPools.json';

const pool1Bpt = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56';
const DAI = ADDRESSES[Network.MAINNET].DAI;
const USDT = ADDRESSES[Network.MAINNET].USDT;
const BAL = ADDRESSES[Network.MAINNET].BAL;
const WETH = ADDRESSES[Network.MAINNET].WETH;
const USDC = ADDRESSES[Network.MAINNET].USDC;
const auraBAL = ADDRESSES[Network.MAINNET].auraBal;
const BAL8020BPT = ADDRESSES[Network.MAINNET].BAL8020BPT;
const slippage = '0';

interface JoinExpected {
  type: ActionType.Join;
  poolId: string;
  tokenIn: string;
  minOut: string;
  opRef: OutputReference;
  nextOpRefKey: number;
  amountIn: string;
  sender: string;
  receiver: string;
  fromInternal: boolean;
  hasTokenIn: boolean;
  hasTokenOut: boolean;
}

interface ExitExpected {
  type: ActionType.Exit;
  poolId: string;
  tokenOut: string;
  minOut: string;
  opRef: OutputReference;
  nextOpRefKey: number;
  amountIn: string;
  sender: string;
  receiver: string;
  toInternal: boolean;
  hasTokenIn: boolean;
  hasTokenOut: boolean;
}

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

function getActionOutputRef(
  actionStep: ActionStep,
  tokenOutIndex: number,
  opRefKey: number
): [OutputReference, number] {
  let opRef: OutputReference = {} as OutputReference;
  if (actionStep === ActionStep.TokenIn || actionStep === ActionStep.Middle) {
    opRef = getOutputRef(opRefKey, tokenOutIndex);
    opRefKey++;
  }
  return [opRef, opRefKey];
}

function checkJoin(
  join: Join,
  swap: SwapV2,
  assets: string[],
  amountIn: string,
  returnAmount: string,
  step: ActionStep,
  user: string,
  relayer: string
) {
  let sender: string,
    receiver: string,
    fromInternal: boolean,
    hasTokenIn: boolean,
    hasTokenOut: boolean,
    nextOpRefKey: number,
    opRef: OutputReference;
  if (step === ActionStep.Direct) {
    sender = user;
    receiver = user;
    fromInternal = false;
    hasTokenIn = true;
    hasTokenOut = true;
    nextOpRefKey = join.opRefKey;
    opRef = {} as OutputReference;
  } else if (step === ActionStep.Middle) {
    sender = relayer;
    receiver = relayer;
    fromInternal = true;
    hasTokenIn = false;
    hasTokenOut = false;
    [opRef, nextOpRefKey] = getActionOutputRef(
      step,
      swap.assetOutIndex,
      join.opRefKey
    );
  } else if (step === ActionStep.TokenIn) {
    sender = user;
    receiver = relayer;
    fromInternal = false;
    hasTokenIn = true;
    hasTokenOut = false;
    [opRef, nextOpRefKey] = getActionOutputRef(
      step,
      swap.assetOutIndex,
      join.opRefKey
    );
  } else {
    sender = relayer;
    receiver = user;
    fromInternal = true;
    hasTokenIn = false;
    hasTokenOut = true;
    [opRef, nextOpRefKey] = getActionOutputRef(
      step,
      swap.assetOutIndex,
      join.opRefKey
    );
  }
  const expectedJoin: JoinExpected = {
    type: ActionType.Join,
    poolId: swap.poolId,
    tokenIn: assets[swap.assetInIndex],
    opRef,
    amountIn,
    minOut: returnAmount,
    sender,
    receiver,
    fromInternal,
    hasTokenIn,
    hasTokenOut,
    nextOpRefKey,
  };
  expect(join.type).to.eq(expectedJoin.type);
  expect(join.poolId).to.eq(expectedJoin.poolId);
  expect(join.tokenIn).to.eq(expectedJoin.tokenIn);
  expect(join.minOut).to.eq(expectedJoin.minOut);
  expect(join.opRef).to.deep.eq(expectedJoin.opRef);
  expect(join.nextOpRefKey).to.eq(expectedJoin.nextOpRefKey);
  expect(join.amountIn).to.eq(expectedJoin.amountIn);
  expect(join.sender).to.eq(expectedJoin.sender);
  expect(join.receiver).to.eq(expectedJoin.receiver);
  expect(join.fromInternal).to.eq(expectedJoin.fromInternal);
  expect(join.hasTokenIn).to.eq(expectedJoin.hasTokenIn);
  expect(join.hasTokenOut).to.eq(expectedJoin.hasTokenOut);
}

function checkExit(
  exit: Exit,
  swap: SwapV2,
  assets: string[],
  amountIn: string,
  returnAmount: string,
  step: ActionStep,
  user: string,
  relayer: string
) {
  let sender: string,
    receiver: string,
    toInternal: boolean,
    hasTokenIn: boolean,
    hasTokenOut: boolean,
    nextOpRefKey: number,
    opRef: OutputReference;
  if (step === ActionStep.Direct) {
    sender = user;
    receiver = user;
    toInternal = false;
    hasTokenIn = true;
    hasTokenOut = true;
    nextOpRefKey = exit.opRefKey;
    opRef = {} as OutputReference;
  } else if (step === ActionStep.Middle) {
    sender = relayer;
    receiver = relayer;
    toInternal = true;
    hasTokenIn = false;
    hasTokenOut = false;
    [opRef, nextOpRefKey] = getActionOutputRef(
      step,
      swap.assetOutIndex,
      exit.opRefKey
    );
  } else if (step === ActionStep.TokenIn) {
    sender = user;
    receiver = relayer;
    hasTokenIn = true;
    hasTokenOut = false;
    toInternal = true;
    [opRef, nextOpRefKey] = getActionOutputRef(
      step,
      swap.assetOutIndex,
      exit.opRefKey
    );
  } else {
    sender = relayer;
    receiver = user;
    toInternal = false;
    hasTokenIn = false;
    hasTokenOut = true;
    nextOpRefKey = exit.opRefKey;
    opRef = {} as OutputReference;
  }
  const expectedExit: ExitExpected = {
    type: ActionType.Exit,
    poolId: swap.poolId,
    tokenOut: assets[swap.assetOutIndex],
    opRef,
    amountIn,
    minOut: returnAmount,
    sender,
    receiver,
    toInternal,
    hasTokenIn,
    hasTokenOut,
    nextOpRefKey,
  };
  expect(exit.type).to.eq(expectedExit.type);
  expect(exit.poolId).to.eq(expectedExit.poolId);
  expect(exit.tokenOut).to.eq(expectedExit.tokenOut);
  expect(exit.minOut).to.eq(expectedExit.minOut);
  expect(exit.opRef).to.deep.eq(expectedExit.opRef);
  expect(exit.nextOpRefKey).to.deep.eq(expectedExit.nextOpRefKey);
  expect(exit.amountIn).to.eq(expectedExit.amountIn);
  expect(exit.sender).to.eq(expectedExit.sender);
  expect(exit.receiver).to.eq(expectedExit.receiver);
  expect(exit.toInternalBalance).to.eq(expectedExit.toInternal);
  expect(exit.hasTokenIn).to.eq(expectedExit.hasTokenIn);
  expect(exit.hasTokenOut).to.eq(expectedExit.hasTokenOut);
}

function getOutputRefs(
  sorSwaps: SwapV2[],
  steps: ActionStep[],
  initialKey: number
): { outputRefs: OutputReference[]; nextKey: number } {
  const opRefs: OutputReference[] = [];
  let key = initialKey;
  sorSwaps.forEach((swap, i) => {
    const [opRefAction, nextOpRefKeyAction] = getActionOutputRef(
      steps[i],
      swap.assetOutIndex,
      key
    );
    if (Object.keys(opRefAction).length !== 0) {
      opRefs.push(opRefAction);
      key = nextOpRefKeyAction;
    }
  });
  return {
    outputRefs: opRefs,
    nextKey: key,
  };
}

function checkSwap(
  swap: Swap,
  sorSwaps: SwapV2[],
  assets: string[],
  amountIn: string,
  returnAmount: string,
  steps: ActionStep[],
  user: string,
  relayer: string,
  isBptIn: boolean,
  isBptOut: boolean
) {
  let opRef: OutputReference[];
  const firstSwap = sorSwaps[0];
  const lastSwap = sorSwaps[sorSwaps.length - 1];
  const hasTokenIn = steps.some(
    (s) => s === ActionStep.Direct || s === ActionStep.TokenIn
  );
  const hasTokenOut = steps.some(
    (s) => s === ActionStep.Direct || s === ActionStep.TokenOut
  );
  const sender = hasTokenIn ? user : relayer;
  const receiver = hasTokenOut ? user : relayer;
  // Can't do an exit from internal
  const toInternal = steps.every(
    (s) => !isBptOut && (s === ActionStep.Middle || s === ActionStep.TokenIn)
  );
  // Can't do a join from internal
  const fromInternal = steps.every(
    (s) => !isBptIn && (s === ActionStep.Middle || s === ActionStep.TokenOut)
  );
  const limits = assets.map(() => BigNumber.from('0'));
  if (hasTokenIn) limits[firstSwap.assetInIndex] = BigNumber.from(amountIn);
  else limits[firstSwap.assetInIndex] = MaxInt256;
  if (hasTokenOut)
    limits[lastSwap.assetOutIndex] = BigNumber.from(returnAmount).mul(-1);
  if (toInternal) limits[lastSwap.assetOutIndex] = BigNumber.from(0);

  if (steps[0] === ActionStep.Direct) {
    const i = getOutputRefs(sorSwaps, steps, swap.opRefKey);
    opRef = i.outputRefs;
  } else if (steps[0] === ActionStep.Middle) {
    const i = getOutputRefs(sorSwaps, steps, swap.opRefKey);
    opRef = i.outputRefs;
  } else if (steps[0] === ActionStep.TokenIn) {
    const i = getOutputRefs(sorSwaps, steps, swap.opRefKey);
    opRef = i.outputRefs;
  } else {
    opRef = [];
  }
  const expectedSwap = {
    type: ActionType.BatchSwap,
    tokenOut: assets[lastSwap.assetOutIndex],
    amountIn,
    minOut: returnAmount,
    sender,
    receiver,
    toInternal,
    fromInternal,
    hasTokenIn,
    hasTokenOut,
    limits,
    opRef,
  };
  expect(swap.swaps.length).to.eq(sorSwaps.length);
  expect(swap.type).to.eq(expectedSwap.type);
  expect(swap.hasTokenIn).to.eq(expectedSwap.hasTokenIn);
  expect(swap.hasTokenOut).to.eq(expectedSwap.hasTokenOut);
  expect(swap.minOut).to.eq(expectedSwap.minOut);
  expect(swap.opRef).to.deep.eq(expectedSwap.opRef);
  expect(swap.amountIn).to.eq(expectedSwap.amountIn);
  expect(swap.sender).to.eq(expectedSwap.sender);
  expect(swap.receiver).to.eq(expectedSwap.receiver);
  expect(swap.fromInternal).to.eq(expectedSwap.fromInternal);
  expect(swap.toInternal).to.eq(expectedSwap.toInternal);
  expect(swap.limits.toString()).to.deep.eq(expectedSwap.limits.toString());
  expect(swap.opRef).to.deep.eq(expectedSwap.opRef);
}

describe(`Paths with join and exits.`, () => {
  const pools = cloneDeep(poolsList.pools);
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const relayer = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';

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
          returnAmount: '639359779510000000000000',
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
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      const join = orderedActions[0] as Join;
      const count = getNumberOfOutputActions(orderedActions);
      checkJoin(
        join,
        swaps[0],
        assets,
        swaps[0].amount,
        returnAmount,
        ActionStep.Direct,
        user,
        relayer
      );
      expect(orderedActions.length).to.eq(actions.length);
      expect(count).to.eq(1);
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
          returnAmount: '2557439736413850000000000',
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
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      const exit = orderedActions[0] as Exit;
      expect(orderedActions.length).to.eq(actions.length);
      checkExit(
        exit,
        swaps[0],
        assets,
        swaps[0].amount,
        returnAmount,
        ActionStep.Direct,
        user,
        relayer
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, swap and join>swap', async () => {
      // e.g.
      //    DAI[swap]USDT (from External, to External)
      //    DAI[join]BPT (from External, to Internal)
      //    BPT[swap]USDT (from Internal, to External)
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
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(3);

      const join = orderedActions[0] as Join;
      checkJoin(
        join,
        swaps[1],
        assets,
        swaps[1].amount,
        '0',
        ActionStep.TokenIn,
        user,
        relayer
      );
      const batchSwapDirect = orderedActions[1] as Swap;
      checkSwap(
        batchSwapDirect,
        [swaps[0]],
        assets,
        swaps[0].amount,
        swaps[0].returnAmount,
        [ActionStep.Direct],
        user,
        relayer,
        false,
        false
      );
      const batchSwapFromJoin = orderedActions[2] as Swap;
      checkSwap(
        batchSwapFromJoin,
        [swaps[2]],
        assets,
        join.opRef.key.toString(),
        swaps[2].returnAmount,
        [ActionStep.TokenOut],
        user,
        relayer,
        true,
        false
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(2);
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
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(2);
      const batchSwap = orderedActions[0] as Swap;
      checkSwap(
        batchSwap,
        [swaps[0]],
        assets,
        swaps[0].amount,
        '0',
        [ActionStep.TokenIn],
        user,
        relayer,
        false,
        true
      );
      const exit = orderedActions[1] as Exit;
      checkExit(
        exit,
        swaps[1],
        assets,
        batchSwap.opRef[0].key.toString(),
        swaps[1].returnAmount,
        ActionStep.TokenOut,
        user,
        relayer
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, swap>join>swap', async () => {
      // e.g.
      //    USDT[swap]DAI (from External, to Internal)
      //    DAI[join]BPT (from/to Internal)
      //    BPT[swap]USDC (from Internal, to External)
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
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(3);
      const batchSwapFirst = orderedActions[0] as Swap;
      checkSwap(
        batchSwapFirst,
        [swaps[0]],
        assets,
        swaps[0].amount,
        '0',
        [ActionStep.TokenIn],
        user,
        relayer,
        false,
        false
      );
      const join = orderedActions[1] as Join;
      checkJoin(
        join,
        swaps[1],
        assets,
        swaps[1].amount,
        '0',
        ActionStep.Middle,
        user,
        relayer
      );
      const batchSwapSecond = orderedActions[2] as Swap;
      checkSwap(
        batchSwapSecond,
        [swaps[2]],
        assets,
        join.opRef.key.toString(),
        swaps[2].returnAmount,
        [ActionStep.TokenOut],
        user,
        relayer,
        true,
        false
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
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
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(3);
      const batchSwapFirst = orderedActions[0] as Swap;
      checkSwap(
        batchSwapFirst,
        [swaps[0]],
        assets,
        swaps[0].amount,
        '0',
        [ActionStep.TokenIn],
        user,
        relayer,
        false,
        true
      );
      const exit = orderedActions[1] as Exit;
      checkExit(
        exit,
        swaps[1],
        assets,
        '0',
        '0',
        ActionStep.Middle,
        user,
        relayer
      );
      const batchSwapSecond = orderedActions[2] as Swap;
      checkSwap(
        batchSwapSecond,
        [swaps[2]],
        assets,
        exit.opRef.key.toString(),
        swaps[2].returnAmount,
        [ActionStep.TokenOut],
        user,
        relayer,
        false,
        false
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(1);
    });
    it('exact in, join>swap + swap', async () => {
      // e.g.
      //    WETH[join]BPT[Swap]auraBAL
      //    WETH[Swap]auraBAL
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
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(3);
      const join = orderedActions[0] as Join;
      checkJoin(
        join,
        swaps[0],
        assets,
        swaps[0].amount,
        '0',
        ActionStep.TokenIn,
        user,
        relayer
      );
      const batchSwapFirst = orderedActions[1] as Swap;
      checkSwap(
        batchSwapFirst,
        [swaps[1]],
        assets,
        join.opRef.key.toString(),
        swaps[1].returnAmount,
        [ActionStep.TokenOut],
        user,
        relayer,
        true,
        false
      );
      const batchSwapSecond = orderedActions[2] as Swap;
      checkSwap(
        batchSwapSecond,
        [swaps[2]],
        assets,
        swaps[2].amount,
        swaps[2].returnAmount,
        [ActionStep.Direct],
        user,
        relayer,
        true,
        false
      );
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
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );

      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(3);
      const batchSwapFirst = orderedActions[0] as Swap;
      checkSwap(
        batchSwapFirst,
        [swaps[0], swaps[2]],
        assets,
        '300000000000',
        '0',
        [ActionStep.TokenIn, ActionStep.TokenIn],
        user,
        relayer,
        false,
        false
      );
      const joinFirst = orderedActions[1] as Join;
      checkJoin(
        joinFirst,
        swaps[1],
        assets,
        batchSwapFirst.opRef[0].key.toString(),
        swaps[1].returnAmount,
        ActionStep.TokenOut,
        user,
        relayer
      );
      const joinSecond = orderedActions[2] as Join;
      checkJoin(
        joinSecond,
        swaps[3],
        assets,
        batchSwapFirst.opRef[1].key.toString(),
        swaps[3].returnAmount,
        ActionStep.TokenOut,
        user,
        relayer
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(2);
    });
    it('exact in, swap, join>swap, mulithop', async () => {
      // e.g.
      //    WETH[swap]AURABAL (external, external)
      //    WETH[join]BPT (external, relayer)
      //    BPT[swap]AURABAL (relayer, external)
      //    WETH[swap]wstETH[swap]AURABAL (external, external)
      const tokenIn = WETH.address;
      const tokenOut = auraBAL.address;
      const swaps = [
        {
          poolId:
            '0x0578292cb20a443ba1cde459c985ce14ca2bdee5000100000000000000000269', // swap
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
            '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249', // swap
          assetInIndex: 2,
          assetOutIndex: 1,
          amount: '0',
          userData: '0x',
          returnAmount: '374315221022843007278',
        },
        {
          poolId:
            '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
          assetInIndex: 0,
          assetOutIndex: 3,
          amount: '3664',
          userData: '0x',
          returnAmount: '2431',
        },
        {
          poolId:
            '0x0731399bd09ced6765ff1e0cb884bd223298a5a6000200000000000000000398',
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
      const actions = getActions(
        tokenIn,
        tokenOut,
        swaps,
        assets,
        slippage,
        pools,
        user,
        relayer
      );

      const orderedActions = orderActions(actions);
      expect(orderedActions.length).to.eq(4);

      const join = orderedActions[0] as Join;
      checkJoin(
        join,
        swaps[1],
        assets,
        swaps[1].amount,
        '0',
        ActionStep.TokenIn,
        user,
        relayer
      );
      const batchSwapDirect = orderedActions[1] as Swap;
      checkSwap(
        batchSwapDirect,
        [swaps[0]],
        assets,
        swaps[0].amount,
        swaps[0].returnAmount,
        [ActionStep.Direct],
        user,
        relayer,
        false,
        false
      );
      const batchSwapFromJoin = orderedActions[2] as Swap;
      checkSwap(
        batchSwapFromJoin,
        [swaps[2]],
        assets,
        join.opRef.key.toString(),
        swaps[2].returnAmount,
        [ActionStep.TokenOut],
        user,
        relayer,
        true,
        false
      );
      const batchSwapMultihop = orderedActions[3] as Swap;
      checkSwap(
        batchSwapMultihop,
        [swaps[3], swaps[4]],
        assets,
        swaps[3].amount,
        swaps[4].returnAmount,
        [ActionStep.TokenIn, ActionStep.TokenOut],
        user,
        relayer,
        false,
        false
      );
      const count = getNumberOfOutputActions(orderedActions);
      expect(count).to.eq(3);
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
    //   const orderedActions = orderActions(actions, tokenIn, tokenOut);

    //   const batchSwapFirst = orderedActions[0] as Swap;
    //   const batchSwapSecond = orderedActions[1] as Swap;
    //   const exitFirst = orderedActions[2] as Exit;
    //   const exitSecond = orderedActions[3] as Exit;
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

/**
 * Find the number of actions that end with tokenOut
 * @param actions
 * @returns
 */
function getNumberOfOutputActions(actions: Actions[]): number {
  let outputCount = 0;
  for (const a of actions) {
    if (a.hasTokenOut) outputCount++;
  }
  return outputCount;
}
