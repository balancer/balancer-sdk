import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { TokenPriceService, PoolDataService, SwapInfo, SOR, SubgraphPoolBase } from '@balancer-labs/sor';
export { NewPath, PoolDataService, PoolDictionary, PoolFilter, RouteProposer, SOR, SubgraphPoolBase, SwapInfo, SwapOptions, SwapTypes, SwapV2, formatSequence, getTokenAddressesForSwap, parseToPoolsDict, phantomStableBPTForTokensZeroPriceImpact, queryBatchSwapTokensIn, queryBatchSwapTokensOut, stableBPTForTokensZeroPriceImpact, weightedBPTForTokensZeroPriceImpact } from '@balancer-labs/sor';
import { Provider, JsonRpcProvider } from '@ethersproject/providers';
import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import { Vault, LidoRelayer } from '@balancer-labs/typechain';
import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';

declare enum StablePoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2
}
declare enum StablePhantomPoolJoinKind {
    INIT = 0,
    COLLECT_PROTOCOL_FEES = 1
}
declare enum StablePoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    EXACT_BPT_IN_FOR_TOKENS_OUT = 1,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 2
}
declare class StablePoolEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor();
    /**
     * Encodes the userData parameter for providing the initial liquidity to a StablePool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static joinInit: (amountsIn: BigNumberish[]) => string;
    /**
     * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
     */
    static joinCollectProtocolFees: () => string;
    /**
     * Encodes the userData parameter for joining a StablePool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static joinExactTokensInForBPTOut: (amountsIn: BigNumberish[], minimumBPT: BigNumberish) => string;
    /**
     * Encodes the userData parameter for joining a StablePool with to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    static joinTokenInForExactBPTOut: (bptAmountOut: BigNumberish, enterTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for exiting a StablePool by removing a single token in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    static exitExactBPTInForOneTokenOut: (bptAmountIn: BigNumberish, exitTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for exiting a StablePool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static exitExactBPTInForTokensOut: (bptAmountIn: BigNumberish) => string;
    /**
     * Encodes the userData parameter for exiting a StablePool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static exitBPTInForExactTokensOut: (amountsOut: BigNumberish[], maxBPTAmountIn: BigNumberish) => string;
}

declare enum WeightedPoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2,
    ALL_TOKENS_IN_FOR_EXACT_BPT_OUT = 3
}
declare enum WeightedPoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    EXACT_BPT_IN_FOR_TOKENS_OUT = 1,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 2,
    MANAGEMENT_FEE_TOKENS_OUT = 3
}
declare class WeightedPoolEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor();
    /**
     * Encodes the userData parameter for providing the initial liquidity to a WeightedPool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static joinInit: (amountsIn: BigNumberish[]) => string;
    /**
     * Encodes the userData parameter for joining a WeightedPool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static joinExactTokensInForBPTOut: (amountsIn: BigNumberish[], minimumBPT: BigNumberish) => string;
    /**
     * Encodes the userData parameter for joining a WeightedPool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    static joinTokenInForExactBPTOut: (bptAmountOut: BigNumberish, enterTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for joining a WeightedPool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    static joinAllTokensInForExactBPTOut: (bptAmountOut: BigNumberish) => string;
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing a single token in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    static exitExactBPTInForOneTokenOut: (bptAmountIn: BigNumberish, exitTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static exitExactBPTInForTokensOut: (bptAmountIn: BigNumberish) => string;
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static exitBPTInForExactTokensOut: (amountsOut: BigNumberish[], maxBPTAmountIn: BigNumberish) => string;
}
declare class ManagedPoolEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor();
    /**
     * Encodes the userData parameter for exiting a ManagedPool for withdrawing management fees.
     * This can only be done by the pool owner.
     */
    static exitForManagementFees: () => string;
}

/**
 * Normalize an array of token weights to ensure they sum to `1e18`
 * @param weights - an array of token weights to be normalized
 * @returns an equivalent set of normalized weights
 */
declare function toNormalizedWeights(weights: BigNumber[]): BigNumber[];
/**
 * Check whether a set of weights are normalized
 * @param weights - an array of potentially unnormalized weights
 * @returns a boolean of whether the weights are normalized
 */
declare const isNormalizedWeights: (weights: BigNumberish[]) => boolean;

declare enum ComposableStablePoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2
}
declare enum ComposableStablePoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 1
}
declare class ComposableStablePoolEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor();
    /**
     * Encodes the userData parameter for providing the initial liquidity to a ComposableStablePool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static joinInit: (amountsIn: BigNumberish[]) => string;
    /**
     * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
     */
    static joinCollectProtocolFees: () => string;
    /**
     * Encodes the userData parameter for joining a ComposableStablePool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static joinExactTokensInForBPTOut: (amountsIn: BigNumberish[], minimumBPT: BigNumberish) => string;
    /**
     * Encodes the userData parameter for joining a ComposableStablePool with to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    static joinTokenInForExactBPTOut: (bptAmountOut: BigNumberish, enterTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for exiting a ComposableStablePool by removing a single token in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    static exitExactBPTInForOneTokenOut: (bptAmountIn: BigNumberish, exitTokenIndex: number) => string;
    /**
     * Encodes the userData parameter for exiting a ComposableStablePool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static exitBPTInForExactTokensOut: (amountsOut: BigNumberish[], maxBPTAmountIn: BigNumberish) => string;
}

declare enum Network {
    MAINNET = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GOERLI = 5,
    GÖRLI = 5,
    OPTIMISM = 10,
    KOVAN = 42,
    POLYGON = 137,
    ARBITRUM = 42161
}

interface JoinPool {
    poolId: string;
    sender: string;
    recipient: string;
    joinPoolRequest: JoinPoolRequest;
}
interface JoinPoolAttributes {
    to: string;
    functionName: string;
    attributes: JoinPool;
    data: string;
    value?: BigNumber;
    minBPTOut: string;
}
interface ExitPool {
    poolId: string;
    sender: string;
    recipient: string;
    exitPoolRequest: ExitPoolRequest;
}
interface ExitPoolAttributes {
    to: string;
    functionName: string;
    attributes: ExitPool;
    data: string;
    minAmountsOut: string[];
    maxBPTIn: string;
}

declare class GaugeControllerMulticallRepository {
    private gaugeControllerAddress;
    multicall: Contract;
    constructor(multicallAddress: string, gaugeControllerAddress: string, provider: Provider);
    getRelativeWeights(gaugeAddresses: string[], timestamp?: number): Promise<{
        [gaugeAddress: string]: number;
    }>;
}

interface RewardData {
    token: string;
    distributor: string;
    period_finish: BigNumber;
    rate: BigNumber;
    last_update: BigNumber;
    integral: BigNumber;
}
/**
 * A lot of code to get liquidity gauge state via RPC multicall.
 * TODO: reseach helper contracts or extend subgraph
 */
declare class LiquidityGaugesMulticallRepository {
    private chainId;
    multicall: Contract;
    constructor(multicallAddress: string, chainId: Network, provider: Provider);
    getTotalSupplies(gaugeAddresses: string[]): Promise<{
        [gaugeAddress: string]: number;
    }>;
    getWorkingSupplies(gaugeAddresses: string[]): Promise<{
        [gaugeAddress: string]: number;
    }>;
    getRewardCounts(gaugeAddresses: string[]): Promise<{
        [gaugeAddress: string]: number;
    }>;
    getRewardTokens(gaugeAddresses: string[], passingRewardCounts?: {
        [gaugeAddress: string]: number;
    }): Promise<{
        [gaugeAddress: string]: string[];
    }>;
    getRewardData(gaugeAddresses: string[], passingRewardTokens?: {
        [gaugeAddress: string]: string[];
    }): Promise<{
        [gaugeAddress: string]: {
            [rewardTokenAddress: string]: RewardData;
        };
    }>;
}

declare type Maybe$1<T> = T | null;
declare type InputMaybe<T> = Maybe$1<T>;
declare type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
/** All built-in and custom scalars, mapped to their actual values */
declare type Scalars$1 = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    BigDecimal: string;
    BigInt: string;
    Bytes: string;
};
declare type Balancer_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolCount?: InputMaybe<Scalars$1['Int']>;
    poolCount_gt?: InputMaybe<Scalars$1['Int']>;
    poolCount_gte?: InputMaybe<Scalars$1['Int']>;
    poolCount_in?: InputMaybe<Array<Scalars$1['Int']>>;
    poolCount_lt?: InputMaybe<Scalars$1['Int']>;
    poolCount_lte?: InputMaybe<Scalars$1['Int']>;
    poolCount_not?: InputMaybe<Scalars$1['Int']>;
    poolCount_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    pools_?: InputMaybe<Pool_Filter>;
    totalLiquidity?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalLiquidity_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapCount?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_gt?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_gte?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    totalSwapCount_lt?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_lte?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_not?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    totalSwapFee?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapFee_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapVolume?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapVolume_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
};
declare enum Balancer_OrderBy {
    Id = "id",
    PoolCount = "poolCount",
    Pools = "pools",
    TotalLiquidity = "totalLiquidity",
    TotalSwapCount = "totalSwapCount",
    TotalSwapFee = "totalSwapFee",
    TotalSwapVolume = "totalSwapVolume"
}
declare type BlockChangedFilter = {
    number_gte: Scalars$1['Int'];
};
declare type Block_Height = {
    hash?: InputMaybe<Scalars$1['Bytes']>;
    number?: InputMaybe<Scalars$1['Int']>;
    number_gte?: InputMaybe<Scalars$1['Int']>;
};
declare type GradualWeightUpdate_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    endTimestamp?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_gt?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_gte?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endTimestamp_lt?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_lte?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_not?: InputMaybe<Scalars$1['BigInt']>;
    endTimestamp_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights_contains?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights_contains_nocase?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights_not?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights_not_contains?: InputMaybe<Array<Scalars$1['BigInt']>>;
    endWeights_not_contains_nocase?: InputMaybe<Array<Scalars$1['BigInt']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    scheduledTimestamp?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_gt?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_gte?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    scheduledTimestamp_lt?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_lte?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_not?: InputMaybe<Scalars$1['Int']>;
    scheduledTimestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    startTimestamp?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_gt?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_gte?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startTimestamp_lt?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_lte?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_not?: InputMaybe<Scalars$1['BigInt']>;
    startTimestamp_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights_contains?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights_contains_nocase?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights_not?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights_not_contains?: InputMaybe<Array<Scalars$1['BigInt']>>;
    startWeights_not_contains_nocase?: InputMaybe<Array<Scalars$1['BigInt']>>;
};
declare enum InvestType {
    Exit = "Exit",
    Join = "Join"
}
declare type JoinExit_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    amounts?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_contains?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_contains_nocase?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not_contains?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not_contains_nocase?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    pool?: InputMaybe<Scalars$1['String']>;
    pool_?: InputMaybe<Pool_Filter>;
    pool_contains?: InputMaybe<Scalars$1['String']>;
    pool_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_gt?: InputMaybe<Scalars$1['String']>;
    pool_gte?: InputMaybe<Scalars$1['String']>;
    pool_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_lt?: InputMaybe<Scalars$1['String']>;
    pool_lte?: InputMaybe<Scalars$1['String']>;
    pool_not?: InputMaybe<Scalars$1['String']>;
    pool_not_contains?: InputMaybe<Scalars$1['String']>;
    pool_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_not_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    sender?: InputMaybe<Scalars$1['Bytes']>;
    sender_contains?: InputMaybe<Scalars$1['Bytes']>;
    sender_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    sender_not?: InputMaybe<Scalars$1['Bytes']>;
    sender_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    sender_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    timestamp?: InputMaybe<Scalars$1['Int']>;
    timestamp_gt?: InputMaybe<Scalars$1['Int']>;
    timestamp_gte?: InputMaybe<Scalars$1['Int']>;
    timestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    timestamp_lt?: InputMaybe<Scalars$1['Int']>;
    timestamp_lte?: InputMaybe<Scalars$1['Int']>;
    timestamp_not?: InputMaybe<Scalars$1['Int']>;
    timestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    tx?: InputMaybe<Scalars$1['Bytes']>;
    tx_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tx_not?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    type?: InputMaybe<InvestType>;
    type_in?: InputMaybe<Array<InvestType>>;
    type_not?: InputMaybe<InvestType>;
    type_not_in?: InputMaybe<Array<InvestType>>;
    user?: InputMaybe<Scalars$1['String']>;
    user_?: InputMaybe<User_Filter>;
    user_contains?: InputMaybe<Scalars$1['String']>;
    user_contains_nocase?: InputMaybe<Scalars$1['String']>;
    user_ends_with?: InputMaybe<Scalars$1['String']>;
    user_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    user_gt?: InputMaybe<Scalars$1['String']>;
    user_gte?: InputMaybe<Scalars$1['String']>;
    user_in?: InputMaybe<Array<Scalars$1['String']>>;
    user_lt?: InputMaybe<Scalars$1['String']>;
    user_lte?: InputMaybe<Scalars$1['String']>;
    user_not?: InputMaybe<Scalars$1['String']>;
    user_not_contains?: InputMaybe<Scalars$1['String']>;
    user_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    user_not_ends_with?: InputMaybe<Scalars$1['String']>;
    user_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    user_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    user_not_starts_with?: InputMaybe<Scalars$1['String']>;
    user_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    user_starts_with?: InputMaybe<Scalars$1['String']>;
    user_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
};
declare enum JoinExit_OrderBy {
    Amounts = "amounts",
    Id = "id",
    Pool = "pool",
    Sender = "sender",
    Timestamp = "timestamp",
    Tx = "tx",
    Type = "type",
    User = "user"
}
declare type LatestPrice_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    asset?: InputMaybe<Scalars$1['Bytes']>;
    asset_contains?: InputMaybe<Scalars$1['Bytes']>;
    asset_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    asset_not?: InputMaybe<Scalars$1['Bytes']>;
    asset_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    asset_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    block?: InputMaybe<Scalars$1['BigInt']>;
    block_gt?: InputMaybe<Scalars$1['BigInt']>;
    block_gte?: InputMaybe<Scalars$1['BigInt']>;
    block_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    block_lt?: InputMaybe<Scalars$1['BigInt']>;
    block_lte?: InputMaybe<Scalars$1['BigInt']>;
    block_not?: InputMaybe<Scalars$1['BigInt']>;
    block_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    price?: InputMaybe<Scalars$1['BigDecimal']>;
    price_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    price_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    price_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    price_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    price_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    price_not?: InputMaybe<Scalars$1['BigDecimal']>;
    price_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    pricingAsset?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    pricingAsset_not?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
};
declare enum LatestPrice_OrderBy {
    Asset = "asset",
    Block = "block",
    Id = "id",
    PoolId = "poolId",
    Price = "price",
    PricingAsset = "pricingAsset"
}
declare type ManagementOperation_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    cashDelta?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    cashDelta_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_not?: InputMaybe<Scalars$1['BigDecimal']>;
    cashDelta_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    managedDelta?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    managedDelta_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_not?: InputMaybe<Scalars$1['BigDecimal']>;
    managedDelta_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolTokenId?: InputMaybe<Scalars$1['String']>;
    poolTokenId_?: InputMaybe<PoolToken_Filter>;
    poolTokenId_contains?: InputMaybe<Scalars$1['String']>;
    poolTokenId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolTokenId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolTokenId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolTokenId_gt?: InputMaybe<Scalars$1['String']>;
    poolTokenId_gte?: InputMaybe<Scalars$1['String']>;
    poolTokenId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolTokenId_lt?: InputMaybe<Scalars$1['String']>;
    poolTokenId_lte?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolTokenId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolTokenId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolTokenId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolTokenId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    timestamp?: InputMaybe<Scalars$1['Int']>;
    timestamp_gt?: InputMaybe<Scalars$1['Int']>;
    timestamp_gte?: InputMaybe<Scalars$1['Int']>;
    timestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    timestamp_lt?: InputMaybe<Scalars$1['Int']>;
    timestamp_lte?: InputMaybe<Scalars$1['Int']>;
    timestamp_not?: InputMaybe<Scalars$1['Int']>;
    timestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    type?: InputMaybe<OperationType>;
    type_in?: InputMaybe<Array<OperationType>>;
    type_not?: InputMaybe<OperationType>;
    type_not_in?: InputMaybe<Array<OperationType>>;
};
declare enum OperationType {
    Deposit = "Deposit",
    Update = "Update",
    Withdraw = "Withdraw"
}
/** Defines the order direction, either ascending or descending */
declare enum OrderDirection {
    Asc = "asc",
    Desc = "desc"
}
declare type PoolHistoricalLiquidity_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    block?: InputMaybe<Scalars$1['BigInt']>;
    block_gt?: InputMaybe<Scalars$1['BigInt']>;
    block_gte?: InputMaybe<Scalars$1['BigInt']>;
    block_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    block_lt?: InputMaybe<Scalars$1['BigInt']>;
    block_lte?: InputMaybe<Scalars$1['BigInt']>;
    block_not?: InputMaybe<Scalars$1['BigInt']>;
    block_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolLiquidity?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolLiquidity_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_not?: InputMaybe<Scalars$1['BigDecimal']>;
    poolLiquidity_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolShareValue?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolShareValue_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_not?: InputMaybe<Scalars$1['BigDecimal']>;
    poolShareValue_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolTotalShares?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    poolTotalShares_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_not?: InputMaybe<Scalars$1['BigDecimal']>;
    poolTotalShares_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    pricingAsset?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    pricingAsset_not?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
};
declare enum PoolHistoricalLiquidity_OrderBy {
    Block = "block",
    Id = "id",
    PoolId = "poolId",
    PoolLiquidity = "poolLiquidity",
    PoolShareValue = "poolShareValue",
    PoolTotalShares = "poolTotalShares",
    PricingAsset = "pricingAsset"
}
declare type PoolShare_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    balance?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    balance_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress?: InputMaybe<Scalars$1['String']>;
    userAddress_?: InputMaybe<User_Filter>;
    userAddress_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_gt?: InputMaybe<Scalars$1['String']>;
    userAddress_gte?: InputMaybe<Scalars$1['String']>;
    userAddress_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_lt?: InputMaybe<Scalars$1['String']>;
    userAddress_lte?: InputMaybe<Scalars$1['String']>;
    userAddress_not?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_not_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
};
declare type PoolSnapshot_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    amounts?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_contains?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_contains_nocase?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not_contains?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amounts_not_contains_nocase?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    liquidity?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    liquidity_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_not?: InputMaybe<Scalars$1['BigDecimal']>;
    liquidity_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    pool?: InputMaybe<Scalars$1['String']>;
    pool_?: InputMaybe<Pool_Filter>;
    pool_contains?: InputMaybe<Scalars$1['String']>;
    pool_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_gt?: InputMaybe<Scalars$1['String']>;
    pool_gte?: InputMaybe<Scalars$1['String']>;
    pool_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_lt?: InputMaybe<Scalars$1['String']>;
    pool_lte?: InputMaybe<Scalars$1['String']>;
    pool_not?: InputMaybe<Scalars$1['String']>;
    pool_not_contains?: InputMaybe<Scalars$1['String']>;
    pool_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_not_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    swapFees?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    swapFees_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_not?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFees_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    swapVolume?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    swapVolume_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_not?: InputMaybe<Scalars$1['BigDecimal']>;
    swapVolume_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    timestamp?: InputMaybe<Scalars$1['Int']>;
    timestamp_gt?: InputMaybe<Scalars$1['Int']>;
    timestamp_gte?: InputMaybe<Scalars$1['Int']>;
    timestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    timestamp_lt?: InputMaybe<Scalars$1['Int']>;
    timestamp_lte?: InputMaybe<Scalars$1['Int']>;
    timestamp_not?: InputMaybe<Scalars$1['Int']>;
    timestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    totalShares?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalShares_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
};
declare enum PoolSnapshot_OrderBy {
    Amounts = "amounts",
    Id = "id",
    Liquidity = "liquidity",
    Pool = "pool",
    SwapFees = "swapFees",
    SwapVolume = "swapVolume",
    Timestamp = "timestamp",
    TotalShares = "totalShares"
}
declare type PoolToken_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    address?: InputMaybe<Scalars$1['String']>;
    address_contains?: InputMaybe<Scalars$1['String']>;
    address_contains_nocase?: InputMaybe<Scalars$1['String']>;
    address_ends_with?: InputMaybe<Scalars$1['String']>;
    address_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_gt?: InputMaybe<Scalars$1['String']>;
    address_gte?: InputMaybe<Scalars$1['String']>;
    address_in?: InputMaybe<Array<Scalars$1['String']>>;
    address_lt?: InputMaybe<Scalars$1['String']>;
    address_lte?: InputMaybe<Scalars$1['String']>;
    address_not?: InputMaybe<Scalars$1['String']>;
    address_not_contains?: InputMaybe<Scalars$1['String']>;
    address_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    address_not_ends_with?: InputMaybe<Scalars$1['String']>;
    address_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    address_not_starts_with?: InputMaybe<Scalars$1['String']>;
    address_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_starts_with?: InputMaybe<Scalars$1['String']>;
    address_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    assetManager?: InputMaybe<Scalars$1['Bytes']>;
    assetManager_contains?: InputMaybe<Scalars$1['Bytes']>;
    assetManager_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    assetManager_not?: InputMaybe<Scalars$1['Bytes']>;
    assetManager_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    assetManager_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    balance?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    balance_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    cashBalance?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    cashBalance_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_not?: InputMaybe<Scalars$1['BigDecimal']>;
    cashBalance_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    decimals?: InputMaybe<Scalars$1['Int']>;
    decimals_gt?: InputMaybe<Scalars$1['Int']>;
    decimals_gte?: InputMaybe<Scalars$1['Int']>;
    decimals_in?: InputMaybe<Array<Scalars$1['Int']>>;
    decimals_lt?: InputMaybe<Scalars$1['Int']>;
    decimals_lte?: InputMaybe<Scalars$1['Int']>;
    decimals_not?: InputMaybe<Scalars$1['Int']>;
    decimals_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    managedBalance?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    managedBalance_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_not?: InputMaybe<Scalars$1['BigDecimal']>;
    managedBalance_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    managements_?: InputMaybe<ManagementOperation_Filter>;
    name?: InputMaybe<Scalars$1['String']>;
    name_contains?: InputMaybe<Scalars$1['String']>;
    name_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_ends_with?: InputMaybe<Scalars$1['String']>;
    name_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_gt?: InputMaybe<Scalars$1['String']>;
    name_gte?: InputMaybe<Scalars$1['String']>;
    name_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_lt?: InputMaybe<Scalars$1['String']>;
    name_lte?: InputMaybe<Scalars$1['String']>;
    name_not?: InputMaybe<Scalars$1['String']>;
    name_not_contains?: InputMaybe<Scalars$1['String']>;
    name_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_not_starts_with?: InputMaybe<Scalars$1['String']>;
    name_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_starts_with?: InputMaybe<Scalars$1['String']>;
    name_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    priceRate?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    priceRate_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_not?: InputMaybe<Scalars$1['BigDecimal']>;
    priceRate_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    symbol?: InputMaybe<Scalars$1['String']>;
    symbol_contains?: InputMaybe<Scalars$1['String']>;
    symbol_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_gt?: InputMaybe<Scalars$1['String']>;
    symbol_gte?: InputMaybe<Scalars$1['String']>;
    symbol_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_lt?: InputMaybe<Scalars$1['String']>;
    symbol_lte?: InputMaybe<Scalars$1['String']>;
    symbol_not?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_not_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    token?: InputMaybe<Scalars$1['String']>;
    token_?: InputMaybe<Token_Filter>;
    token_contains?: InputMaybe<Scalars$1['String']>;
    token_contains_nocase?: InputMaybe<Scalars$1['String']>;
    token_ends_with?: InputMaybe<Scalars$1['String']>;
    token_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_gt?: InputMaybe<Scalars$1['String']>;
    token_gte?: InputMaybe<Scalars$1['String']>;
    token_in?: InputMaybe<Array<Scalars$1['String']>>;
    token_lt?: InputMaybe<Scalars$1['String']>;
    token_lte?: InputMaybe<Scalars$1['String']>;
    token_not?: InputMaybe<Scalars$1['String']>;
    token_not_contains?: InputMaybe<Scalars$1['String']>;
    token_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    token_not_ends_with?: InputMaybe<Scalars$1['String']>;
    token_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    token_not_starts_with?: InputMaybe<Scalars$1['String']>;
    token_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_starts_with?: InputMaybe<Scalars$1['String']>;
    token_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    weight?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    weight_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_not?: InputMaybe<Scalars$1['BigDecimal']>;
    weight_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
};
declare type Pool_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    address?: InputMaybe<Scalars$1['Bytes']>;
    address_contains?: InputMaybe<Scalars$1['Bytes']>;
    address_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    address_not?: InputMaybe<Scalars$1['Bytes']>;
    address_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    address_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    amp?: InputMaybe<Scalars$1['BigInt']>;
    amp_gt?: InputMaybe<Scalars$1['BigInt']>;
    amp_gte?: InputMaybe<Scalars$1['BigInt']>;
    amp_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    amp_lt?: InputMaybe<Scalars$1['BigInt']>;
    amp_lte?: InputMaybe<Scalars$1['BigInt']>;
    amp_not?: InputMaybe<Scalars$1['BigInt']>;
    amp_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    baseToken?: InputMaybe<Scalars$1['Bytes']>;
    baseToken_contains?: InputMaybe<Scalars$1['Bytes']>;
    baseToken_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    baseToken_not?: InputMaybe<Scalars$1['Bytes']>;
    baseToken_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    baseToken_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    createTime?: InputMaybe<Scalars$1['Int']>;
    createTime_gt?: InputMaybe<Scalars$1['Int']>;
    createTime_gte?: InputMaybe<Scalars$1['Int']>;
    createTime_in?: InputMaybe<Array<Scalars$1['Int']>>;
    createTime_lt?: InputMaybe<Scalars$1['Int']>;
    createTime_lte?: InputMaybe<Scalars$1['Int']>;
    createTime_not?: InputMaybe<Scalars$1['Int']>;
    createTime_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    expiryTime?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_gt?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_gte?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    expiryTime_lt?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_lte?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_not?: InputMaybe<Scalars$1['BigInt']>;
    expiryTime_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    factory?: InputMaybe<Scalars$1['Bytes']>;
    factory_contains?: InputMaybe<Scalars$1['Bytes']>;
    factory_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    factory_not?: InputMaybe<Scalars$1['Bytes']>;
    factory_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    factory_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    historicalValues_?: InputMaybe<PoolHistoricalLiquidity_Filter>;
    holdersCount?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_gt?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_gte?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    holdersCount_lt?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_lte?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_not?: InputMaybe<Scalars$1['BigInt']>;
    holdersCount_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    lowerTarget?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    lowerTarget_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_not?: InputMaybe<Scalars$1['BigDecimal']>;
    lowerTarget_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    mainIndex?: InputMaybe<Scalars$1['Int']>;
    mainIndex_gt?: InputMaybe<Scalars$1['Int']>;
    mainIndex_gte?: InputMaybe<Scalars$1['Int']>;
    mainIndex_in?: InputMaybe<Array<Scalars$1['Int']>>;
    mainIndex_lt?: InputMaybe<Scalars$1['Int']>;
    mainIndex_lte?: InputMaybe<Scalars$1['Int']>;
    mainIndex_not?: InputMaybe<Scalars$1['Int']>;
    mainIndex_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    managementFee?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    managementFee_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_not?: InputMaybe<Scalars$1['BigDecimal']>;
    managementFee_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    name?: InputMaybe<Scalars$1['String']>;
    name_contains?: InputMaybe<Scalars$1['String']>;
    name_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_ends_with?: InputMaybe<Scalars$1['String']>;
    name_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_gt?: InputMaybe<Scalars$1['String']>;
    name_gte?: InputMaybe<Scalars$1['String']>;
    name_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_lt?: InputMaybe<Scalars$1['String']>;
    name_lte?: InputMaybe<Scalars$1['String']>;
    name_not?: InputMaybe<Scalars$1['String']>;
    name_not_contains?: InputMaybe<Scalars$1['String']>;
    name_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_not_starts_with?: InputMaybe<Scalars$1['String']>;
    name_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_starts_with?: InputMaybe<Scalars$1['String']>;
    name_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    oracleEnabled?: InputMaybe<Scalars$1['Boolean']>;
    oracleEnabled_in?: InputMaybe<Array<Scalars$1['Boolean']>>;
    oracleEnabled_not?: InputMaybe<Scalars$1['Boolean']>;
    oracleEnabled_not_in?: InputMaybe<Array<Scalars$1['Boolean']>>;
    owner?: InputMaybe<Scalars$1['Bytes']>;
    owner_contains?: InputMaybe<Scalars$1['Bytes']>;
    owner_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    owner_not?: InputMaybe<Scalars$1['Bytes']>;
    owner_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    owner_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    poolType?: InputMaybe<Scalars$1['String']>;
    poolType_contains?: InputMaybe<Scalars$1['String']>;
    poolType_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolType_ends_with?: InputMaybe<Scalars$1['String']>;
    poolType_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolType_gt?: InputMaybe<Scalars$1['String']>;
    poolType_gte?: InputMaybe<Scalars$1['String']>;
    poolType_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolType_lt?: InputMaybe<Scalars$1['String']>;
    poolType_lte?: InputMaybe<Scalars$1['String']>;
    poolType_not?: InputMaybe<Scalars$1['String']>;
    poolType_not_contains?: InputMaybe<Scalars$1['String']>;
    poolType_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolType_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolType_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolType_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolType_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolType_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolType_starts_with?: InputMaybe<Scalars$1['String']>;
    poolType_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    priceRateProviders_?: InputMaybe<PriceRateProvider_Filter>;
    principalToken?: InputMaybe<Scalars$1['Bytes']>;
    principalToken_contains?: InputMaybe<Scalars$1['Bytes']>;
    principalToken_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    principalToken_not?: InputMaybe<Scalars$1['Bytes']>;
    principalToken_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    principalToken_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    root3Alpha?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    root3Alpha_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_not?: InputMaybe<Scalars$1['BigDecimal']>;
    root3Alpha_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    shares_?: InputMaybe<PoolShare_Filter>;
    snapshots_?: InputMaybe<PoolSnapshot_Filter>;
    sqrtAlpha?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    sqrtAlpha_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_not?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtAlpha_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    sqrtBeta?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    sqrtBeta_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_not?: InputMaybe<Scalars$1['BigDecimal']>;
    sqrtBeta_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    strategyType?: InputMaybe<Scalars$1['Int']>;
    strategyType_gt?: InputMaybe<Scalars$1['Int']>;
    strategyType_gte?: InputMaybe<Scalars$1['Int']>;
    strategyType_in?: InputMaybe<Array<Scalars$1['Int']>>;
    strategyType_lt?: InputMaybe<Scalars$1['Int']>;
    strategyType_lte?: InputMaybe<Scalars$1['Int']>;
    strategyType_not?: InputMaybe<Scalars$1['Int']>;
    strategyType_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    swapEnabled?: InputMaybe<Scalars$1['Boolean']>;
    swapEnabled_in?: InputMaybe<Array<Scalars$1['Boolean']>>;
    swapEnabled_not?: InputMaybe<Scalars$1['Boolean']>;
    swapEnabled_not_in?: InputMaybe<Array<Scalars$1['Boolean']>>;
    swapFee?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    swapFee_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_not?: InputMaybe<Scalars$1['BigDecimal']>;
    swapFee_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    swapsCount?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_gt?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_gte?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    swapsCount_lt?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_lte?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_not?: InputMaybe<Scalars$1['BigInt']>;
    swapsCount_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    swaps_?: InputMaybe<Swap_Filter>;
    symbol?: InputMaybe<Scalars$1['String']>;
    symbol_contains?: InputMaybe<Scalars$1['String']>;
    symbol_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_gt?: InputMaybe<Scalars$1['String']>;
    symbol_gte?: InputMaybe<Scalars$1['String']>;
    symbol_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_lt?: InputMaybe<Scalars$1['String']>;
    symbol_lte?: InputMaybe<Scalars$1['String']>;
    symbol_not?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_not_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokensList?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokensList_contains?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokensList_contains_nocase?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokensList_not?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokensList_not_contains?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokensList_not_contains_nocase?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokens_?: InputMaybe<PoolToken_Filter>;
    totalLiquidity?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalLiquidity_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalLiquidity_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalShares?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalShares_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalShares_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapFee?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapFee_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapFee_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapVolume?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapVolume_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalSwapVolume_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalWeight?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalWeight_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalWeight_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    tx?: InputMaybe<Scalars$1['Bytes']>;
    tx_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tx_not?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    unitSeconds?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_gt?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_gte?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    unitSeconds_lt?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_lte?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_not?: InputMaybe<Scalars$1['BigInt']>;
    unitSeconds_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    upperTarget?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    upperTarget_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_not?: InputMaybe<Scalars$1['BigDecimal']>;
    upperTarget_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    vaultID?: InputMaybe<Scalars$1['String']>;
    vaultID_?: InputMaybe<Balancer_Filter>;
    vaultID_contains?: InputMaybe<Scalars$1['String']>;
    vaultID_contains_nocase?: InputMaybe<Scalars$1['String']>;
    vaultID_ends_with?: InputMaybe<Scalars$1['String']>;
    vaultID_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    vaultID_gt?: InputMaybe<Scalars$1['String']>;
    vaultID_gte?: InputMaybe<Scalars$1['String']>;
    vaultID_in?: InputMaybe<Array<Scalars$1['String']>>;
    vaultID_lt?: InputMaybe<Scalars$1['String']>;
    vaultID_lte?: InputMaybe<Scalars$1['String']>;
    vaultID_not?: InputMaybe<Scalars$1['String']>;
    vaultID_not_contains?: InputMaybe<Scalars$1['String']>;
    vaultID_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    vaultID_not_ends_with?: InputMaybe<Scalars$1['String']>;
    vaultID_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    vaultID_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    vaultID_not_starts_with?: InputMaybe<Scalars$1['String']>;
    vaultID_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    vaultID_starts_with?: InputMaybe<Scalars$1['String']>;
    vaultID_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    weightUpdates_?: InputMaybe<GradualWeightUpdate_Filter>;
    wrappedIndex?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_gt?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_gte?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_in?: InputMaybe<Array<Scalars$1['Int']>>;
    wrappedIndex_lt?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_lte?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_not?: InputMaybe<Scalars$1['Int']>;
    wrappedIndex_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
};
declare enum Pool_OrderBy {
    Address = "address",
    Amp = "amp",
    BaseToken = "baseToken",
    CreateTime = "createTime",
    ExpiryTime = "expiryTime",
    Factory = "factory",
    HistoricalValues = "historicalValues",
    HoldersCount = "holdersCount",
    Id = "id",
    LowerTarget = "lowerTarget",
    MainIndex = "mainIndex",
    ManagementFee = "managementFee",
    Name = "name",
    OracleEnabled = "oracleEnabled",
    Owner = "owner",
    PoolType = "poolType",
    PriceRateProviders = "priceRateProviders",
    PrincipalToken = "principalToken",
    Root3Alpha = "root3Alpha",
    Shares = "shares",
    Snapshots = "snapshots",
    SqrtAlpha = "sqrtAlpha",
    SqrtBeta = "sqrtBeta",
    StrategyType = "strategyType",
    SwapEnabled = "swapEnabled",
    SwapFee = "swapFee",
    Swaps = "swaps",
    SwapsCount = "swapsCount",
    Symbol = "symbol",
    Tokens = "tokens",
    TokensList = "tokensList",
    TotalLiquidity = "totalLiquidity",
    TotalShares = "totalShares",
    TotalSwapFee = "totalSwapFee",
    TotalSwapVolume = "totalSwapVolume",
    TotalWeight = "totalWeight",
    Tx = "tx",
    UnitSeconds = "unitSeconds",
    UpperTarget = "upperTarget",
    VaultId = "vaultID",
    WeightUpdates = "weightUpdates",
    WrappedIndex = "wrappedIndex"
}
declare type PriceRateProvider_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    address?: InputMaybe<Scalars$1['Bytes']>;
    address_contains?: InputMaybe<Scalars$1['Bytes']>;
    address_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    address_not?: InputMaybe<Scalars$1['Bytes']>;
    address_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    address_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    cacheDuration?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_gt?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_gte?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_in?: InputMaybe<Array<Scalars$1['Int']>>;
    cacheDuration_lt?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_lte?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_not?: InputMaybe<Scalars$1['Int']>;
    cacheDuration_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    cacheExpiry?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_gt?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_gte?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_in?: InputMaybe<Array<Scalars$1['Int']>>;
    cacheExpiry_lt?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_lte?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_not?: InputMaybe<Scalars$1['Int']>;
    cacheExpiry_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    lastCached?: InputMaybe<Scalars$1['Int']>;
    lastCached_gt?: InputMaybe<Scalars$1['Int']>;
    lastCached_gte?: InputMaybe<Scalars$1['Int']>;
    lastCached_in?: InputMaybe<Array<Scalars$1['Int']>>;
    lastCached_lt?: InputMaybe<Scalars$1['Int']>;
    lastCached_lte?: InputMaybe<Scalars$1['Int']>;
    lastCached_not?: InputMaybe<Scalars$1['Int']>;
    lastCached_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    rate?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    rate_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_not?: InputMaybe<Scalars$1['BigDecimal']>;
    rate_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    token?: InputMaybe<Scalars$1['String']>;
    token_?: InputMaybe<PoolToken_Filter>;
    token_contains?: InputMaybe<Scalars$1['String']>;
    token_contains_nocase?: InputMaybe<Scalars$1['String']>;
    token_ends_with?: InputMaybe<Scalars$1['String']>;
    token_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_gt?: InputMaybe<Scalars$1['String']>;
    token_gte?: InputMaybe<Scalars$1['String']>;
    token_in?: InputMaybe<Array<Scalars$1['String']>>;
    token_lt?: InputMaybe<Scalars$1['String']>;
    token_lte?: InputMaybe<Scalars$1['String']>;
    token_not?: InputMaybe<Scalars$1['String']>;
    token_not_contains?: InputMaybe<Scalars$1['String']>;
    token_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    token_not_ends_with?: InputMaybe<Scalars$1['String']>;
    token_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    token_not_starts_with?: InputMaybe<Scalars$1['String']>;
    token_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    token_starts_with?: InputMaybe<Scalars$1['String']>;
    token_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
};
declare type Swap_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    caller?: InputMaybe<Scalars$1['Bytes']>;
    caller_contains?: InputMaybe<Scalars$1['Bytes']>;
    caller_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    caller_not?: InputMaybe<Scalars$1['Bytes']>;
    caller_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    caller_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    timestamp?: InputMaybe<Scalars$1['Int']>;
    timestamp_gt?: InputMaybe<Scalars$1['Int']>;
    timestamp_gte?: InputMaybe<Scalars$1['Int']>;
    timestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    timestamp_lt?: InputMaybe<Scalars$1['Int']>;
    timestamp_lte?: InputMaybe<Scalars$1['Int']>;
    timestamp_not?: InputMaybe<Scalars$1['Int']>;
    timestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    tokenAmountIn?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    tokenAmountIn_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_not?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountIn_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    tokenAmountOut?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    tokenAmountOut_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_not?: InputMaybe<Scalars$1['BigDecimal']>;
    tokenAmountOut_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    tokenIn?: InputMaybe<Scalars$1['Bytes']>;
    tokenInSym?: InputMaybe<Scalars$1['String']>;
    tokenInSym_contains?: InputMaybe<Scalars$1['String']>;
    tokenInSym_contains_nocase?: InputMaybe<Scalars$1['String']>;
    tokenInSym_ends_with?: InputMaybe<Scalars$1['String']>;
    tokenInSym_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenInSym_gt?: InputMaybe<Scalars$1['String']>;
    tokenInSym_gte?: InputMaybe<Scalars$1['String']>;
    tokenInSym_in?: InputMaybe<Array<Scalars$1['String']>>;
    tokenInSym_lt?: InputMaybe<Scalars$1['String']>;
    tokenInSym_lte?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_contains?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_ends_with?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    tokenInSym_not_starts_with?: InputMaybe<Scalars$1['String']>;
    tokenInSym_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenInSym_starts_with?: InputMaybe<Scalars$1['String']>;
    tokenInSym_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenIn_contains?: InputMaybe<Scalars$1['Bytes']>;
    tokenIn_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokenIn_not?: InputMaybe<Scalars$1['Bytes']>;
    tokenIn_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    tokenIn_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokenOut?: InputMaybe<Scalars$1['Bytes']>;
    tokenOutSym?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_contains?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_contains_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_ends_with?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_gt?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_gte?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_in?: InputMaybe<Array<Scalars$1['String']>>;
    tokenOutSym_lt?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_lte?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_contains?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_ends_with?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    tokenOutSym_not_starts_with?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_starts_with?: InputMaybe<Scalars$1['String']>;
    tokenOutSym_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    tokenOut_contains?: InputMaybe<Scalars$1['Bytes']>;
    tokenOut_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tokenOut_not?: InputMaybe<Scalars$1['Bytes']>;
    tokenOut_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    tokenOut_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tx?: InputMaybe<Scalars$1['Bytes']>;
    tx_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    tx_not?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    tx_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    userAddress?: InputMaybe<Scalars$1['String']>;
    userAddress_?: InputMaybe<User_Filter>;
    userAddress_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_gt?: InputMaybe<Scalars$1['String']>;
    userAddress_gte?: InputMaybe<Scalars$1['String']>;
    userAddress_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_lt?: InputMaybe<Scalars$1['String']>;
    userAddress_lte?: InputMaybe<Scalars$1['String']>;
    userAddress_not?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_not_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    valueUSD?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    valueUSD_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_not?: InputMaybe<Scalars$1['BigDecimal']>;
    valueUSD_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
};
declare type TokenPrice_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    amount?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    amount_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_not?: InputMaybe<Scalars$1['BigDecimal']>;
    amount_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    asset?: InputMaybe<Scalars$1['Bytes']>;
    asset_contains?: InputMaybe<Scalars$1['Bytes']>;
    asset_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    asset_not?: InputMaybe<Scalars$1['Bytes']>;
    asset_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    asset_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    block?: InputMaybe<Scalars$1['BigInt']>;
    block_gt?: InputMaybe<Scalars$1['BigInt']>;
    block_gte?: InputMaybe<Scalars$1['BigInt']>;
    block_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    block_lt?: InputMaybe<Scalars$1['BigInt']>;
    block_lte?: InputMaybe<Scalars$1['BigInt']>;
    block_not?: InputMaybe<Scalars$1['BigInt']>;
    block_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    poolId?: InputMaybe<Scalars$1['String']>;
    poolId_?: InputMaybe<Pool_Filter>;
    poolId_contains?: InputMaybe<Scalars$1['String']>;
    poolId_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_gt?: InputMaybe<Scalars$1['String']>;
    poolId_gte?: InputMaybe<Scalars$1['String']>;
    poolId_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_lt?: InputMaybe<Scalars$1['String']>;
    poolId_lte?: InputMaybe<Scalars$1['String']>;
    poolId_not?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains?: InputMaybe<Scalars$1['String']>;
    poolId_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    poolId_not_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with?: InputMaybe<Scalars$1['String']>;
    poolId_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    price?: InputMaybe<Scalars$1['BigDecimal']>;
    price_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    price_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    price_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    price_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    price_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    price_not?: InputMaybe<Scalars$1['BigDecimal']>;
    price_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    pricingAsset?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    pricingAsset_not?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    pricingAsset_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    timestamp?: InputMaybe<Scalars$1['Int']>;
    timestamp_gt?: InputMaybe<Scalars$1['Int']>;
    timestamp_gte?: InputMaybe<Scalars$1['Int']>;
    timestamp_in?: InputMaybe<Array<Scalars$1['Int']>>;
    timestamp_lt?: InputMaybe<Scalars$1['Int']>;
    timestamp_lte?: InputMaybe<Scalars$1['Int']>;
    timestamp_not?: InputMaybe<Scalars$1['Int']>;
    timestamp_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
};
declare enum TokenPrice_OrderBy {
    Amount = "amount",
    Asset = "asset",
    Block = "block",
    Id = "id",
    PoolId = "poolId",
    Price = "price",
    PricingAsset = "pricingAsset",
    Timestamp = "timestamp"
}
declare type Token_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    address?: InputMaybe<Scalars$1['String']>;
    address_contains?: InputMaybe<Scalars$1['String']>;
    address_contains_nocase?: InputMaybe<Scalars$1['String']>;
    address_ends_with?: InputMaybe<Scalars$1['String']>;
    address_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_gt?: InputMaybe<Scalars$1['String']>;
    address_gte?: InputMaybe<Scalars$1['String']>;
    address_in?: InputMaybe<Array<Scalars$1['String']>>;
    address_lt?: InputMaybe<Scalars$1['String']>;
    address_lte?: InputMaybe<Scalars$1['String']>;
    address_not?: InputMaybe<Scalars$1['String']>;
    address_not_contains?: InputMaybe<Scalars$1['String']>;
    address_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    address_not_ends_with?: InputMaybe<Scalars$1['String']>;
    address_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    address_not_starts_with?: InputMaybe<Scalars$1['String']>;
    address_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    address_starts_with?: InputMaybe<Scalars$1['String']>;
    address_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    decimals?: InputMaybe<Scalars$1['Int']>;
    decimals_gt?: InputMaybe<Scalars$1['Int']>;
    decimals_gte?: InputMaybe<Scalars$1['Int']>;
    decimals_in?: InputMaybe<Array<Scalars$1['Int']>>;
    decimals_lt?: InputMaybe<Scalars$1['Int']>;
    decimals_lte?: InputMaybe<Scalars$1['Int']>;
    decimals_not?: InputMaybe<Scalars$1['Int']>;
    decimals_not_in?: InputMaybe<Array<Scalars$1['Int']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    latestPrice?: InputMaybe<Scalars$1['String']>;
    latestPrice_?: InputMaybe<LatestPrice_Filter>;
    latestPrice_contains?: InputMaybe<Scalars$1['String']>;
    latestPrice_contains_nocase?: InputMaybe<Scalars$1['String']>;
    latestPrice_ends_with?: InputMaybe<Scalars$1['String']>;
    latestPrice_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    latestPrice_gt?: InputMaybe<Scalars$1['String']>;
    latestPrice_gte?: InputMaybe<Scalars$1['String']>;
    latestPrice_in?: InputMaybe<Array<Scalars$1['String']>>;
    latestPrice_lt?: InputMaybe<Scalars$1['String']>;
    latestPrice_lte?: InputMaybe<Scalars$1['String']>;
    latestPrice_not?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_contains?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_ends_with?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    latestPrice_not_starts_with?: InputMaybe<Scalars$1['String']>;
    latestPrice_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    latestPrice_starts_with?: InputMaybe<Scalars$1['String']>;
    latestPrice_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    latestUSDPrice?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    latestUSDPrice_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_not?: InputMaybe<Scalars$1['BigDecimal']>;
    latestUSDPrice_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    name?: InputMaybe<Scalars$1['String']>;
    name_contains?: InputMaybe<Scalars$1['String']>;
    name_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_ends_with?: InputMaybe<Scalars$1['String']>;
    name_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_gt?: InputMaybe<Scalars$1['String']>;
    name_gte?: InputMaybe<Scalars$1['String']>;
    name_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_lt?: InputMaybe<Scalars$1['String']>;
    name_lte?: InputMaybe<Scalars$1['String']>;
    name_not?: InputMaybe<Scalars$1['String']>;
    name_not_contains?: InputMaybe<Scalars$1['String']>;
    name_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with?: InputMaybe<Scalars$1['String']>;
    name_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    name_not_starts_with?: InputMaybe<Scalars$1['String']>;
    name_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    name_starts_with?: InputMaybe<Scalars$1['String']>;
    name_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool?: InputMaybe<Scalars$1['String']>;
    pool_?: InputMaybe<Pool_Filter>;
    pool_contains?: InputMaybe<Scalars$1['String']>;
    pool_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_gt?: InputMaybe<Scalars$1['String']>;
    pool_gte?: InputMaybe<Scalars$1['String']>;
    pool_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_lt?: InputMaybe<Scalars$1['String']>;
    pool_lte?: InputMaybe<Scalars$1['String']>;
    pool_not?: InputMaybe<Scalars$1['String']>;
    pool_not_contains?: InputMaybe<Scalars$1['String']>;
    pool_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with?: InputMaybe<Scalars$1['String']>;
    pool_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    pool_not_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    pool_starts_with?: InputMaybe<Scalars$1['String']>;
    pool_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol?: InputMaybe<Scalars$1['String']>;
    symbol_contains?: InputMaybe<Scalars$1['String']>;
    symbol_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_gt?: InputMaybe<Scalars$1['String']>;
    symbol_gte?: InputMaybe<Scalars$1['String']>;
    symbol_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_lt?: InputMaybe<Scalars$1['String']>;
    symbol_lte?: InputMaybe<Scalars$1['String']>;
    symbol_not?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains?: InputMaybe<Scalars$1['String']>;
    symbol_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    symbol_not_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with?: InputMaybe<Scalars$1['String']>;
    symbol_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    totalBalanceNotional?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalBalanceNotional_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceNotional_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalBalanceUSD?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalBalanceUSD_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalBalanceUSD_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalSwapCount?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_gt?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_gte?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    totalSwapCount_lt?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_lte?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_not?: InputMaybe<Scalars$1['BigInt']>;
    totalSwapCount_not_in?: InputMaybe<Array<Scalars$1['BigInt']>>;
    totalVolumeNotional?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalVolumeNotional_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeNotional_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalVolumeUSD?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    totalVolumeUSD_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_not?: InputMaybe<Scalars$1['BigDecimal']>;
    totalVolumeUSD_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
};
declare type UserInternalBalance_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    balance?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_gte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    balance_lt?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_lte?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not?: InputMaybe<Scalars$1['BigDecimal']>;
    balance_not_in?: InputMaybe<Array<Scalars$1['BigDecimal']>>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    token?: InputMaybe<Scalars$1['Bytes']>;
    token_contains?: InputMaybe<Scalars$1['Bytes']>;
    token_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    token_not?: InputMaybe<Scalars$1['Bytes']>;
    token_not_contains?: InputMaybe<Scalars$1['Bytes']>;
    token_not_in?: InputMaybe<Array<Scalars$1['Bytes']>>;
    userAddress?: InputMaybe<Scalars$1['String']>;
    userAddress_?: InputMaybe<User_Filter>;
    userAddress_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_gt?: InputMaybe<Scalars$1['String']>;
    userAddress_gte?: InputMaybe<Scalars$1['String']>;
    userAddress_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_lt?: InputMaybe<Scalars$1['String']>;
    userAddress_lte?: InputMaybe<Scalars$1['String']>;
    userAddress_not?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains?: InputMaybe<Scalars$1['String']>;
    userAddress_not_contains_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_ends_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_not_in?: InputMaybe<Array<Scalars$1['String']>>;
    userAddress_not_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_not_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with?: InputMaybe<Scalars$1['String']>;
    userAddress_starts_with_nocase?: InputMaybe<Scalars$1['String']>;
};
declare type User_Filter = {
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    id?: InputMaybe<Scalars$1['ID']>;
    id_gt?: InputMaybe<Scalars$1['ID']>;
    id_gte?: InputMaybe<Scalars$1['ID']>;
    id_in?: InputMaybe<Array<Scalars$1['ID']>>;
    id_lt?: InputMaybe<Scalars$1['ID']>;
    id_lte?: InputMaybe<Scalars$1['ID']>;
    id_not?: InputMaybe<Scalars$1['ID']>;
    id_not_in?: InputMaybe<Array<Scalars$1['ID']>>;
    sharesOwned_?: InputMaybe<PoolShare_Filter>;
    swaps_?: InputMaybe<Swap_Filter>;
    userInternalBalances_?: InputMaybe<UserInternalBalance_Filter>;
};
declare enum User_OrderBy {
    Id = "id",
    SharesOwned = "sharesOwned",
    Swaps = "swaps",
    UserInternalBalances = "userInternalBalances"
}
declare type PoolsQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<Pool_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Pool_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolsQuery = {
    __typename?: 'Query';
    pools: Array<{
        __typename?: 'Pool';
        id: string;
        address: string;
        poolType?: string | null;
        factory?: string | null;
        strategyType: number;
        symbol?: string | null;
        name?: string | null;
        swapEnabled: boolean;
        swapFee: string;
        owner?: string | null;
        totalWeight?: string | null;
        totalSwapVolume: string;
        totalSwapFee: string;
        totalLiquidity: string;
        totalShares: string;
        swapsCount: string;
        holdersCount: string;
        tokensList: Array<string>;
        amp?: string | null;
        expiryTime?: string | null;
        unitSeconds?: string | null;
        createTime: number;
        principalToken?: string | null;
        baseToken?: string | null;
        wrappedIndex?: number | null;
        mainIndex?: number | null;
        lowerTarget?: string | null;
        upperTarget?: string | null;
        sqrtAlpha?: string | null;
        sqrtBeta?: string | null;
        root3Alpha?: string | null;
        tokens?: Array<{
            __typename?: 'PoolToken';
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            address: string;
            balance: string;
            managedBalance: string;
            weight?: string | null;
            priceRate: string;
        }> | null;
    }>;
};
declare type PoolQueryVariables = Exact<{
    id: Scalars$1['ID'];
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolQuery = {
    __typename?: 'Query';
    pool?: {
        __typename?: 'Pool';
        id: string;
        address: string;
        poolType?: string | null;
        factory?: string | null;
        strategyType: number;
        symbol?: string | null;
        name?: string | null;
        swapEnabled: boolean;
        swapFee: string;
        owner?: string | null;
        totalWeight?: string | null;
        totalSwapVolume: string;
        totalSwapFee: string;
        totalLiquidity: string;
        totalShares: string;
        swapsCount: string;
        holdersCount: string;
        tokensList: Array<string>;
        amp?: string | null;
        expiryTime?: string | null;
        unitSeconds?: string | null;
        createTime: number;
        principalToken?: string | null;
        baseToken?: string | null;
        wrappedIndex?: number | null;
        mainIndex?: number | null;
        lowerTarget?: string | null;
        upperTarget?: string | null;
        sqrtAlpha?: string | null;
        sqrtBeta?: string | null;
        root3Alpha?: string | null;
        tokens?: Array<{
            __typename?: 'PoolToken';
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            address: string;
            balance: string;
            managedBalance: string;
            weight?: string | null;
            priceRate: string;
        }> | null;
    } | null;
};
declare type PoolsWithoutLinearQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<Pool_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Pool_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolsWithoutLinearQuery = {
    __typename?: 'Query';
    pools: Array<{
        __typename?: 'Pool';
        id: string;
        address: string;
        poolType?: string | null;
        symbol?: string | null;
        name?: string | null;
        swapFee: string;
        totalWeight?: string | null;
        totalSwapVolume: string;
        totalSwapFee: string;
        totalLiquidity: string;
        totalShares: string;
        swapsCount: string;
        holdersCount: string;
        tokensList: Array<string>;
        amp?: string | null;
        expiryTime?: string | null;
        unitSeconds?: string | null;
        principalToken?: string | null;
        baseToken?: string | null;
        swapEnabled: boolean;
        tokens?: Array<{
            __typename?: 'PoolToken';
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            address: string;
            balance: string;
            managedBalance: string;
            weight?: string | null;
            priceRate: string;
        }> | null;
    }>;
};
declare type PoolWithoutLinearQueryVariables = Exact<{
    id: Scalars$1['ID'];
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolWithoutLinearQuery = {
    __typename?: 'Query';
    pool?: {
        __typename?: 'Pool';
        id: string;
        address: string;
        poolType?: string | null;
        symbol?: string | null;
        name?: string | null;
        swapFee: string;
        totalWeight?: string | null;
        totalSwapVolume: string;
        totalSwapFee: string;
        totalLiquidity: string;
        totalShares: string;
        swapsCount: string;
        holdersCount: string;
        tokensList: Array<string>;
        amp?: string | null;
        expiryTime?: string | null;
        unitSeconds?: string | null;
        principalToken?: string | null;
        baseToken?: string | null;
        swapEnabled: boolean;
        tokens?: Array<{
            __typename?: 'PoolToken';
            id: string;
            symbol: string;
            name: string;
            decimals: number;
            address: string;
            balance: string;
            managedBalance: string;
            weight?: string | null;
            priceRate: string;
        }> | null;
    } | null;
};
declare type PoolHistoricalLiquiditiesQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<PoolHistoricalLiquidity_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PoolHistoricalLiquidity_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolHistoricalLiquiditiesQuery = {
    __typename?: 'Query';
    poolHistoricalLiquidities: Array<{
        __typename?: 'PoolHistoricalLiquidity';
        id: string;
        poolTotalShares: string;
        poolLiquidity: string;
        poolShareValue: string;
        pricingAsset: string;
        block: string;
        poolId: {
            __typename?: 'Pool';
            id: string;
        };
    }>;
};
declare type PoolSnapshotsQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<PoolSnapshot_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PoolSnapshot_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type PoolSnapshotsQuery = {
    __typename?: 'Query';
    poolSnapshots: Array<{
        __typename?: 'PoolSnapshot';
        id: string;
        totalShares: string;
        swapVolume: string;
        swapFees: string;
        timestamp: number;
        pool: {
            __typename?: 'Pool';
            id: string;
        };
    }>;
};
declare type JoinExitsQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<JoinExit_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<JoinExit_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type JoinExitsQuery = {
    __typename?: 'Query';
    joinExits: Array<{
        __typename?: 'JoinExit';
        amounts: Array<string>;
        id: string;
        sender: string;
        timestamp: number;
        tx: string;
        type: InvestType;
        user: {
            __typename?: 'User';
            id: string;
        };
        pool: {
            __typename?: 'Pool';
            id: string;
            tokensList: Array<string>;
        };
    }>;
};
declare type BalancersQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<Balancer_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Balancer_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type BalancersQuery = {
    __typename?: 'Query';
    balancers: Array<{
        __typename?: 'Balancer';
        id: string;
        totalLiquidity: string;
        totalSwapVolume: string;
        totalSwapFee: string;
        totalSwapCount: string;
        poolCount: number;
    }>;
};
declare type TokenPricesQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<TokenPrice_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<TokenPrice_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type TokenPricesQuery = {
    __typename?: 'Query';
    tokenPrices: Array<{
        __typename?: 'TokenPrice';
        id: string;
        asset: string;
        amount: string;
        pricingAsset: string;
        price: string;
        block: string;
        timestamp: number;
        poolId: {
            __typename?: 'Pool';
            id: string;
        };
    }>;
};
declare type TokenLatestPricesQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<LatestPrice_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<LatestPrice_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type TokenLatestPricesQuery = {
    __typename?: 'Query';
    latestPrices: Array<{
        __typename?: 'LatestPrice';
        id: string;
        asset: string;
        price: string;
        pricingAsset: string;
        poolId: {
            __typename?: 'Pool';
            id: string;
        };
    }>;
};
declare type TokenLatestPriceQueryVariables = Exact<{
    id: Scalars$1['ID'];
}>;
declare type TokenLatestPriceQuery = {
    __typename?: 'Query';
    latestPrice?: {
        __typename?: 'LatestPrice';
        id: string;
        asset: string;
        price: string;
        pricingAsset: string;
        poolId: {
            __typename?: 'Pool';
            id: string;
        };
    } | null;
};
declare type UserQueryVariables = Exact<{
    id: Scalars$1['ID'];
    block?: InputMaybe<Block_Height>;
}>;
declare type UserQuery = {
    __typename?: 'Query';
    user?: {
        __typename?: 'User';
        id: string;
        sharesOwned?: Array<{
            __typename?: 'PoolShare';
            balance: string;
            poolId: {
                __typename?: 'Pool';
                id: string;
            };
        }> | null;
    } | null;
};
declare type UsersQueryVariables = Exact<{
    skip?: InputMaybe<Scalars$1['Int']>;
    first?: InputMaybe<Scalars$1['Int']>;
    orderBy?: InputMaybe<User_OrderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<User_Filter>;
    block?: InputMaybe<Block_Height>;
}>;
declare type UsersQuery = {
    __typename?: 'Query';
    users: Array<{
        __typename?: 'User';
        id: string;
        sharesOwned?: Array<{
            __typename?: 'PoolShare';
            balance: string;
            poolId: {
                __typename?: 'Pool';
                id: string;
            };
        }> | null;
    }>;
};
declare type SdkFunctionWrapper = <T>(action: (requestHeaders?: Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;
declare function getSdk(client: GraphQLClient, withWrapper?: SdkFunctionWrapper): {
    Pools(variables?: PoolsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolsQuery>;
    Pool(variables: PoolQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolQuery>;
    PoolsWithoutLinear(variables?: PoolsWithoutLinearQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolsWithoutLinearQuery>;
    PoolWithoutLinear(variables: PoolWithoutLinearQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolWithoutLinearQuery>;
    PoolHistoricalLiquidities(variables?: PoolHistoricalLiquiditiesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolHistoricalLiquiditiesQuery>;
    PoolSnapshots(variables?: PoolSnapshotsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PoolSnapshotsQuery>;
    JoinExits(variables?: JoinExitsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<JoinExitsQuery>;
    Balancers(variables?: BalancersQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<BalancersQuery>;
    TokenPrices(variables?: TokenPricesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<TokenPricesQuery>;
    TokenLatestPrices(variables?: TokenLatestPricesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<TokenLatestPricesQuery>;
    TokenLatestPrice(variables: TokenLatestPriceQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<TokenLatestPriceQuery>;
    User(variables: UserQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UserQuery>;
    Users(variables?: UsersQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UsersQuery>;
};
declare type Sdk = ReturnType<typeof getSdk>;

declare type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
declare type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    BigDecimal: string;
    BigInt: string;
    Bytes: string;
};
declare enum Chain {
    Arbitrum = "Arbitrum",
    Optimism = "Optimism",
    Polygon = "Polygon"
}
declare type Gauge = {
    __typename?: 'Gauge';
    /**  Timestamp at which Balancer DAO added the gauge to GaugeController [seconds]  */
    addedTimestamp: Scalars['Int'];
    /**  Address of the gauge  */
    address: Scalars['Bytes'];
    /**  Equal to: <gaugeAddress>-<typeID>  */
    id: Scalars['ID'];
    /**  Reference to LiquidityGauge  */
    liquidityGauge?: Maybe<LiquidityGauge$1>;
    /**  Reference to RootGauge  */
    rootGauge?: Maybe<RootGauge>;
    /**  Type of the gauge  */
    type: GaugeType;
};
declare type GaugeFactory = {
    __typename?: 'GaugeFactory';
    /**  List of gauges created through the factory  */
    gauges?: Maybe<Array<LiquidityGauge$1>>;
    /**  Factory contract address  */
    id: Scalars['ID'];
    /**  Number of gauges created through the factory  */
    numGauges: Scalars['Int'];
};
declare type GaugeShare = {
    __typename?: 'GaugeShare';
    /**  User's balance of gauge deposit tokens  */
    balance: Scalars['BigDecimal'];
    /**  Reference to LiquidityGauge entity  */
    gauge: LiquidityGauge$1;
    /**  Equal to: <userAddress>-<gaugeAddress>  */
    id: Scalars['ID'];
    /**  Reference to User entity  */
    user: User;
};
declare type GaugeType = {
    __typename?: 'GaugeType';
    /**  Type ID  */
    id: Scalars['ID'];
    /**  Name of the type - empty string if call reverts  */
    name: Scalars['String'];
};
declare type GaugeVote = {
    __typename?: 'GaugeVote';
    /**  Reference to Gauge entity  */
    gauge: Gauge;
    /**  Equal to: <userAddress>-<gaugeAddress>  */
    id: Scalars['ID'];
    /**  Timestamp at which user voted [seconds]  */
    timestamp?: Maybe<Scalars['BigInt']>;
    /**  Reference to User entity  */
    user: User;
    /**  Weight of veBAL power user has used to vote  */
    weight?: Maybe<Scalars['BigDecimal']>;
};
declare type LiquidityGauge$1 = {
    __typename?: 'LiquidityGauge';
    /**  Factory contract address  */
    factory: GaugeFactory;
    /**  Reference to Gauge entity - created when LiquidityGauge is added to GaugeController */
    gauge?: Maybe<Gauge>;
    /**  LiquidityGauge contract address  */
    id: Scalars['ID'];
    /**  Whether Balancer DAO killed the gauge  */
    isKilled: Scalars['Boolean'];
    /**  Reference to Pool entity  */
    pool: Pool$1;
    /**  Address of the pool (lp_token of the gauge)  */
    poolAddress: Scalars['Bytes'];
    /**  Pool ID if lp_token is a Balancer pool; null otherwise  */
    poolId?: Maybe<Scalars['Bytes']>;
    /**  Relative weight cap of the gauge (0.01 = 1%) - V2 factories only  */
    relativeWeightCap?: Maybe<Scalars['BigDecimal']>;
    /**  List of user shares  */
    shares?: Maybe<Array<GaugeShare>>;
    /**  Address of the contract that streams reward tokens to the gauge - ChildChainLiquidityGauge only  */
    streamer?: Maybe<Scalars['Bytes']>;
    /**  ERC20 token symbol  */
    symbol: Scalars['String'];
    /**  List of reward tokens depositted in the gauge  */
    tokens?: Maybe<Array<RewardToken>>;
    /**  Total of BPTs users have staked in the LiquidityGauge  */
    totalSupply: Scalars['BigDecimal'];
};
declare type Pool$1 = {
    __typename?: 'Pool';
    /**  Address of the pool (lp_token of the gauge)  */
    address: Scalars['Bytes'];
    /**  List of gauges created for the pool  */
    gauges?: Maybe<Array<LiquidityGauge$1>>;
    /**  List of the pool's gauges addresses  */
    gaugesList: Array<Scalars['Bytes']>;
    /**  Address of the pool (lp_token of the gauge)  */
    id: Scalars['ID'];
    /**  Pool ID if lp_token is a Balancer pool; null otherwise  */
    poolId?: Maybe<Scalars['Bytes']>;
    /**  Most recent, unkilled gauge in the GaugeController  */
    preferentialGauge?: Maybe<LiquidityGauge$1>;
};
declare type RewardToken = {
    __typename?: 'RewardToken';
    /**  ERC20 token decimals - zero if call to decimals() reverts  */
    decimals: Scalars['Int'];
    /**  Reference to LiquidityGauge entity  */
    gauge: LiquidityGauge$1;
    /**  Equal to: <tokenAddress>-<gaugeAddress>  */
    id: Scalars['ID'];
    /**  ERC20 token symbol - empty string if call to symbol() reverts  */
    symbol: Scalars['String'];
    /**  Amount of reward tokens that has been deposited into the gauge  */
    totalDeposited: Scalars['BigDecimal'];
};
declare type RootGauge = {
    __typename?: 'RootGauge';
    /**  Chain where emissions by this gauge will be bridged to  */
    chain: Chain;
    /**  Factory contract address  */
    factory: GaugeFactory;
    /**  Reference to Gauge entity - created when LiquidityGauge is added to GaugeController */
    gauge?: Maybe<Gauge>;
    /**  RootGauge contract address */
    id: Scalars['ID'];
    /**  Whether Balancer DAO killed the gauge  */
    isKilled: Scalars['Boolean'];
    /**  Address where emissions by this gauge will be bridged to  */
    recipient: Scalars['Bytes'];
    /**  Relative weight cap of the gauge (0.01 = 1%) - V2 factories only  */
    relativeWeightCap?: Maybe<Scalars['BigDecimal']>;
};
declare type User = {
    __typename?: 'User';
    /**  List of gauge the user has shares  */
    gaugeShares?: Maybe<Array<GaugeShare>>;
    /**  List of votes on gauges  */
    gaugeVotes?: Maybe<Array<GaugeVote>>;
    /**  User address  */
    id: Scalars['ID'];
    /**  List of locks the user created  */
    votingLocks?: Maybe<Array<VotingEscrowLock>>;
};
declare type VotingEscrow = {
    __typename?: 'VotingEscrow';
    /**  VotingEscrow contract address  */
    id: Scalars['ID'];
    /**  List of veBAL locks created  */
    locks?: Maybe<Array<VotingEscrowLock>>;
    /**  Amount of B-80BAL-20WETH BPT locked  */
    stakedSupply: Scalars['BigDecimal'];
};
declare type VotingEscrowLock = {
    __typename?: 'VotingEscrowLock';
    /**  Equal to: <userAdress>-<votingEscrow>  */
    id: Scalars['ID'];
    /**  Amount of B-80BAL-20WETH BPT the user has locked  */
    lockedBalance: Scalars['BigDecimal'];
    /**  Timestamp at which B-80BAL-20WETH BPT can be unlocked by user [seconds]  */
    unlockTime?: Maybe<Scalars['BigInt']>;
    updatedAt: Scalars['Int'];
    /**  Reference to User entity  */
    user: User;
    /**  Reference to VotingEscrow entity  */
    votingEscrowID: VotingEscrow;
};

declare type SubgraphClient = Sdk;
declare type SubgraphLiquidityGauge = LiquidityGauge$1;

/**
 * Access liquidity gauges indexed by subgraph.
 * Because we have ~100 gauges to save on repeated http calls we cache all results as `gauges` on an instance.
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges
 */
declare class LiquidityGaugesSubgraphRepository implements Findable<SubgraphLiquidityGauge> {
    private client;
    gauges: SubgraphLiquidityGauge[];
    constructor(url: string);
    fetch(): Promise<SubgraphLiquidityGauge[]>;
    find(id: string): Promise<SubgraphLiquidityGauge | undefined>;
    findBy(param: string, value: string): Promise<SubgraphLiquidityGauge | undefined>;
}

interface LiquidityGauge {
    id: string;
    address: string;
    name: string;
    poolId?: Maybe$1<string>;
    poolAddress: string;
    totalSupply: number;
    workingSupply: number;
    relativeWeight: number;
    rewardTokens?: {
        [tokenAddress: string]: RewardData;
    };
}
declare class LiquidityGaugeSubgraphRPCProvider implements Findable<LiquidityGauge> {
    private chainId;
    gaugeController?: GaugeControllerMulticallRepository;
    multicall: LiquidityGaugesMulticallRepository;
    subgraph: LiquidityGaugesSubgraphRepository;
    workingSupplies: {
        [gaugeAddress: string]: number;
    };
    relativeWeights: {
        [gaugeAddress: string]: number;
    };
    rewardData: {
        [gaugeAddress: string]: {
            [tokenAddress: string]: RewardData;
        };
    };
    gauges?: Promise<LiquidityGauge[]>;
    constructor(subgraphUrl: string, multicallAddress: string, gaugeControllerAddress: string, chainId: Network, provider: Provider);
    fetch(): Promise<LiquidityGauge[]>;
    find(id: string): Promise<LiquidityGauge | undefined>;
    findBy(attribute: string, value: string): Promise<LiquidityGauge | undefined>;
    private compose;
}

declare type PoolAttribute = 'id' | 'address';
interface PoolRepository {
    skip?: number;
}
interface PoolsRepositoryFetchOptions {
    first?: number;
    skip?: number;
}
interface PoolsFallbackRepositoryOptions {
    timeout?: number;
}

declare type TokenAttribute = 'address' | 'symbol';
interface TokenProvider {
    find: (address: string) => Promise<Token | undefined>;
    findBy: (attribute: TokenAttribute, value: string) => Promise<Token | undefined>;
}

interface Findable<T, P = string> {
    find: (id: string) => Promise<T | undefined>;
    findBy: (attribute: P, value: string) => Promise<T | undefined>;
}
interface Searchable<T> {
    all: () => Promise<T[]>;
    where: (filters: (arg: T) => boolean) => Promise<T[]>;
}

/**
 * Weekly Bal emissions are fixed / year according to:
 * https://docs.google.com/spreadsheets/d/1FY0gi596YWBOTeu_mrxhWcdF74SwKMNhmu0qJVgs0KI/edit#gid=0
 *
 * Using regular numbers for simplicity assuming frontend use only.
 *
 * Calculation source
 * https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/liquidity-mining/contracts/BalancerTokenAdmin.sol
 */
declare const INITIAL_RATE = 145000;
declare const START_EPOCH_TIME = 1648465251;
/**
 * Weekly BAL emissions
 *
 * @param currentTimestamp used to get the epoch
 * @returns BAL emitted in a week
 */
declare const weekly: (currentTimestamp?: number) => number;
/**
 * Total BAL emitted in epoch (1 year)
 *
 * @param epoch starting from 0 for the first year of emissions
 * @returns BAL emitted in epoch
 */
declare const total: (epoch: number) => number;
/**
 * Total BAL emitted between two timestamps
 *
 * @param start starting timestamp
 * @param end ending timestamp
 * @returns BAL emitted in period
 */
declare const between: (start: number, end: number) => number;

declare const emissions_INITIAL_RATE: typeof INITIAL_RATE;
declare const emissions_START_EPOCH_TIME: typeof START_EPOCH_TIME;
declare const emissions_weekly: typeof weekly;
declare const emissions_total: typeof total;
declare const emissions_between: typeof between;
declare namespace emissions {
  export {
    emissions_INITIAL_RATE as INITIAL_RATE,
    emissions_START_EPOCH_TIME as START_EPOCH_TIME,
    emissions_weekly as weekly,
    emissions_total as total,
    emissions_between as between,
  };
}

interface PoolsBalancerAPIOptions {
    url: string;
    apiKey: string;
    query?: GraphQLQuery;
}
/**
 * Access pools using the Balancer GraphQL Api.
 *
 * Balancer's API URL: https://api.balancer.fi/query/
 */
declare class PoolsBalancerAPIRepository implements Findable<Pool, PoolAttribute> {
    private client;
    pools: Pool[];
    skip: number;
    nextToken: string | undefined;
    private query;
    constructor(options: PoolsBalancerAPIOptions);
    fetchFromCache(options?: PoolsRepositoryFetchOptions): Pool[];
    fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]>;
    find(id: string): Promise<Pool | undefined>;
    findBy(param: PoolAttribute, value: string): Promise<Pool | undefined>;
    /** Fixes any formatting issues from the subgraph
     *  - GraphQL can't store a map so pool.apr.[rewardAprs/tokenAprs].breakdown
     *    is JSON data that needs to be parsed so they match the Pool type correctly.
     */
    private format;
}

/**
 * The fallback provider takes multiple PoolRepository's in an array and uses them in order
 * falling back to the next one if a request times out.
 *
 * This is useful for using the Balancer API while being able to fall back to the graph if it is down
 * to ensure Balancer is maximally decentralized.
 **/
declare class PoolsFallbackRepository implements Findable<Pool, PoolAttribute> {
    private readonly providers;
    currentProviderIdx: number;
    timeout: number;
    constructor(providers: PoolRepository[], options?: PoolsFallbackRepositoryOptions);
    fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]>;
    get currentProvider(): PoolRepository | undefined;
    find(id: string): Promise<Pool | undefined>;
    findBy(attribute: PoolAttribute, value: string): Promise<Pool | undefined>;
    fallbackQuery(func: string, args: unknown[]): Promise<any>;
}

declare class PoolsStaticRepository implements Findable<Pool, PoolAttribute>, Searchable<Pool> {
    private pools;
    constructor(pools: Pool[]);
    find(id: string): Promise<Pool | undefined>;
    findBy(attribute: PoolAttribute, value: string): Promise<Pool | undefined>;
    all(): Promise<Pool[]>;
    where(filter: (pool: Pool) => boolean): Promise<Pool[]>;
}

interface PoolsSubgraphRepositoryOptions {
    url: string;
    chainId: Network;
    blockHeight?: () => Promise<number | undefined>;
    query?: GraphQLQuery;
}
/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
declare class PoolsSubgraphRepository implements Findable<Pool, PoolAttribute>, Searchable<Pool> {
    private client;
    private chainId;
    private pools?;
    skip: number;
    private blockHeight;
    private query;
    /**
     * Repository with optional lazy loaded blockHeight
     *
     * @param url subgraph URL
     * @param chainId current network, needed for L2s logic
     * @param blockHeight lazy loading blockHeigh resolver
     */
    constructor(options: PoolsSubgraphRepositoryOptions);
    fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]>;
    find(id: string): Promise<Pool | undefined>;
    findBy(param: PoolAttribute, value: string): Promise<Pool | undefined>;
    all(): Promise<Pool[]>;
    where(filter: (pool: Pool) => boolean): Promise<Pool[]>;
    private mapType;
}

declare class StaticTokenProvider implements Findable<Token, TokenAttribute> {
    private tokens;
    constructor(tokens: Token[]);
    find(address: string): Promise<Token | undefined>;
    findBy(attribute: TokenAttribute, value: string): Promise<Token | undefined>;
}

interface TokenPriceProvider {
    find: (address: string) => Promise<Price | undefined>;
}

declare class StaticTokenPriceProvider implements TokenPriceProvider {
    private tokenPrices;
    constructor(tokenPrices: TokenPrices);
    /**
     * Iterates through all tokens and calculates USD prices
     * based on data the tokens already have.
     */
    calculateUSDPrices(): void;
    find(address: string): Promise<Price | undefined>;
    findBy(attribute: string, value: string): Promise<Price | undefined>;
}

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
declare class CoingeckoPriceRepository implements Findable<Price> {
    prices: TokenPrices;
    fetching: {
        [address: string]: Promise<TokenPrices>;
    };
    urlBase: string;
    baseTokenAddresses: string[];
    constructor(tokenAddresses: string[], chainId?: number);
    fetch(address: string): {
        [address: string]: Promise<TokenPrices>;
    };
    find(address: string): Promise<Price | undefined>;
    findBy(attribute: string, value: string): Promise<Price | undefined>;
    private platform;
    private url;
    private addresses;
}

interface FeeDistributorData {
    balAmount: number;
    bbAUsdAmount: number;
    veBalSupply: number;
    bbAUsdPrice: number;
    balAddress: string;
}
interface BaseFeeDistributor {
    multicallData: (ts: number) => Promise<FeeDistributorData>;
}
declare class FeeDistributorRepository implements BaseFeeDistributor {
    private feeDistributorAddress;
    private balAddress;
    private veBalAddress;
    private bbAUsdAddress;
    multicall: Contract;
    data?: FeeDistributorData;
    constructor(multicallAddress: string, feeDistributorAddress: string, balAddress: string, veBalAddress: string, bbAUsdAddress: string, provider: Provider);
    fetch(timestamp: number): Promise<FeeDistributorData>;
    multicallData(timestamp: number): Promise<FeeDistributorData>;
    getPreviousWeek(fromTimestamp: number): number;
}

declare class FeeCollectorRepository implements Findable<number> {
    private provider;
    vault: Contract;
    swapFeePercentage?: number;
    constructor(vaultAddress: string, provider: Provider);
    fetch(): Promise<number>;
    find(): Promise<number>;
    findBy(): Promise<number>;
}

/**
 * Common interface for fetching APR from external sources
 *
 * @param address is optional, used when same source, eg: aave has multiple tokens and all of them can be fetched in one call.
 */
interface AprFetcher {
    (): Promise<{
        [address: string]: number;
    }>;
}
declare class TokenYieldsRepository implements Findable<number> {
    private sources;
    private yields;
    constructor(sources?: {
        [address: string]: AprFetcher;
    });
    fetch(address: string): Promise<void>;
    find(address: string): Promise<number | undefined>;
    findBy(attribute: string, value: string): Promise<number | undefined>;
}

declare class BlockNumberRepository implements Findable<number> {
    private endpoint;
    blocks: {
        [ts: string]: Promise<number>;
    };
    constructor(endpoint: string);
    find(from: string): Promise<number | undefined>;
    findBy(attribute?: string, value?: string): Promise<number | undefined>;
}

declare class Data implements BalancerDataRepositories {
    pools: PoolsSubgraphRepository;
    yesterdaysPools: PoolsSubgraphRepository | undefined;
    tokenPrices: CoingeckoPriceRepository;
    tokenMeta: StaticTokenProvider;
    liquidityGauges: LiquidityGaugeSubgraphRPCProvider | undefined;
    feeDistributor: FeeDistributorRepository | undefined;
    feeCollector: FeeCollectorRepository;
    tokenYields: TokenYieldsRepository;
    blockNumbers: BlockNumberRepository | undefined;
    constructor(networkConfig: BalancerNetworkConfig, provider: Provider);
}

declare type GraphQLFilterOperator = 'gt' | 'lt' | 'eq' | 'in' | 'not_in' | 'contains';
declare type GraphQLFilter = {
    [operator in GraphQLFilterOperator]?: any;
};
interface GraphQLArgs {
    chainId?: number;
    first?: number;
    skip?: number;
    nextToken?: string;
    orderBy?: string;
    orderDirection?: string;
    block?: {
        number?: number;
    };
    where?: Record<string, GraphQLFilter>;
}
interface GraphQLArgsFormatter {
    format(args: GraphQLArgs): unknown;
}

declare class BalancerAPIArgsFormatter implements GraphQLArgsFormatter {
    format(args: GraphQLArgs): GraphQLArgs;
}

declare class SubgraphArgsFormatter implements GraphQLArgsFormatter {
    operatorMap: Record<string, string>;
    constructor();
    format(args: GraphQLArgs): GraphQLArgs;
}

declare class GraphQLArgsBuilder {
    readonly args: GraphQLArgs;
    constructor(args: GraphQLArgs);
    merge(other: GraphQLArgsBuilder): GraphQLArgsBuilder;
    format(formatter: GraphQLArgsFormatter): unknown;
}

interface AprBreakdown {
    swapFees: number;
    tokenAprs: {
        total: number;
        breakdown: {
            [address: string]: number;
        };
    };
    stakingApr: {
        min: number;
        max: number;
    };
    rewardAprs: {
        total: number;
        breakdown: {
            [address: string]: number;
        };
    };
    protocolApr: number;
    min: number;
    max: number;
}
/**
 * Calculates pool APR via summing up sources of APR:
 *
 * 1. Swap fees (pool level) data coming from subgraph
 * 2. Yield bearing pool tokens, with data from external sources eg: http endpoints, subgraph, onchain
 *    * stETH
 *    * aave
 *    * usd+
 *    map token: calculatorFn
 * 3. Staking rewards based from veBal gauges
 */
declare class PoolApr {
    private pools;
    private tokenPrices;
    private tokenMeta;
    private tokenYields;
    private feeCollector;
    private yesterdaysPools?;
    private liquidityGauges?;
    private feeDistributor?;
    constructor(pools: Findable<Pool, PoolAttribute>, tokenPrices: Findable<Price>, tokenMeta: Findable<Token, TokenAttribute>, tokenYields: Findable<number>, feeCollector: Findable<number>, yesterdaysPools?: Findable<Pool, PoolAttribute> | undefined, liquidityGauges?: Findable<LiquidityGauge, string> | undefined, feeDistributor?: BaseFeeDistributor | undefined);
    /**
     * Pool revenue via swap fees.
     * Fees and liquidity are takes from subgraph as USD floats.
     *
     * @returns APR [bsp] from fees accumulated over last 24h
     */
    swapFees(pool: Pool): Promise<number>;
    /**
     * Pool revenue from holding yield-bearing wrapped tokens.
     *
     * @returns APR [bsp] from tokens contained in the pool
     */
    tokenAprs(pool: Pool): Promise<AprBreakdown['tokenAprs']>;
    /**
     * Calculates staking rewards based on veBal gauges deployed with Curve Finance contracts.
     * https://curve.readthedocs.io/dao-gauges.html
     *
     * Terminology:
     *  - LP token of a gauge is a BPT of a pool
     *  - Depositing into a gauge is called staking on the frontend
     *  - gauge totalSupply - BPT tokens deposited to a gauge
     *  - gauge workingSupply - effective BPT tokens participating in reward distribution. sum of 40% deposit + 60% boost from individual user's veBal
     *  - gauge relative weight - weight of this gauge in bal inflation distribution [0..1] scaled to 1e18
     *
     * APR sources:
     *  - gauge BAL emissions = min: 40% of totalSupply, max: 40% of totalSupply + 60% of totalSupply * gauge LPs voting power
     *    https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/liquidity-mining/contracts/gauges/ethereum/LiquidityGaugeV5.vy#L338
     *  - gauge reward tokens: Admin or designated depositor has an option to deposit additional reward with a weekly accruing cadence.
     *    https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/liquidity-mining/contracts/gauges/ethereum/LiquidityGaugeV5.vy#L641
     *    rate: amount of token per second
     *
     * @param pool
     * @param boost range between 1 and 2.5
     * @returns APR [bsp] from protocol rewards.
     */
    stakingApr(pool: Pool, boost?: number): Promise<number>;
    /**
     * Some gauges are holding tokens distributed as rewards to LPs.
     *
     * @param pool
     * @returns APR [bsp] from token rewards.
     */
    rewardAprs(pool: Pool): Promise<AprBreakdown['rewardAprs']>;
    /**
     * 80BAL-20WETH pool is accruing protocol revenue.
     *
     * @param pool
     * @returns accrued protocol revenue as APR [bsp]
     */
    protocolApr(pool: Pool): Promise<number>;
    /**
     * Composes all sources for total pool APR.
     *
     * @returns pool APR split [bsp]
     */
    apr(pool: Pool): Promise<AprBreakdown>;
    private last24hFees;
    /**
     * Total Liquidity based on USD token prices taken from external price feed, eg: coingecko.
     *
     * @param pool
     * @returns Pool liquidity in USD
     */
    private totalLiquidity;
    /**
     * BPT price as pool totalLiquidity / pool total Shares
     * Total Liquidity is calculated based on USD token prices taken from external price feed, eg: coingecko.
     *
     * @param pool
     * @returns BPT price in USD
     */
    private bptPrice;
    private protocolSwapFeePercentage;
    private rewardTokenApr;
}

declare type Address = string;
interface BalancerSdkConfig {
    network: Network | BalancerNetworkConfig;
    rpcUrl: string;
    customSubgraphUrl?: string;
    sor?: Partial<BalancerSdkSorConfig>;
}
interface BalancerSdkSorConfig {
    tokenPriceService: 'coingecko' | 'subgraph' | TokenPriceService;
    poolDataService: 'subgraph' | PoolDataService;
    fetchOnChainBalances: boolean;
}
interface ContractAddresses {
    vault: string;
    multicall: string;
    lidoRelayer?: string;
    gaugeController?: string;
    feeDistributor?: string;
}
interface BalancerNetworkConfig {
    chainId: Network;
    addresses: {
        contracts: ContractAddresses;
        tokens: {
            wrappedNativeAsset: string;
            lbpRaisingTokens?: string[];
            stETH?: string;
            wstETH?: string;
            bal?: string;
            veBal?: string;
            bbaUsd?: string;
        };
    };
    urls: {
        subgraph: string;
        gaugesSubgraph?: string;
        blockNumberSubgraph?: string;
    };
    pools: {
        wETHwstETH?: PoolReference;
    };
}
interface BalancerDataRepositories {
    pools: Findable<Pool, PoolAttribute> & Searchable<Pool>;
    yesterdaysPools?: Findable<Pool, PoolAttribute> & Searchable<Pool>;
    tokenPrices: Findable<Price>;
    tokenMeta: Findable<Token, TokenAttribute>;
    liquidityGauges?: Findable<LiquidityGauge>;
    feeDistributor?: BaseFeeDistributor;
    feeCollector: Findable<number>;
    tokenYields: Findable<number>;
}
declare type PoolReference = {
    id: string;
    address: string;
};
declare enum PoolSpecialization {
    GeneralPool = 0,
    MinimalSwapInfoPool = 1,
    TwoTokenPool = 2
}
declare type JoinPoolRequest = {
    assets: string[];
    maxAmountsIn: BigNumberish[];
    userData: string;
    fromInternalBalance: boolean;
};
declare type ExitPoolRequest = {
    assets: string[];
    minAmountsOut: string[];
    userData: string;
    toInternalBalance: boolean;
};
declare enum UserBalanceOpKind {
    DepositInternal = 0,
    WithdrawInternal = 1,
    TransferInternal = 2,
    TransferExternal = 3
}
declare type UserBalanceOp = {
    kind: UserBalanceOpKind;
    asset: string;
    amount: BigNumberish;
    sender: string;
    recipient: string;
};
declare enum PoolBalanceOpKind {
    Withdraw = 0,
    Deposit = 1,
    Update = 2
}
declare type PoolBalanceOp = {
    kind: PoolBalanceOpKind;
    poolId: string;
    token: string;
    amount: BigNumberish;
};
interface TransactionData {
    contract?: Contract;
    function: string;
    params: string[];
    outputs?: {
        amountsIn?: string[];
        amountsOut?: string[];
    };
}
declare type Currency = 'eth' | 'usd';
declare type Price = {
    [currency in Currency]?: string;
};
declare type TokenPrices = {
    [address: string]: Price;
};
interface Token {
    address: string;
    decimals?: number;
    symbol?: string;
    price?: Price;
}
interface PoolToken extends Token {
    balance: string;
    priceRate?: string;
    weight?: string | null;
}
interface OnchainTokenData {
    balance: string;
    weight: number;
    decimals: number;
    logoURI: string | undefined;
    name: string;
    symbol: string;
}
interface OnchainPoolData {
    tokens: Record<Address, OnchainTokenData>;
    totalSupply: string;
    decimals: number;
    swapFee: string;
    amp?: string;
    swapEnabled: boolean;
    tokenRates?: string[];
}
declare enum PoolType {
    Weighted = "Weighted",
    Investment = "Investment",
    Stable = "Stable",
    ComposableStable = "ComposableStable",
    MetaStable = "MetaStable",
    StablePhantom = "StablePhantom",
    LiquidityBootstrapping = "LiquidityBootstrapping",
    AaveLinear = "AaveLinear",
    ERC4626Linear = "ERC4626Linear",
    Element = "Element",
    Gyro2 = "Gyro2",
    Gyro3 = "Gyro3"
}
interface Pool {
    id: string;
    name: string;
    address: string;
    chainId: number;
    poolType: PoolType;
    swapFee: string;
    owner?: string;
    factory?: string;
    tokens: PoolToken[];
    tokensList: string[];
    tokenAddresses?: string[];
    totalLiquidity: string;
    totalShares: string;
    totalSwapFee?: string;
    totalSwapVolume?: string;
    onchain?: OnchainPoolData;
    createTime?: number;
    mainTokens?: string[];
    wrappedTokens?: string[];
    unwrappedTokens?: string[];
    isNew?: boolean;
    volumeSnapshot?: string;
    feesSnapshot?: string;
    boost?: string;
    symbol?: string;
    swapEnabled: boolean;
    amp?: string;
    apr?: AprBreakdown;
    liquidity?: string;
    totalWeight: string;
    mainIndex?: number;
    wrappedIndex?: number;
}
/**
 * Pool use-cases / controller layer
 */
interface PoolWithMethods extends Pool {
    buildJoin: (joiner: string, tokensIn: string[], amountsIn: string[], slippage: string) => JoinPoolAttributes;
    calcPriceImpact: (amountsIn: string[], minBPTOut: string) => Promise<string>;
    buildExitExactBPTIn: (exiter: string, bptIn: string, slippage: string, shouldUnwrapNativeAsset?: boolean, singleTokenMaxOut?: string) => ExitPoolAttributes;
    buildExitExactTokensOut: (exiter: string, tokensOut: string[], amountsOut: string[], slippage: string) => ExitPoolAttributes;
    calcSpotPrice: (tokenIn: string, tokenOut: string) => string;
}
interface GraphQLQuery {
    args: GraphQLArgs;
    attrs: any;
}

/**
 * Splits a poolId into its components, i.e. pool address, pool specialization and its nonce
 * @param poolId - a bytes32 string of the pool's ID
 * @returns an object with the decomposed poolId
 */
declare const splitPoolId: (poolId: string) => {
    address: string;
    specialization: PoolSpecialization;
    nonce: BigNumber;
};
/**
 * Extracts a pool's address from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's address
 */
declare const getPoolAddress: (poolId: string) => string;
/**
 * Extracts a pool's specialization from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's specialization
 */
declare const getPoolSpecialization: (poolId: string) => PoolSpecialization;
/**
 * Extracts a pool's nonce from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's nonce
 */
declare const getPoolNonce: (poolId: string) => BigNumber;

declare class BalancerErrors {
    /**
     * Cannot be constructed.
     */
    private constructor();
    static isErrorCode: (error: string) => boolean;
    /**
     * Decodes a Balancer error code into the corresponding reason
     * @param error - a Balancer error code of the form `BAL#000`
     * @returns The decoded error reason
     */
    static parseErrorCode: (error: string) => string;
    /**
     * Decodes a Balancer error code into the corresponding reason
     * @param error - a Balancer error code of the form `BAL#000`
     * @returns The decoded error reason if passed a valid error code, otherwise returns passed input
     */
    static tryParseErrorCode: (error: string) => string;
    /**
     * Tests whether a string is a known Balancer error message
     * @param error - a string to be checked verified as a Balancer error message
     */
    static isBalancerError: (error: string) => boolean;
    /**
     * Encodes an error string into the corresponding error code
     * @param error - a Balancer error message string
     * @returns a Balancer error code of the form `BAL#000`
     */
    static encodeError: (error: string) => string;
}

declare type Account = string | Signer | Contract;
declare function accountToAddress(account: Account): Promise<string>;
declare enum RelayerAction {
    JoinPool = "JoinPool",
    ExitPool = "ExitPool",
    Swap = "Swap",
    BatchSwap = "BatchSwap",
    SetRelayerApproval = "SetRelayerApproval"
}
declare class RelayerAuthorization {
    /**
     * Cannot be constructed.
     */
    private constructor();
    static encodeCalldataAuthorization: (calldata: string, deadline: BigNumberish, signature: string) => string;
    static signJoinAuthorization: (validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
    static signExitAuthorization: (validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
    static signSwapAuthorization: (validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
    static signBatchSwapAuthorization: (validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
    static signSetRelayerApprovalAuthorization: (validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
    static signAuthorizationFor: (type: RelayerAction, validator: Contract, user: Signer & TypedDataSigner, allowedSender: Account, allowedCalldata: string, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<string>;
}
declare class BalancerMinterAuthorization {
    /**
     * Cannot be constructed.
     */
    private constructor();
    static signSetMinterApproval: (minterContract: Contract, minter: Account, approval: boolean, user: Signer & TypedDataSigner, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<{
        v: number;
        r: string;
        s: string;
        deadline: BigNumber;
    }>;
}

declare const signPermit: (token: Contract, owner: Signer & TypedDataSigner, spender: Account, amount: BigNumberish, deadline?: BigNumberish, nonce?: BigNumberish) => Promise<{
    v: number;
    r: string;
    s: string;
    deadline: BigNumber;
    nonce: BigNumber;
}>;

declare class AssetHelpers {
    readonly ETH: string;
    readonly WETH: string;
    constructor(wethAddress: string);
    static isEqual: (addressA: string, addressB: string) => boolean;
    /**
     * Tests whether `token` is ETH (represented by `0x0000...0000`).
     *
     * @param token - the address of the asset to be checked
     */
    isETH: (token: string) => boolean;
    /**
     * Tests whether `token` is WETH.
     *
     * @param token - the address of the asset to be checked
     */
    isWETH: (token: string) => boolean;
    /**
     * Converts an asset to the equivalent ERC20 address.
     *
     * For ERC20s this will return the passed address but passing ETH (`0x0000...0000`) will return the WETH address
     * @param token - the address of the asset to be translated to an equivalent ERC20
     * @returns the address of translated ERC20 asset
     */
    translateToERC20: (token: string) => string;
    /**
     * Sorts an array of token addresses into ascending order to match the format expected by the Vault.
     *
     * Passing additional arrays will result in each being sorted to maintain relative ordering to token addresses.
     *
     * The zero address (representing ETH) is sorted as if it were the WETH address.
     * This matches the behaviour expected by the Vault when receiving an array of addresses.
     *
     * @param tokens - an array of token addresses to be sorted in ascending order
     * @param others - a set of arrays to be sorted in the same order as the tokens, e.g. token weights or asset manager addresses
     * @returns an array of the form `[tokens, ...others]` where each subarray has been sorted to maintain its ordering relative to `tokens`
     *
     * @example
     * const [tokens] = sortTokens([tokenB, tokenC, tokenA])
     * const [tokens, weights] = sortTokens([tokenB, tokenC, tokenA], [weightB, weightC, weightA])
     * // where tokens = [tokenA, tokenB, tokenC], weights = [weightA, weightB, weightC]
     */
    sortTokens(tokens: string[], ...others: unknown[][]): [string[], ...unknown[][]];
}

declare class AaveHelpers {
    static getRate(rateProviderAddress: string, provider: JsonRpcProvider): Promise<string>;
}

/**
 * Parse pool info into EVM amounts
 * @param {Pool}  pool
 * @returns       parsed pool info
 */
declare const parsePoolInfo: (pool: Pool) => {
    parsedTokens: string[];
    parsedDecimals: (string | undefined)[];
    parsedBalances: string[];
    parsedWeights: (string | undefined)[];
    parsedPriceRates: (string | undefined)[];
    parsedAmp: string | undefined;
    parsedTotalShares: string;
    parsedSwapFee: string;
};

declare function tokensToTokenPrices(tokens: Token[]): TokenPrices;

declare const isSameAddress: (address1: string, address2: string) => boolean;

declare enum SwapType {
    SwapExactIn = 0,
    SwapExactOut = 1
}
declare type FundManagement = {
    sender: string;
    recipient: string;
    fromInternalBalance: boolean;
    toInternalBalance: boolean;
};
declare type SingleSwap = {
    poolId: string;
    kind: SwapType;
    assetIn: string;
    assetOut: string;
    amount: BigNumberish;
    userData: string;
};
declare type Swap = {
    request: SingleSwap;
    funds: FundManagement;
    limit: BigNumberish;
    deadline: BigNumberish;
    value?: BigNumberish;
    outputReference?: BigNumberish;
};
declare type BatchSwapStep = {
    poolId: string;
    assetInIndex: number;
    assetOutIndex: number;
    amount: string;
    userData: string;
};
declare type BatchSwap = {
    kind: SwapType;
    swaps: BatchSwapStep[];
    assets: string[];
    funds: FundManagement;
    limits: BigNumberish[];
    deadline: BigNumberish;
    value?: BigNumberish;
    outputReferences?: {
        index: BigNumberish;
        key: BigNumberish;
    }[];
};
interface FetchPoolsInput {
    fetchPools: boolean;
    fetchOnChain: boolean;
}
interface QueryWithSorInput {
    tokensIn: string[];
    tokensOut: string[];
    swapType: SwapType;
    amounts: string[];
    fetchPools: FetchPoolsInput;
}
interface SwapInput {
    tokenIn: string;
    tokenOut: string;
    swapType: SwapType;
    amount: string;
}
interface QueryWithSorOutput {
    returnAmounts: string[];
    swaps: BatchSwapStep[];
    assets: string[];
    deltas: string[];
}
interface QuerySimpleFlashSwapParameters {
    poolIds: string[];
    assets: BatchSwap['assets'];
    flashLoanAmount: string;
    vaultContract: Vault;
}
interface SimpleFlashSwapParameters {
    poolIds: string[];
    assets: BatchSwap['assets'];
    flashLoanAmount: string;
    walletAddress: string;
}
interface QuerySimpleFlashSwapResponse {
    profits: Record<string, string>;
    isProfitable: boolean;
}
interface FindRouteParameters {
    tokenIn: string;
    tokenOut: string;
    amount: BigNumber;
    gasPrice: BigNumber;
    maxPools: number;
}
interface BuildTransactionParameters {
    userAddress: string;
    recipient?: string;
    swapInfo: SwapInfo;
    kind: SwapType;
    deadline: BigNumber;
    maxSlippage: number;
}
interface SwapTransactionRequest {
    to: string;
    data: string;
    value?: BigNumber;
}
interface SwapAttributes {
    to: string;
    functionName: string;
    attributes: Swap | BatchSwap;
    data: string;
    value?: BigNumber;
}

/**
 * Helper to create limits using a defined slippage amount.
 * @param tokensIn - Array of token in addresses.
 * @param tokensOut - Array of token out addresses.
 * @param swapType - Type of swap - SwapExactIn or SwapExactOut
 * @param deltas - An array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.
 * @param assets - array contains the addresses of all assets involved in the swaps.
 * @param slippage - Slippage to be applied. i.e. 5%=50000000000000000.
 * @returns Returns an array (same length as assets) with limits applied for each asset.
 */
declare function getLimitsForSlippage(tokensIn: string[], tokensOut: string[], swapType: SwapType, deltas: BigNumberish[], assets: string[], slippage: BigNumberish): BigNumberish[];

interface PoolBPTValue {
    address: string;
    liquidity: string;
}
declare class Liquidity {
    private pools;
    private tokenPrices;
    constructor(pools: Findable<Pool, PoolAttribute>, tokenPrices: TokenPriceProvider);
    getLiquidity(pool: Pool): Promise<string>;
}

declare class Swaps {
    readonly sor: SOR;
    chainId: number;
    vaultContract: Vault;
    constructor(sorOrConfig: SOR | BalancerSdkConfig);
    static getLimitsForSlippage(tokensIn: string[], tokensOut: string[], swapType: SwapType, deltas: string[], assets: string[], slippage: string): string[];
    /**
     * Uses SOR to find optimal route for a trading pair and amount
     *
     * @param FindRouteParameters
     * @param FindRouteParameters.tokenIn Address
     * @param FindRouteParameters.tokenOut Address
     * @param FindRouteParameters.amount BigNumber with a trade amount
     * @param FindRouteParameters.gasPrice BigNumber current gas price
     * @param FindRouteParameters.maxPools number of pool included in path
     * @returns Best trade route information
     */
    findRouteGivenIn({ tokenIn, tokenOut, amount, gasPrice, maxPools, }: FindRouteParameters): Promise<SwapInfo>;
    /**
     * Uses SOR to find optimal route for a trading pair and amount
     *
     * @param FindRouteParameters
     * @param FindRouteParameters.tokenIn Address
     * @param FindRouteParameters.tokenOut Address
     * @param FindRouteParameters.amount BigNumber with a trade amount
     * @param FindRouteParameters.gasPrice BigNumber current gas price
     * @param FindRouteParameters.maxPools number of pool included in path
     * @returns Best trade route information
     */
    findRouteGivenOut({ tokenIn, tokenOut, amount, gasPrice, maxPools, }: FindRouteParameters): Promise<SwapInfo>;
    /**
     * Uses SOR to find optimal route for a trading pair and amount
     *
     * @param BuildTransactionParameters
     * @param BuildTransactionParameters.userAddress Address
     * @param BuildTransactionParameters.swapInfo result of route finding
     * @param BuildTransactionParameters.kind 0 - givenIn, 1 - givenOut
     * @param BuildTransactionParameters.deadline BigNumber block timestamp
     * @param BuildTransactionParameters.maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
     * @returns transaction request ready to send with signer.sendTransaction
     */
    buildSwap({ userAddress, recipient, swapInfo, kind, deadline, maxSlippage, }: BuildTransactionParameters): SwapAttributes;
    /**
     * Encode batchSwap in an ABI byte string
     *
     * [See method for a batchSwap](https://dev.balancer.fi/references/contracts/apis/the-vault#batch-swaps).
     *
     * _NB: This method doesn't execute a batchSwap -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
     * containing the data of the function call on a contract, which can then be sent to the network to be executed.
     * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
     *
     * @param {BatchSwap}           batchSwap - BatchSwap information used for query.
     * @param {SwapType}            batchSwap.kind - either exactIn or exactOut
     * @param {BatchSwapSteps[]}    batchSwap.swaps - sequence of swaps
     * @param {string[]}            batchSwap.assets - array contains the addresses of all assets involved in the swaps
     * @param {FundManagement}      batchSwap.funds - object containing information about where funds should be taken/sent
     * @param {number[]}            batchSwap.limits - limits for each token involved in the swap, where either the maximum number of tokens to send (by passing a positive value) or the minimum amount of tokens to receive (by passing a negative value) is specified
     * @param {string}              batchSwap.deadline -  time (in Unix timestamp) after which it will no longer attempt to make a trade
     * @returns {string}            encodedBatchSwapData - Returns an ABI byte string containing the data of the function call on a contract
     */
    static encodeBatchSwap(batchSwap: BatchSwap): string;
    /**
     * Encode simple flash swap into a ABI byte string
     *
     * A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
     * swapping in the first pool and then back in the second pool for a profit. For more
     * complex flash swaps, you will have to use the batch swap method.
     *
     * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
     *
     * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
     * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
     * @param {string[]}                    params.poolIds - array of Balancer pool ids
     * @param {string[]}                    params.assets - array of token addresses
     * @param {string}                      params.walletAddress - array of token addresses
     * @returns {string}                    encodedBatchSwapData - Returns an ABI byte string containing the data of the function call on a contract
     */
    static encodeSimpleFlashSwap(params: SimpleFlashSwapParameters): string;
    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    fetchPools(): Promise<boolean>;
    getPools(): SubgraphPoolBase[];
    /**
     * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
     * @param batchSwap - BatchSwap information used for query.
     * @param {SwapType} batchSwap.kind - either exactIn or exactOut.
     * @param {BatchSwapStep[]} batchSwap.swaps - sequence of swaps.
     * @param {string[]} batchSwap.assets - array contains the addresses of all assets involved in the swaps.
     * @returns {Promise<string[]>} Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
     * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
     * the same index in the `assets` array.
     */
    queryBatchSwap(batchSwap: Pick<BatchSwap, 'kind' | 'swaps' | 'assets'>): Promise<string[]>;
    /**
     * Uses SOR to create and query a batchSwap.
     * @param {QueryWithSorInput} queryWithSor - Swap information used for querying using SOR.
     * @param {string[]} queryWithSor.tokensIn - Array of addresses of assets in.
     * @param {string[]} queryWithSor.tokensOut - Array of addresses of assets out.
     * @param {SwapType} queryWithSor.swapType - Type of Swap, ExactIn/Out.
     * @param {string[]} queryWithSor.amounts - Array of amounts used in swap.
     * @param {FetchPoolsInput} queryWithSor.fetchPools - Set whether SOR will fetch updated pool info.
     * @returns {Promise<QueryWithSorOutput>} Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
     */
    queryBatchSwapWithSor(queryWithSor: QueryWithSorInput): Promise<QueryWithSorOutput>;
    /**
     * Simple interface to test if a simple flash swap is valid and see potential profits.
     *
     * A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
     * swapping in the first pool and then back in the second pool for a profit. For more
     * complex flash swaps, you will have to use the batch swap method.
     *
     * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
     *
     * _NB: This method doesn't execute a flashSwap
     *
     * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
     * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
     * @param {string[]}                    params.poolIds - array of Balancer pool ids
     * @param {string[]}                    params.assets - array of token addresses
     * @returns {Promise<{profits: Record<string, string>, isProfitable: boolean}>}       Returns an ethersjs transaction response
     */
    querySimpleFlashSwap(params: Omit<QuerySimpleFlashSwapParameters, 'vaultContract'>): Promise<QuerySimpleFlashSwapResponse>;
    /**
     * Use SOR to get swapInfo for tokenIn<>tokenOut.
     * @param {SwapInput} swapInput - Swap information used for querying using SOR.
     * @param {string} swapInput.tokenIn - Addresse of asset in.
     * @param {string} swapInput.tokenOut - Addresse of asset out.
     * @param {SwapType} swapInput.swapType - Type of Swap, ExactIn/Out.
     * @param {string} swapInput.amount - Amount used in swap.
     * @returns {Promise<SwapInfo>} SOR swap info.
     */
    getSorSwap(swapInput: SwapInput): Promise<SwapInfo>;
}

declare type OutputReference = {
    index: number;
    key: BigNumber;
};
interface EncodeBatchSwapInput {
    swapType: SwapType;
    swaps: BatchSwapStep[];
    assets: string[];
    funds: FundManagement;
    limits: string[];
    deadline: BigNumberish;
    value: BigNumberish;
    outputReferences: OutputReference[];
}
interface EncodeExitPoolInput {
    poolId: string;
    poolKind: number;
    sender: string;
    recipient: string;
    outputReferences: OutputReference[];
    exitPoolRequest: ExitPoolRequest;
}
interface EncodeJoinPoolInput {
    poolId: string;
    poolKind: number;
    sender: string;
    recipient: string;
    outputReferences: OutputReference[];
    joinPoolRequest: JoinPoolRequest;
}
interface EncodeUnwrapAaveStaticTokenInput {
    staticToken: string;
    sender: string;
    recipient: string;
    amount: BigNumberish;
    toUnderlying: boolean;
    outputReferences: BigNumberish;
}
interface ExitAndBatchSwapInput {
    exiter: string;
    swapRecipient: string;
    poolId: string;
    exitTokens: string[];
    userData: string;
    expectedAmountsOut: string[];
    finalTokensOut: string[];
    slippage: string;
    fetchPools: FetchPoolsInput;
}
declare type ExitPoolData = ExitPoolRequest & EncodeExitPoolInput;

declare class Relayer {
    private readonly swaps;
    static CHAINED_REFERENCE_PREFIX: string;
    constructor(swapsOrConfig: Swaps | BalancerSdkConfig);
    static encodeApproveVault(tokenAddress: string, maxAmount: string): string;
    static encodeSetRelayerApproval(relayerAdress: string, approved: boolean, authorisation: string): string;
    static encodeGaugeWithdraw(gaugeAddress: string, sender: string, recipient: string, amount: string): string;
    static encodeGaugeDeposit(gaugeAddress: string, sender: string, recipient: string, amount: string): string;
    static encodeBatchSwap(params: EncodeBatchSwapInput): string;
    static encodeExitPool(params: EncodeExitPoolInput): string;
    static encodeUnwrapAaveStaticToken(params: EncodeUnwrapAaveStaticTokenInput): string;
    static toChainedReference(key: BigNumberish): BigNumber;
    static constructExitCall(params: ExitPoolData): string;
    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    fetchPools(): Promise<boolean>;
    getPools(): SubgraphPoolBase[];
    /**
     * exitPoolAndBatchSwap Chains poolExit with batchSwap to final tokens.
     * @param {ExitAndBatchSwapInput} params
     * @param {string} exiter - Address used to exit pool.
     * @param {string} swapRecipient - Address that receives final tokens.
     * @param {string} poolId - Id of pool being exited.
     * @param {string[]} exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
     * @param {string} userData - Encoded exitPool data.
     * @param {string[]} expectedAmountsOut - Expected amounts of exitTokens to receive when exiting pool.
     * @param {string[]} finalTokensOut - Array containing the addresses of the final tokens out.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
     */
    exitPoolAndBatchSwap(params: ExitAndBatchSwapInput): Promise<TransactionData>;
    /**
     * swapUnwrapAaveStaticExactIn Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable.
     * @param {string[]} tokensIn - array to token addresses for swapping as tokens in.
     * @param {string[]} aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param {string[]} amountsIn - amounts to be swapped for each token in.
     * @param {string[]} rates - The rate used to convert wrappedToken to underlying.
     * @param {FundManagement} funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
     */
    swapUnwrapAaveStaticExactIn(tokensIn: string[], aaveStaticTokens: string[], amountsIn: string[], rates: string[], funds: FundManagement, slippage: string, fetchPools?: FetchPoolsInput): Promise<TransactionData>;
    /**
     * swapUnwrapAaveStaticExactOut Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable.
     * @param {string[]} tokensIn - array to token addresses for swapping as tokens in.
     * @param {string[]} aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
     * @param {string[]} amountsUnwrapped - amounts of unwrapped tokens out.
     * @param {string[]} rates - The rate used to convert wrappedToken to underlying.
     * @param {FundManagement} funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
     * @returns Transaction data with calldata. Outputs.amountsIn has the amounts of tokensIn.
     */
    swapUnwrapAaveStaticExactOut(tokensIn: string[], aaveStaticTokens: string[], amountsUnwrapped: string[], rates: string[], funds: FundManagement, slippage: string, fetchPools?: FetchPoolsInput): Promise<TransactionData>;
    /**
     * Creates encoded multicalls using swap outputs as input amounts for token unwrap.
     * @param wrappedTokens
     * @param swapType
     * @param swaps
     * @param assets
     * @param funds
     * @param limits
     * @returns
     */
    encodeSwapUnwrap(wrappedTokens: string[], swapType: SwapType, swaps: BatchSwapStep[], assets: string[], funds: FundManagement, limits: BigNumberish[]): string[];
}

declare class Subgraph {
    readonly url: string;
    readonly client: SubgraphClient;
    constructor(config: BalancerSdkConfig);
    private initClient;
}

declare class Sor extends SOR {
    constructor(sdkConfig: BalancerSdkConfig);
    private static getSorConfig;
    private static getSorNetworkConfig;
    private static getPoolDataService;
    private static getTokenPriceService;
}

declare class Pricing {
    private readonly swaps;
    constructor(config: BalancerSdkConfig, swaps?: Swaps);
    /**
     * Retrieves pools using poolDataService.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    fetchPools(): Promise<boolean>;
    /**
     * Get currently saved pools list (fetched using fetchPools()).
     * @returns {SubgraphPoolBase[]} pools list.
     */
    getPools(): SubgraphPoolBase[];
    /**
     * Calculates Spot Price for a token pair - finds most liquid path and uses this as reference SP.
     * @param { string } tokenIn Token in address.
     * @param { string } tokenOut Token out address.
     * @param { SubgraphPoolBase[] } pools Optional - Pool data. Will be fetched via dataProvider if not supplied.
     * @returns  { string } Spot price.
     */
    getSpotPrice(tokenIn: string, tokenOut: string, pools?: SubgraphPoolBase[]): Promise<string>;
}

declare type ERC20Helper = (address: string, provider: Provider) => Contract;
interface ContractInstances {
    vault: Vault;
    lidoRelayer?: LidoRelayer;
    multicall: Contract;
    ERC20: ERC20Helper;
}
declare class Contracts {
    contractAddresses: ContractAddresses;
    vault: Vault;
    lidoRelayer?: LidoRelayer;
    multicall: Contract;
    /**
     * Create instances of Balancer contracts connected to passed provider.
     * @param { Network | ContractAddresses } networkOrAddresses
     * @param { Provider } provider
     */
    constructor(networkOrAddresses: Network | ContractAddresses, provider: Provider);
    /**
     * Expose contract instances.
     */
    get contracts(): ContractInstances;
    /**
     * Helper to create ERC20 contract.
     * @param { string } address ERC20 address.
     * @param { Provider} provider Provider.
     * @returns Contract.
     */
    getErc20(address: string, provider: Provider): Contract;
}

declare class Migrations {
    private network;
    constructor(network: 1 | 5 | 137);
    /**
     * Builds migration call data.
     * Migrates tokens from staBal3 to bbausd2 pool.
     * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
     *
     * @param userAddress User address.
     * @param staBal3Amount Amount of BPT tokens to migrate.
     * @param minBbausd2Out Minimum of expected BPT out ot the migration flow.
     * @param staked Indicates whether tokens are initially staked or not.
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    stabal3(userAddress: string, staBal3Amount: string, minBbausd2Out: string, staked: boolean, authorisation?: string): {
        to: string;
        data: string;
        decode: (output: string, staked: boolean) => string;
    };
    /**
     * Builds migration call data.
     * Migrates tokens from bbausd1 to bbausd2 pool.
     * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
     *
     * @param userAddress User address.
     * @param bbausd1Amount Amount of BPT tokens to migrate.
     * @param minBbausd2Out Minimum of expected BPT out ot the migration flow.
     * @param staked Indicates whether tokens are initially staked or not.
     * @param tokenBalances Token balances in EVM scale. Array must have the same length and order as tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    bbaUsd(userAddress: string, bbausd1Amount: string, minBbausd2Out: string, staked: boolean, tokenBalances: string[], authorisation?: string): {
        to: string;
        data: string;
        decode: (output: string, staked: boolean) => string;
    };
    /**
     * Builds migration call data.
     * Migrates tokens from old stable to new stable phantom pools with the same underlying tokens.
     * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
     *
     * @param userAddress User address.
     * @param from Pool info being migrated from
     * @param to Pool info being migrated to
     * @param bptIn Amount of BPT tokens to migrate.
     * @param minBptOut Minimum of expected BPT out ot the migration flow.
     * @param staked Indicates whether tokens are initially staked or not.
     * @param underlyingTokens Underlying token addresses. Array must have the same length and order as tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    stables(userAddress: string, from: {
        id: string;
        address: string;
        gauge?: string;
    }, to: {
        id: string;
        address: string;
        gauge?: string;
    }, bptIn: string, minBptOut: string, staked: boolean, underlyingTokens: string[], authorisation?: string): {
        to: string;
        data: string;
        decode: (output: string, staked: boolean) => string;
    };
    /**
     * Builds migration call data.
     * Migrates tokens from staBal3 to bbausd2 pool.
     * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
     *
     * @param userAddress User address.
     * @param bptIn Amount of BPT tokens to migrate.
     * @param minBptOut Minimum of expected BPT out ot the migration flow.
     * @param staked Indicates whether tokens are initially staked or not.
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    maiusd(userAddress: string, bptIn: string, minBptOut: string, staked: boolean, authorisation?: string): {
        to: string;
        data: string;
        decode: (output: string, staked: boolean) => string;
    };
}

declare class Zaps {
    network: Network;
    migrations: Migrations;
    constructor(network: Network);
}

/**
 * Calculates pool fees
 *
 * 1. Pool fees in last 24hrs
 */

declare class PoolVolume {
    private yesterdaysPools;
    constructor(yesterdaysPools: Findable<Pool, PoolAttribute> | undefined);
    last24h(pool: Pool): Promise<number>;
}

/**
 * Calculates pool fees
 *
 * 1. Pool fees in last 24hrs
 */

declare class PoolFees {
    private yesterdaysPools;
    constructor(yesterdaysPools: Findable<Pool, PoolAttribute> | undefined);
    last24h(pool: Pool): Promise<number>;
}

/**
 * Controller / use-case layer for interacting with pools data.
 */
declare class Pools implements Findable<PoolWithMethods> {
    private networkConfig;
    private repositories;
    aprService: PoolApr;
    liquidityService: Liquidity;
    feesService: PoolFees;
    volumeService: PoolVolume;
    constructor(networkConfig: BalancerNetworkConfig, repositories: BalancerDataRepositories);
    dataSource(): Findable<Pool, PoolAttribute> & Searchable<Pool>;
    /**
     * Calculates APR on any pool data
     *
     * @param pool
     * @returns
     */
    apr(pool: Pool): Promise<AprBreakdown>;
    /**
     * Calculates total liquidity of the pool
     *
     * @param pool
     * @returns
     */
    liquidity(pool: Pool): Promise<string>;
    /**
     * Calculates total fees for the pool in the last 24 hours
     *
     * @param pool
     * @returns
     */
    fees(pool: Pool): Promise<number>;
    /**
     * Calculates total volume of the pool in the last 24 hours
     *
     * @param pool
     * @returns
     */
    volume(pool: Pool): Promise<number>;
    static wrap(pool: Pool, networkConfig: BalancerNetworkConfig): PoolWithMethods;
    find(id: string): Promise<PoolWithMethods | undefined>;
    findBy(param: string, value: string): Promise<PoolWithMethods | undefined>;
    all(): Promise<PoolWithMethods[]>;
    where(filter: (pool: Pool) => boolean): Promise<PoolWithMethods[]>;
}

interface BalancerSDKRoot {
    config: BalancerSdkConfig;
    sor: Sor;
    subgraph: Subgraph;
    pools: Pools;
    data: Data;
    swaps: Swaps;
    relayer: Relayer;
    networkConfig: BalancerNetworkConfig;
    rpcProvider: Provider;
}
declare class BalancerSDK implements BalancerSDKRoot {
    config: BalancerSdkConfig;
    sor: Sor;
    subgraph: Subgraph;
    readonly swaps: Swaps;
    readonly relayer: Relayer;
    readonly pricing: Pricing;
    readonly pools: Pools;
    readonly data: Data;
    balancerContracts: Contracts;
    zaps: Zaps;
    readonly networkConfig: BalancerNetworkConfig;
    constructor(config: BalancerSdkConfig, sor?: Sor, subgraph?: Subgraph);
    get rpcProvider(): Provider;
    /**
     * Expose balancer contracts, e.g. Vault, LidoRelayer.
     */
    get contracts(): ContractInstances;
}

declare enum BalancerErrorCode {
    SWAP_ZERO_RETURN_AMOUNT = "SWAP_ZERO_RETURN_AMOUNT",
    UNWRAP_ZERO_AMOUNT = "UNWRAP_ZERO_AMOUNT",
    WRAP_ZERO_AMOUNT = "WRAP_ZERO_AMOUNT",
    QUERY_BATCH_SWAP = "QUERY_BATCH_SWAP",
    POOL_DOESNT_EXIST = "POOL_DOESNT_EXIST",
    UNSUPPORTED_POOL_TYPE = "UNSUPPORTED_POOL_TYPE",
    UNSUPPORTED_PAIR = "UNSUPPORTED_PAIR",
    NO_POOL_DATA = "NO_POOL_DATA",
    INPUT_OUT_OF_BOUNDS = "INPUT_OUT_OF_BOUNDS",
    INPUT_LENGTH_MISMATCH = "INPUT_LENGTH_MISMATCH",
    INPUT_ZERO_NOT_ALLOWED = "INPUT_ZERO_NOT_ALLOWED",
    TOKEN_MISMATCH = "TOKEN_MISMATCH",
    MISSING_TOKENS = "MISSING_TOKENS",
    MISSING_AMP = "MISSING_AMP",
    MISSING_DECIMALS = "MISSING_DECIMALS",
    MISSING_PRICE_RATE = "MISSING_PRICE_RATE",
    MISSING_WEIGHT = "MISSING_WEIGHT"
}
declare class BalancerError extends Error {
    code: BalancerErrorCode;
    constructor(code: BalancerErrorCode);
    static getMessage(code: BalancerErrorCode): string;
}

export { AaveHelpers, Account, Address, AprBreakdown, AprFetcher, AssetHelpers, BalancerAPIArgsFormatter, BalancerDataRepositories, BalancerError, BalancerErrorCode, BalancerErrors, BalancerMinterAuthorization, BalancerNetworkConfig, BalancerSDK, BalancerSDKRoot, BalancerSdkConfig, BalancerSdkSorConfig, BaseFeeDistributor, BatchSwap, BatchSwapStep, BlockNumberRepository, BuildTransactionParameters, CoingeckoPriceRepository, ComposableStablePoolEncoder, ComposableStablePoolExitKind, ComposableStablePoolJoinKind, ContractAddresses, Currency, Data, EncodeBatchSwapInput, EncodeExitPoolInput, EncodeJoinPoolInput, EncodeUnwrapAaveStaticTokenInput, ExitAndBatchSwapInput, ExitPoolData, ExitPoolRequest, FeeCollectorRepository, FeeDistributorData, FeeDistributorRepository, FetchPoolsInput, FindRouteParameters, Findable, FundManagement, GaugeControllerMulticallRepository, GraphQLArgs, GraphQLArgsBuilder, GraphQLArgsFormatter, GraphQLFilter, GraphQLFilterOperator, GraphQLQuery, JoinPoolRequest, Liquidity, LiquidityGauge, LiquidityGaugeSubgraphRPCProvider, LiquidityGaugesMulticallRepository, LiquidityGaugesSubgraphRepository, ManagedPoolEncoder, Network, OnchainPoolData, OnchainTokenData, OutputReference, Pool, PoolAttribute, PoolBPTValue, PoolBalanceOp, PoolBalanceOpKind, PoolReference, PoolRepository, PoolSpecialization, PoolToken, PoolType, PoolWithMethods, Pools, PoolsBalancerAPIRepository, PoolsFallbackRepository, PoolsFallbackRepositoryOptions, PoolsRepositoryFetchOptions, PoolsStaticRepository, PoolsSubgraphRepository, Price, QuerySimpleFlashSwapParameters, QuerySimpleFlashSwapResponse, QueryWithSorInput, QueryWithSorOutput, Relayer, RelayerAction, RelayerAuthorization, RewardData, Searchable, SimpleFlashSwapParameters, SingleSwap, Sor, StablePhantomPoolJoinKind, StablePoolEncoder, StablePoolExitKind, StablePoolJoinKind, StaticTokenPriceProvider, StaticTokenProvider, Subgraph, SubgraphArgsFormatter, Swap, SwapAttributes, SwapInput, SwapTransactionRequest, SwapType, Swaps, Token, TokenAttribute, TokenPriceProvider, TokenPrices, TokenProvider, TokenYieldsRepository, TransactionData, UserBalanceOp, UserBalanceOpKind, WeightedPoolEncoder, WeightedPoolExitKind, WeightedPoolJoinKind, accountToAddress, emissions as balEmissions, getLimitsForSlippage, getPoolAddress, getPoolNonce, getPoolSpecialization, isNormalizedWeights, isSameAddress, parsePoolInfo, signPermit, splitPoolId, toNormalizedWeights, tokensToTokenPrices };
