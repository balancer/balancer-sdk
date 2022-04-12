import { Factory } from 'fishery';
import { SwapInfo, SwapV2 } from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

const swapV2 = Factory.define<SwapV2>(() => ({
    poolId: '0xe2957c36816c1033e15dd3149ddf2508c3cfe79076ce4bde6cb3ecd34d4084b4',
    assetInIndex: 0,
    assetOutIndex: 1,
    amount: '1000000000000000000',
    userData: '0x',
}));

const swapInfo = Factory.define<SwapInfo>(() => ({
    swaps: [swapV2.build()],
    tokenAddresses: [
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x0000000000000000000000000000000000000000',
    ],
    tokenIn: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    tokenOut: '0x0000000000000000000000000000000000000000',
    marketSp: '1',
    swapAmount: BigNumber.from('1000000000000000000'),
    swapAmountForSwaps: BigNumber.from('1000000000000000000'),
    returnAmount: BigNumber.from('1000000000000000000'),
    returnAmountFromSwaps: BigNumber.from('1000000000000000000'),
    returnAmountConsideringFees: BigNumber.from('1000000000000000000'),
}));

export { swapInfo, swapV2 };
