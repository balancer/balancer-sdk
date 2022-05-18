import { BigNumber } from '@ethersproject/bignumber';
import { WeiPerEther } from '@ethersproject/constants';

import { BalancerSdkConfig, JoinPoolRequest, TransactionData } from '@/types';
import {
    EncodeJoinPoolInput,
    JoinPoolData,
    ExactTokensJoinPoolInput,
} from './types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Interface } from '@ethersproject/abi';

import vaultAbi from '@/lib/abi/Vault.json';
import { WeightedPoolEncoder } from '@/pool-weighted';

export class Pools {
    constructor(
        config: BalancerSdkConfig,
        public weighted = new Weighted(),
        public stable = new Stable(),
        public metaStable = new MetaStable(),
        public stablePhantom = new StablePhantom(),
        public linear = new Linear()
    ) {}

    static from(
        pool: SubgraphPoolBase
    ): Weighted | Stable | MetaStable | StablePhantom | Linear {
        // Calculate spot price using pool type
        switch (pool.poolType) {
            case 'Weighted':
            case 'Investment':
            case 'LiquidityBootstrapping': {
                return new Weighted();
            }
            case 'Stable': {
                return new Stable();
            }
            case 'MetaStable': {
                return new MetaStable();
            }
            case 'StablePhantom': {
                return new StablePhantom();
            }
            case 'AaveLinear':
            case 'ERC4626Linear': {
                return new Linear();
            }
            default:
                throw new BalancerError(
                    BalancerErrorCode.UNSUPPORTED_POOL_TYPE
                );
        }
    }

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

        const joinEncoded = Pools.encodeJoinPool(joinPoolInput);
        return joinEncoded;
    }

    /**
     * exactTokensJoinPool Joins user to desired pool with exact tokens in and minimum BPT out based on slippage tolerance
     * @param {ExactTokensJoinPoolInput} params
     * @param {string} joiner - Address used to join pool.
     * @param {string} poolId - Id of pool being joined.
     * @param {string[]} assets - Array containing addresses of tokens to provide for joining pool. (must have same length and order as amountsIn)
     * @param {string[]} amountsIn - Array containing amounts of tokens to provide for joining pool. (must have same length and order as assets)
     * @param {string} expectedBPTOut - Expected amounts of BPT to receive when joining pool.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
     */
    exactTokensJoinPool(params: ExactTokensJoinPoolInput): string {
        const slippageAmountNegative = WeiPerEther.sub(
            BigNumber.from(params.slippage)
        );
        // Set min amounts of BPT out based on slippage
        const minBPTOut = BigNumber.from(params.expectedBPTOut)
            .mul(slippageAmountNegative)
            .div(WeiPerEther)
            .toString();

        const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
            params.amountsIn,
            minBPTOut
        );

        const joinPoolData: JoinPoolData = {
            assets: params.assets,
            maxAmountsIn: params.amountsIn,
            userData,
            fromInternalBalance: false,
            poolId: params.poolId,
            sender: params.joiner,
            recipient: params.joiner,
            joinPoolRequest: {} as JoinPoolRequest,
        };

        const joinCall = Pools.constructJoinCall(joinPoolData);

        return joinCall;
    }
}
