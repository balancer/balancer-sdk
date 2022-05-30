import { formatUnits, parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';

import { bnum } from '@/lib/utils';

function slippageBasisPoints(slippage: string): string {
    return bnum(slippage).times(10000).toString();
}

function minusSlippage(
    _amount: string,
    decimals: number,
    slippage: string
): string {
    let amount = parseUnits(_amount, decimals).toString();
    amount = minusSlippageScaled(amount, slippage);

    return formatUnits(amount, decimals);
}

function minusSlippageScaled(amount: string, slippage: string): string {
    const delta = bnum(amount)
        .times(slippageBasisPoints(slippage))
        .div(10000)
        .dp(0, OldBigNumber.ROUND_UP);

    return bnum(amount).minus(delta).toString();
}

function addSlippage(
    _amount: string,
    decimals: number,
    slippage: string
): string {
    let amount = parseUnits(_amount, decimals).toString();
    amount = addSlippageScaled(amount, slippage);

    return formatUnits(amount, decimals).toString();
}

function addSlippageScaled(amount: string, slippage: string): string {
    const delta = bnum(amount)
        .times(slippageBasisPoints(slippage))
        .div(10000)
        .dp(0, OldBigNumber.ROUND_DOWN);

    return bnum(amount).plus(delta).toString();
}

export default {
    minusSlippage,
    minusSlippageScaled,
    addSlippage,
    addSlippageScaled,
};
