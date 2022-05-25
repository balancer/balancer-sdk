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
        // TODO: must check tokensIn and amountsIn to see if they are sorted by token addresses - it's currently depending on having the inputs already sorted
        const normalizedMinBPTOut = BigNumber.from(
            this.calcBptOutGivenExactTokensIn(
                pool,
                amountsIn,
                slippage
            ).toString()
        );

        const normalizedAmountsIn = pool.tokens.map((token, i) => {
            return parseUnits(amountsIn[i], token.decimals);
        });

        const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
            normalizedAmountsIn,
            normalizedMinBPTOut
        );

        const joinPoolData: JoinPoolData = {
            assets: tokensIn,
            maxAmountsIn: normalizedAmountsIn,
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
        const normalizedBalances = pool.tokens.map((token) =>
            bnum(parseUnits(token.balance).toString())
        );
        const normalizedWeights = pool.tokens.map((token) =>
            bnum(parseUnits(token.weight || '0').toString())
        ); //  TODO: validate approach of setting undefined to zero and calculation - frontend normalizes by parsing decimals
        const normalizedAmounts = pool.tokens.map((token, i) => {
            return bnum(parseUnits(tokenAmounts[i], token.decimals).toString());
        });

        const normalizedTotalShares = bnum(
            parseUnits(pool.totalShares).toString()
        );
        const normalizedSwapFee = bnum(parseUnits(pool.swapFee).toString());

        const fullBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
            normalizedBalances,
            normalizedWeights,
            normalizedAmounts,
            normalizedTotalShares, // TODO: validate calculation - frontend parses based on decimals
            normalizedSwapFee // TODO: validate calculation - frontend parses based on decimals
        );

        if (slippage) {
            const minBPTOut = useSlippage.minusSlippage(
                fullBPTOut.toString(),
                0,
                slippage
            );
            return new OldBigNumber(minBPTOut);
        }
        return fullBPTOut;
    }
}
