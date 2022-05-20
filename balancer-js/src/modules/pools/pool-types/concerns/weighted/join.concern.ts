import { Interface } from '@ethersproject/abi';
import { parseUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';

import vaultAbi from '@/lib/abi/Vault.json';
import { bnum } from '@/lib/utils';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { JoinConcern, JoinPoolData, EncodeJoinPoolInput } from '../types';
import { JoinPoolRequest } from '@/types';
import useSlippage from '@/lib/utils/useSlippage';

export class WeighedPoolJoin implements JoinConcern {
    static encodeJoinPool(params: EncodeJoinPoolInput): string {
        const vaultLibrary = new Interface(vaultAbi);

        return vaultLibrary.encodeFunctionData('joinPool', [
            params.poolId,
            params.sender,
            params.recipient,
            params.joinPoolRequest,
        ]);
    }

    static constructJoinCall(params: JoinPoolData): string {
        const {
            assets,
            maxAmountsIn,
            userData,
            fromInternalBalance,
            poolId,
            sender,
            recipient,
        } = params;

        const joinPoolRequest: JoinPoolRequest = {
            assets,
            maxAmountsIn,
            userData,
            fromInternalBalance,
        };

        const joinPoolInput: EncodeJoinPoolInput = {
            poolId,
            sender,
            recipient,
            joinPoolRequest,
        };

        const joinEncoded = WeighedPoolJoin.encodeJoinPool(joinPoolInput);
        return joinEncoded;
    }

    async exactTokensJoinPool(
        joiner: string,
        pool: SubgraphPoolBase,
        tokensIn: string[],
        amountsIn: string[],
        slippage: string
    ): Promise<string> {
        const minBPTOut = this.calcBptOutGivenExactTokensIn(
            pool,
            amountsIn,
            slippage
        ).toString();

        const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
            amountsIn,
            minBPTOut
        );

        const joinPoolData: JoinPoolData = {
            assets: tokensIn,
            maxAmountsIn: amountsIn,
            userData,
            fromInternalBalance: false,
            poolId: pool.id,
            sender: joiner,
            recipient: joiner,
            joinPoolRequest: {} as JoinPoolRequest,
        };

        const joinCall = WeighedPoolJoin.constructJoinCall(joinPoolData);

        return joinCall;
    }

    public calcBptOutGivenExactTokensIn(
        pool: SubgraphPoolBase,
        tokenAmounts: string[],
        slippage?: string
    ): OldBigNumber {
        const balances = pool.tokens.map((token) => bnum(token.balance));
        const weights = pool.tokens.map((token) => bnum(token.weight || '0')); //  TODO: validate approach of setting undefined to zero and calculation - frontend normalizes by parsing decimals
        const denormAmounts = this.denormAmounts(
            tokenAmounts,
            pool.tokens.map((token) => token.decimals)
        );
        const amounts = denormAmounts.map((a) => bnum(a.toString()));

        // console.log(this.calc.pool);
        // console.log(balances);
        // console.log(weights);
        // console.log(amounts);
        // console.log(this.calc.poolTotalSupply.toString());
        // console.log(bnum(this.calc.poolTotalSupply.toString()));
        // console.log(this.calc.poolSwapFee.toString());
        // console.log(bnum(this.calc.poolSwapFee.toString()));

        const fullBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
            balances,
            weights,
            amounts,
            bnum(pool.totalShares), // TODO: validate calculation - frontend parses based on decimals
            bnum(pool.swapFee) // TODO: validate calculation - frontend parses based on decimals
        );

        if (slippage) {
            return new OldBigNumber(
                useSlippage.minusSlippageScaled(fullBPTOut.toString(), slippage)
            );
        }
        return fullBPTOut;
    }

    public denormAmounts(amounts: string[], decimals: number[]): BigNumber[] {
        return amounts.map((a, i) => parseUnits(a, decimals[i]));
    }
}
