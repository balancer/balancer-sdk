import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { WeiPerEther, Zero, MaxUint256, AddressZero, MaxInt256 } from '@ethersproject/constants';
import { BigNumber, parseFixed as parseFixed$1, formatFixed as formatFixed$1 } from '@ethersproject/bignumber';
import { getAddress } from '@ethersproject/address';
import { hexZeroPad, hexValue, splitSignature } from '@ethersproject/bytes';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import * as SOR from '@balancer-labs/sor';
import { StablePool, ZERO, WeightedMaths, WeightedPool, MetaStablePool, PhantomStablePool, LinearPool, SwapTypes, PoolFilter, SOR as SOR$1, parseToPoolsDict, getSpotPriceAfterSwapForPath } from '@balancer-labs/sor';
export { PoolFilter, RouteProposer, SOR, SwapTypes, formatSequence, getTokenAddressesForSwap, parseToPoolsDict, phantomStableBPTForTokensZeroPriceImpact, queryBatchSwapTokensIn, queryBatchSwapTokensOut, stableBPTForTokensZeroPriceImpact, weightedBPTForTokensZeroPriceImpact } from '@balancer-labs/sor';
import { Vault__factory, LidoRelayer__factory } from '@balancer-labs/typechain';
import { cloneDeep, set, parseInt as parseInt$1, keyBy, sum } from 'lodash';
import { JsonRpcProvider } from '@ethersproject/providers';
import { GraphQLClient } from 'graphql-request';
import { parse } from 'graphql';
import axios from 'axios';

var StablePoolJoinKind;
(function (StablePoolJoinKind) {
    StablePoolJoinKind[StablePoolJoinKind["INIT"] = 0] = "INIT";
    StablePoolJoinKind[StablePoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
    StablePoolJoinKind[StablePoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
})(StablePoolJoinKind || (StablePoolJoinKind = {}));
var StablePhantomPoolJoinKind$1;
(function (StablePhantomPoolJoinKind) {
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["INIT"] = 0] = "INIT";
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["COLLECT_PROTOCOL_FEES"] = 1] = "COLLECT_PROTOCOL_FEES";
})(StablePhantomPoolJoinKind$1 || (StablePhantomPoolJoinKind$1 = {}));
var StablePoolExitKind;
(function (StablePoolExitKind) {
    StablePoolExitKind[StablePoolExitKind["EXACT_BPT_IN_FOR_ONE_TOKEN_OUT"] = 0] = "EXACT_BPT_IN_FOR_ONE_TOKEN_OUT";
    StablePoolExitKind[StablePoolExitKind["EXACT_BPT_IN_FOR_TOKENS_OUT"] = 1] = "EXACT_BPT_IN_FOR_TOKENS_OUT";
    StablePoolExitKind[StablePoolExitKind["BPT_IN_FOR_EXACT_TOKENS_OUT"] = 2] = "BPT_IN_FOR_EXACT_TOKENS_OUT";
})(StablePoolExitKind || (StablePoolExitKind = {}));
class StablePoolEncoder {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
/**
 * Encodes the userData parameter for providing the initial liquidity to a StablePool
 * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
 */
StablePoolEncoder.joinInit = (amountsIn) => defaultAbiCoder.encode(['uint256', 'uint256[]'], [StablePoolJoinKind.INIT, amountsIn]);
/**
 * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
 */
StablePoolEncoder.joinCollectProtocolFees = () => defaultAbiCoder.encode(['uint256'], [StablePhantomPoolJoinKind$1.COLLECT_PROTOCOL_FEES]);
/**
 * Encodes the userData parameter for joining a StablePool with exact token inputs
 * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
 * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
 */
StablePoolEncoder.joinExactTokensInForBPTOut = (amountsIn, minimumBPT) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [StablePoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT]);
/**
 * Encodes the userData parameter for joining a StablePool with to receive an exact amount of BPT
 * @param bptAmountOut - the amount of BPT to be minted
 * @param enterTokenIndex - the index of the token to be provided as liquidity
 */
StablePoolEncoder.joinTokenInForExactBPTOut = (bptAmountOut, enterTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    StablePoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT,
    bptAmountOut,
    enterTokenIndex,
]);
/**
 * Encodes the userData parameter for exiting a StablePool by removing a single token in return for an exact amount of BPT
 * @param bptAmountIn - the amount of BPT to be burned
 * @param enterTokenIndex - the index of the token to removed from the pool
 */
StablePoolEncoder.exitExactBPTInForOneTokenOut = (bptAmountIn, exitTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    StablePoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
    bptAmountIn,
    exitTokenIndex,
]);
/**
 * Encodes the userData parameter for exiting a StablePool by removing tokens in return for an exact amount of BPT
 * @param bptAmountIn - the amount of BPT to be burned
 */
StablePoolEncoder.exitExactBPTInForTokensOut = (bptAmountIn) => defaultAbiCoder.encode(['uint256', 'uint256'], [StablePoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmountIn]);
/**
 * Encodes the userData parameter for exiting a StablePool by removing exact amounts of tokens
 * @param amountsOut - the amounts of each token to be withdrawn from the pool
 * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
 */
StablePoolEncoder.exitBPTInForExactTokensOut = (amountsOut, maxBPTAmountIn) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [
    StablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT,
    amountsOut,
    maxBPTAmountIn,
]);

var WeightedPoolJoinKind;
(function (WeightedPoolJoinKind) {
    WeightedPoolJoinKind[WeightedPoolJoinKind["INIT"] = 0] = "INIT";
    WeightedPoolJoinKind[WeightedPoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
    WeightedPoolJoinKind[WeightedPoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
    WeightedPoolJoinKind[WeightedPoolJoinKind["ALL_TOKENS_IN_FOR_EXACT_BPT_OUT"] = 3] = "ALL_TOKENS_IN_FOR_EXACT_BPT_OUT";
})(WeightedPoolJoinKind || (WeightedPoolJoinKind = {}));
var WeightedPoolExitKind;
(function (WeightedPoolExitKind) {
    WeightedPoolExitKind[WeightedPoolExitKind["EXACT_BPT_IN_FOR_ONE_TOKEN_OUT"] = 0] = "EXACT_BPT_IN_FOR_ONE_TOKEN_OUT";
    WeightedPoolExitKind[WeightedPoolExitKind["EXACT_BPT_IN_FOR_TOKENS_OUT"] = 1] = "EXACT_BPT_IN_FOR_TOKENS_OUT";
    WeightedPoolExitKind[WeightedPoolExitKind["BPT_IN_FOR_EXACT_TOKENS_OUT"] = 2] = "BPT_IN_FOR_EXACT_TOKENS_OUT";
    WeightedPoolExitKind[WeightedPoolExitKind["MANAGEMENT_FEE_TOKENS_OUT"] = 3] = "MANAGEMENT_FEE_TOKENS_OUT";
})(WeightedPoolExitKind || (WeightedPoolExitKind = {}));
class WeightedPoolEncoder {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
/**
 * Encodes the userData parameter for providing the initial liquidity to a WeightedPool
 * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
 */
WeightedPoolEncoder.joinInit = (amountsIn) => defaultAbiCoder.encode(['uint256', 'uint256[]'], [WeightedPoolJoinKind.INIT, amountsIn]);
/**
 * Encodes the userData parameter for joining a WeightedPool with exact token inputs
 * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
 * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
 */
WeightedPoolEncoder.joinExactTokensInForBPTOut = (amountsIn, minimumBPT) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT]);
/**
 * Encodes the userData parameter for joining a WeightedPool with a single token to receive an exact amount of BPT
 * @param bptAmountOut - the amount of BPT to be minted
 * @param enterTokenIndex - the index of the token to be provided as liquidity
 */
WeightedPoolEncoder.joinTokenInForExactBPTOut = (bptAmountOut, enterTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT,
    bptAmountOut,
    enterTokenIndex,
]);
/**
 * Encodes the userData parameter for joining a WeightedPool proportionally to receive an exact amount of BPT
 * @param bptAmountOut - the amount of BPT to be minted
 */
WeightedPoolEncoder.joinAllTokensInForExactBPTOut = (bptAmountOut) => defaultAbiCoder.encode(['uint256', 'uint256'], [WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT, bptAmountOut]);
/**
 * Encodes the userData parameter for exiting a WeightedPool by removing a single token in return for an exact amount of BPT
 * @param bptAmountIn - the amount of BPT to be burned
 * @param enterTokenIndex - the index of the token to removed from the pool
 */
WeightedPoolEncoder.exitExactBPTInForOneTokenOut = (bptAmountIn, exitTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
    bptAmountIn,
    exitTokenIndex,
]);
/**
 * Encodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
 * @param bptAmountIn - the amount of BPT to be burned
 */
WeightedPoolEncoder.exitExactBPTInForTokensOut = (bptAmountIn) => defaultAbiCoder.encode(['uint256', 'uint256'], [WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmountIn]);
/**
 * Encodes the userData parameter for exiting a WeightedPool by removing exact amounts of tokens
 * @param amountsOut - the amounts of each token to be withdrawn from the pool
 * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
 */
WeightedPoolEncoder.exitBPTInForExactTokensOut = (amountsOut, maxBPTAmountIn) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [
    WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT,
    amountsOut,
    maxBPTAmountIn,
]);
class ManagedPoolEncoder {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
/**
 * Encodes the userData parameter for exiting a ManagedPool for withdrawing management fees.
 * This can only be done by the pool owner.
 */
ManagedPoolEncoder.exitForManagementFees = () => defaultAbiCoder.encode(['uint256'], [WeightedPoolExitKind.MANAGEMENT_FEE_TOKENS_OUT]);

// Should match MAX_WEIGHTED_TOKENS from v2-helpers/constants
// Including would introduce a dependency
const MaxWeightedTokens = 100;
/**
 * Normalize an array of token weights to ensure they sum to `1e18`
 * @param weights - an array of token weights to be normalized
 * @returns an equivalent set of normalized weights
 */
function toNormalizedWeights(weights) {
    // When the number is exactly equal to the max, normalizing with common inputs
    // leads to a value < 0.01, which reverts. In this case fill in the weights exactly.
    if (weights.length == MaxWeightedTokens) {
        return Array(MaxWeightedTokens).fill(WeiPerEther.div(MaxWeightedTokens));
    }
    const sum = weights.reduce((total, weight) => total.add(weight), Zero);
    if (sum.eq(WeiPerEther))
        return weights;
    const normalizedWeights = [];
    let normalizedSum = Zero;
    for (let index = 0; index < weights.length; index++) {
        if (index < weights.length - 1) {
            normalizedWeights[index] = weights[index].mul(WeiPerEther).div(sum);
            normalizedSum = normalizedSum.add(normalizedWeights[index]);
        }
        else {
            normalizedWeights[index] = WeiPerEther.sub(normalizedSum);
        }
    }
    return normalizedWeights;
}
/**
 * Check whether a set of weights are normalized
 * @param weights - an array of potentially unnormalized weights
 * @returns a boolean of whether the weights are normalized
 */
const isNormalizedWeights = (weights) => {
    const totalWeight = weights.reduce((total, weight) => total.add(weight), Zero);
    return totalWeight.eq(WeiPerEther);
};

var isProduction = process.env.NODE_ENV === 'production';
var prefix = 'Invariant failed';
function invariant(condition, message) {
    if (condition) {
        return;
    }
    if (isProduction) {
        throw new Error(prefix);
    }
    var provided = typeof message === 'function' ? message() : message;
    var value = provided ? prefix + ": " + provided : prefix;
    throw new Error(value);
}

/**
 * Splits a poolId into its components, i.e. pool address, pool specialization and its nonce
 * @param poolId - a bytes32 string of the pool's ID
 * @returns an object with the decomposed poolId
 */
const splitPoolId = (poolId) => {
    return {
        address: getPoolAddress(poolId),
        specialization: getPoolSpecialization(poolId),
        nonce: getPoolNonce(poolId),
    };
};
/**
 * Extracts a pool's address from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's address
 */
const getPoolAddress = (poolId) => {
    invariant(poolId.length === 66, 'Invalid poolId length');
    return poolId.slice(0, 42);
};
/**
 * Extracts a pool's specialization from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's specialization
 */
const getPoolSpecialization = (poolId) => {
    invariant(poolId.length === 66, 'Invalid poolId length');
    // Only have 3 pool specializations so we can just pull the relevant character
    const specializationCode = parseInt(poolId[45]);
    invariant(specializationCode < 3, 'Invalid pool specialization');
    return specializationCode;
};
/**
 * Extracts a pool's nonce from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's nonce
 */
const getPoolNonce = (poolId) => {
    invariant(poolId.length === 66, 'Invalid poolId length');
    return BigNumber.from(`0x${poolId.slice(46)}`);
};

const balancerErrorCodes = {
    '000': 'ADD_OVERFLOW',
    '001': 'SUB_OVERFLOW',
    '002': 'SUB_UNDERFLOW',
    '003': 'MUL_OVERFLOW',
    '004': 'ZERO_DIVISION',
    '005': 'DIV_INTERNAL',
    '006': 'X_OUT_OF_BOUNDS',
    '007': 'Y_OUT_OF_BOUNDS',
    '008': 'PRODUCT_OUT_OF_BOUNDS',
    '009': 'INVALID_EXPONENT',
    '100': 'OUT_OF_BOUNDS',
    '101': 'UNSORTED_ARRAY',
    '102': 'UNSORTED_TOKENS',
    '103': 'INPUT_LENGTH_MISMATCH',
    '104': 'ZERO_TOKEN',
    '200': 'MIN_TOKENS',
    '201': 'MAX_TOKENS',
    '202': 'MAX_SWAP_FEE_PERCENTAGE',
    '203': 'MIN_SWAP_FEE_PERCENTAGE',
    '204': 'MINIMUM_BPT',
    '205': 'CALLER_NOT_VAULT',
    '206': 'UNINITIALIZED',
    '207': 'BPT_IN_MAX_AMOUNT',
    '208': 'BPT_OUT_MIN_AMOUNT',
    '209': 'EXPIRED_PERMIT',
    '210': 'NOT_TWO_TOKENS',
    '211': 'DISABLED',
    '300': 'MIN_AMP',
    '301': 'MAX_AMP',
    '302': 'MIN_WEIGHT',
    '303': 'MAX_STABLE_TOKENS',
    '304': 'MAX_IN_RATIO',
    '305': 'MAX_OUT_RATIO',
    '306': 'MIN_BPT_IN_FOR_TOKEN_OUT',
    '307': 'MAX_OUT_BPT_FOR_TOKEN_IN',
    '308': 'NORMALIZED_WEIGHT_INVARIANT',
    '309': 'INVALID_TOKEN',
    '310': 'UNHANDLED_JOIN_KIND',
    '311': 'ZERO_INVARIANT',
    '312': 'ORACLE_INVALID_SECONDS_QUERY',
    '313': 'ORACLE_NOT_INITIALIZED',
    '314': 'ORACLE_QUERY_TOO_OLD',
    '315': 'ORACLE_INVALID_INDEX',
    '316': 'ORACLE_BAD_SECS',
    '317': 'AMP_END_TIME_TOO_CLOSE',
    '318': 'AMP_ONGOING_UPDATE',
    '319': 'AMP_RATE_TOO_HIGH',
    '320': 'AMP_NO_ONGOING_UPDATE',
    '321': 'STABLE_INVARIANT_DIDNT_CONVERGE',
    '322': 'STABLE_GET_BALANCE_DIDNT_CONVERGE',
    '323': 'RELAYER_NOT_CONTRACT',
    '324': 'BASE_POOL_RELAYER_NOT_CALLED',
    '325': 'REBALANCING_RELAYER_REENTERED',
    '326': 'GRADUAL_UPDATE_TIME_TRAVEL',
    '327': 'SWAPS_DISABLED',
    '328': 'CALLER_IS_NOT_LBP_OWNER',
    '329': 'PRICE_RATE_OVERFLOW',
    '330': 'INVALID_JOIN_EXIT_KIND_WHILE_SWAPS_DISABLED',
    '331': 'WEIGHT_CHANGE_TOO_FAST',
    '332': 'LOWER_GREATER_THAN_UPPER_TARGET',
    '333': 'UPPER_TARGET_TOO_HIGH',
    '334': 'UNHANDLED_BY_LINEAR_POOL',
    '335': 'OUT_OF_TARGET_RANGE',
    '336': 'UNHANDLED_EXIT_KIND ',
    '337': 'UNAUTHORIZED_EXIT',
    '338': 'MAX_MANAGEMENT_SWAP_FEE_PERCENTAGE',
    '339': 'UNHANDLED_BY_MANAGED_POOL',
    '340': 'UNHANDLED_BY_PHANTOM_POOL',
    '341': 'TOKEN_DOES_NOT_HAVE_RATE_PROVIDER',
    '342': 'INVALID_INITIALIZATION',
    '343': 'OUT_OF_NEW_TARGET_RANGE',
    '344': 'UNAUTHORIZED_OPERATION',
    '345': 'UNINITIALIZED_POOL_CONTROLLER',
    '400': 'REENTRANCY',
    '401': 'SENDER_NOT_ALLOWED',
    '402': 'PAUSED',
    '403': 'PAUSE_WINDOW_EXPIRED',
    '404': 'MAX_PAUSE_WINDOW_DURATION',
    '405': 'MAX_BUFFER_PERIOD_DURATION',
    '406': 'INSUFFICIENT_BALANCE',
    '407': 'INSUFFICIENT_ALLOWANCE',
    '408': 'ERC20_TRANSFER_FROM_ZERO_ADDRESS',
    '409': 'ERC20_TRANSFER_TO_ZERO_ADDRESS',
    '410': 'ERC20_MINT_TO_ZERO_ADDRESS',
    '411': 'ERC20_BURN_FROM_ZERO_ADDRESS',
    '412': 'ERC20_APPROVE_FROM_ZERO_ADDRESS',
    '413': 'ERC20_APPROVE_TO_ZERO_ADDRESS',
    '414': 'ERC20_TRANSFER_EXCEEDS_ALLOWANCE',
    '415': 'ERC20_DECREASED_ALLOWANCE_BELOW_ZERO',
    '416': 'ERC20_TRANSFER_EXCEEDS_BALANCE',
    '417': 'ERC20_BURN_EXCEEDS_ALLOWANCE',
    '418': 'SAFE_ERC20_CALL_FAILED',
    '419': 'ADDRESS_INSUFFICIENT_BALANCE',
    '420': 'ADDRESS_CANNOT_SEND_VALUE',
    '421': 'SAFE_CAST_VALUE_CANT_FIT_INT256',
    '422': 'GRANT_SENDER_NOT_ADMIN',
    '423': 'REVOKE_SENDER_NOT_ADMIN',
    '424': 'RENOUNCE_SENDER_NOT_ALLOWED',
    '425': 'BUFFER_PERIOD_EXPIRED',
    '426': 'CALLER_IS_NOT_OWNER',
    '427': 'NEW_OWNER_IS_ZERO',
    '428': 'CODE_DEPLOYMENT_FAILED',
    '429': 'CALL_TO_NON_CONTRACT',
    '430': 'LOW_LEVEL_CALL_FAILED',
    '431': 'NOT_PAUSED',
    '432': 'ADDRESS_ALREADY_ALLOWLISTED',
    '433': 'ADDRESS_NOT_ALLOWLISTED',
    '434': 'ERC20_BURN_EXCEEDS_BALANCE',
    '500': 'INVALID_POOL_ID',
    '501': 'CALLER_NOT_POOL',
    '502': 'SENDER_NOT_ASSET_MANAGER',
    '503': 'USER_DOESNT_ALLOW_RELAYER',
    '504': 'INVALID_SIGNATURE',
    '505': 'EXIT_BELOW_MIN',
    '506': 'JOIN_ABOVE_MAX',
    '507': 'SWAP_LIMIT',
    '508': 'SWAP_DEADLINE',
    '509': 'CANNOT_SWAP_SAME_TOKEN',
    '510': 'UNKNOWN_AMOUNT_IN_FIRST_SWAP',
    '511': 'MALCONSTRUCTED_MULTIHOP_SWAP',
    '512': 'INTERNAL_BALANCE_OVERFLOW',
    '513': 'INSUFFICIENT_INTERNAL_BALANCE',
    '514': 'INVALID_ETH_INTERNAL_BALANCE',
    '515': 'INVALID_POST_LOAN_BALANCE',
    '516': 'INSUFFICIENT_ETH',
    '517': 'UNALLOCATED_ETH',
    '518': 'ETH_TRANSFER',
    '519': 'CANNOT_USE_ETH_SENTINEL',
    '520': 'TOKENS_MISMATCH',
    '521': 'TOKEN_NOT_REGISTERED',
    '522': 'TOKEN_ALREADY_REGISTERED',
    '523': 'TOKENS_ALREADY_SET',
    '524': 'TOKENS_LENGTH_MUST_BE_2',
    '525': 'NONZERO_TOKEN_BALANCE',
    '526': 'BALANCE_TOTAL_OVERFLOW',
    '527': 'POOL_NO_TOKENS',
    '528': 'INSUFFICIENT_FLASH_LOAN_BALANCE',
    '600': 'SWAP_FEE_PERCENTAGE_TOO_HIGH',
    '601': 'FLASH_LOAN_FEE_PERCENTAGE_TOO_HIGH',
    '602': 'INSUFFICIENT_FLASH_LOAN_FEE_AMOUNT',
};
class BalancerErrors {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
BalancerErrors.isErrorCode = (error) => {
    if (!error.includes('BAL#'))
        return false;
    const errorCode = error.replace('BAL#', '');
    return Object.keys(balancerErrorCodes).includes(errorCode);
};
/**
 * Decodes a Balancer error code into the corresponding reason
 * @param error - a Balancer error code of the form `BAL#000`
 * @returns The decoded error reason
 */
BalancerErrors.parseErrorCode = (error) => {
    if (!error.includes('BAL#'))
        throw new Error('Error code not found');
    const errorCode = error.replace('BAL#', '');
    const actualError = balancerErrorCodes[errorCode];
    if (!actualError)
        throw new Error('Error code not found');
    return actualError;
};
/**
 * Decodes a Balancer error code into the corresponding reason
 * @param error - a Balancer error code of the form `BAL#000`
 * @returns The decoded error reason if passed a valid error code, otherwise returns passed input
 */
BalancerErrors.tryParseErrorCode = (error) => {
    try {
        return BalancerErrors.parseErrorCode(error);
    }
    catch {
        return error;
    }
};
/**
 * Tests whether a string is a known Balancer error message
 * @param error - a string to be checked verified as a Balancer error message
 */
BalancerErrors.isBalancerError = (error) => Object.values(balancerErrorCodes).includes(error);
/**
 * Encodes an error string into the corresponding error code
 * @param error - a Balancer error message string
 * @returns a Balancer error code of the form `BAL#000`
 */
BalancerErrors.encodeError = (error) => {
    const encodedError = Object.entries(balancerErrorCodes).find(([, message]) => message === error);
    if (!encodedError)
        throw Error('Error message not found');
    return `BAL#${encodedError[0]}`;
};

async function accountToAddress(account) {
    if (typeof account == 'string')
        return account;
    if (Signer.isSigner(account))
        return account.getAddress();
    if (account.address)
        return account.address;
    throw new Error('Could not read account address');
}
var RelayerAction;
(function (RelayerAction) {
    RelayerAction["JoinPool"] = "JoinPool";
    RelayerAction["ExitPool"] = "ExitPool";
    RelayerAction["Swap"] = "Swap";
    RelayerAction["BatchSwap"] = "BatchSwap";
    RelayerAction["SetRelayerApproval"] = "SetRelayerApproval";
})(RelayerAction || (RelayerAction = {}));
class RelayerAuthorization {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
RelayerAuthorization.encodeCalldataAuthorization = (calldata, deadline, signature) => {
    const encodedDeadline = hexZeroPad(hexValue(deadline), 32).slice(2);
    const { v, r, s } = splitSignature(signature);
    const encodedV = hexZeroPad(hexValue(v), 32).slice(2);
    const encodedR = r.slice(2);
    const encodedS = s.slice(2);
    return `${calldata}${encodedDeadline}${encodedV}${encodedR}${encodedS}`;
};
RelayerAuthorization.signJoinAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(RelayerAction.JoinPool, validator, user, allowedSender, allowedCalldata, deadline, nonce);
RelayerAuthorization.signExitAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(RelayerAction.ExitPool, validator, user, allowedSender, allowedCalldata, deadline, nonce);
RelayerAuthorization.signSwapAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(RelayerAction.Swap, validator, user, allowedSender, allowedCalldata, deadline, nonce);
RelayerAuthorization.signBatchSwapAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(RelayerAction.BatchSwap, validator, user, allowedSender, allowedCalldata, deadline, nonce);
RelayerAuthorization.signSetRelayerApprovalAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(RelayerAction.SetRelayerApproval, validator, user, allowedSender, allowedCalldata, deadline, nonce);
RelayerAuthorization.signAuthorizationFor = async (type, validator, user, allowedSender, allowedCalldata, deadline = MaxUint256, nonce) => {
    const { chainId } = await validator.provider.getNetwork();
    if (!nonce) {
        const userAddress = await user.getAddress();
        nonce = (await validator.getNextNonce(userAddress));
    }
    const domain = {
        name: 'Balancer V2 Vault',
        version: '1',
        chainId,
        verifyingContract: validator.address,
    };
    const types = {
        [type]: [
            { name: 'calldata', type: 'bytes' },
            { name: 'sender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };
    const value = {
        calldata: allowedCalldata,
        sender: await accountToAddress(allowedSender),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
    };
    return user._signTypedData(domain, types, value);
};
class BalancerMinterAuthorization {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
BalancerMinterAuthorization.signSetMinterApproval = async (minterContract, minter, approval, user, deadline = MaxUint256, nonce) => {
    const { chainId } = await minterContract.provider.getNetwork();
    if (!nonce) {
        const userAddress = await user.getAddress();
        nonce = (await minterContract.getNextNonce(userAddress));
    }
    const domain = {
        name: 'Balancer Minter',
        version: '1',
        chainId,
        verifyingContract: minterContract.address,
    };
    const types = {
        SetMinterApproval: [
            { name: 'minter', type: 'address' },
            { name: 'approval', type: 'bool' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };
    const value = {
        minter: await accountToAddress(minter),
        approval,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
    };
    const signature = await user._signTypedData(domain, types, value);
    return {
        ...splitSignature(signature),
        deadline: BigNumber.from(deadline),
    };
};

const signPermit = async (token, owner, spender, amount, deadline = MaxUint256, nonce) => {
    const { chainId } = await token.provider.getNetwork();
    const ownerAddress = await owner.getAddress();
    if (!nonce)
        nonce = (await token.nonces(ownerAddress));
    const domain = {
        name: await token.name(),
        version: '1',
        chainId,
        verifyingContract: token.address,
    };
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };
    const value = {
        owner: ownerAddress,
        spender: await accountToAddress(spender),
        value: amount,
        nonce,
        deadline,
    };
    const signature = await owner._signTypedData(domain, types, value);
    return {
        ...splitSignature(signature),
        deadline: BigNumber.from(deadline),
        nonce: BigNumber.from(nonce),
    };
};

const cmpTokens = (tokenA, tokenB) => tokenA.toLowerCase() > tokenB.toLowerCase() ? 1 : -1;
const transposeMatrix = (matrix) => matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
class AssetHelpers {
    constructor(wethAddress) {
        this.ETH = AddressZero;
        /**
         * Tests whether `token` is ETH (represented by `0x0000...0000`).
         *
         * @param token - the address of the asset to be checked
         */
        this.isETH = (token) => AssetHelpers.isEqual(token, this.ETH);
        /**
         * Tests whether `token` is WETH.
         *
         * @param token - the address of the asset to be checked
         */
        this.isWETH = (token) => AssetHelpers.isEqual(token, this.WETH);
        /**
         * Converts an asset to the equivalent ERC20 address.
         *
         * For ERC20s this will return the passed address but passing ETH (`0x0000...0000`) will return the WETH address
         * @param token - the address of the asset to be translated to an equivalent ERC20
         * @returns the address of translated ERC20 asset
         */
        this.translateToERC20 = (token) => this.isETH(token) ? this.WETH : token;
        this.WETH = getAddress(wethAddress);
    }
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
    sortTokens(tokens, ...others) {
        others.forEach((array) => invariant(tokens.length === array.length, 'array length mismatch'));
        // We want to sort ETH as if were WETH so we translate to ERC20s
        const erc20Tokens = tokens.map(this.translateToERC20);
        const transpose = transposeMatrix([erc20Tokens, ...others]);
        const sortedTranspose = transpose.sort(([tokenA], [tokenB]) => cmpTokens(tokenA, tokenB));
        const [sortedErc20s, ...sortedOthers] = transposeMatrix(sortedTranspose);
        // If one of the tokens was ETH, we need to translate back from WETH
        const sortedTokens = tokens.includes(this.ETH)
            ? sortedErc20s.map((token) => (this.isWETH(token) ? this.ETH : token))
            : sortedErc20s;
        return [sortedTokens, ...sortedOthers];
    }
}
AssetHelpers.isEqual = (addressA, addressB) => getAddress(addressA) === getAddress(addressB);

var aTokenRateProvider = [
	{
		inputs: [
			{
				internalType: "contract IStaticAToken",
				name: "_waToken",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		inputs: [
		],
		name: "getRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "waToken",
		outputs: [
			{
				internalType: "contract IStaticAToken",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	}
];

class AaveHelpers {
    static async getRate(rateProviderAddress, provider) {
        const rateProviderContract = new Contract(rateProviderAddress, aTokenRateProvider, provider);
        const rate = await rateProviderContract.getRate();
        return rate.toString();
    }
}

const AMP_PRECISION$1 = 3; // number of decimals -> precision 1000
/**
 * Parse pool info into EVM amounts
 * @param {Pool}  pool
 * @returns       parsed pool info
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const parsePoolInfo = (pool) => {
    const parsedTokens = pool.tokens.map((token) => token.address);
    const parsedDecimals = pool.tokens.map((token) => {
        return token.decimals ? token.decimals.toString() : undefined;
    });
    const parsedBalances = pool.tokens.map((token) => parseFixed$1(token.balance, token.decimals).toString());
    const parsedWeights = pool.tokens.map((token) => {
        return token.weight ? parseFixed$1(token.weight, 18).toString() : undefined;
    });
    const parsedPriceRates = pool.tokens.map((token) => {
        return token.priceRate
            ? parseFixed$1(token.priceRate, 18).toString()
            : undefined;
    });
    const parsedAmp = pool.amp
        ? parseFixed$1(pool.amp, AMP_PRECISION$1).toString() // Solidity maths uses precison method for amp that must be replicated
        : undefined;
    const parsedTotalShares = parseFixed$1(pool.totalShares, 18).toString();
    const parsedSwapFee = parseFixed$1(pool.swapFee, 18).toString();
    return {
        parsedTokens,
        parsedDecimals,
        parsedBalances,
        parsedWeights,
        parsedPriceRates,
        parsedAmp,
        parsedTotalShares,
        parsedSwapFee,
    };
};

function tokensToTokenPrices(tokens) {
    const tokenPrices = {};
    tokens.forEach((token) => {
        if (token.price) {
            tokenPrices[token.address] = token.price;
        }
    });
    return tokenPrices;
}

const isSameAddress = (address1, address2) => getAddress(address1) === getAddress(address2);

var Network;
(function (Network) {
    Network[Network["MAINNET"] = 1] = "MAINNET";
    Network[Network["ROPSTEN"] = 3] = "ROPSTEN";
    Network[Network["RINKEBY"] = 4] = "RINKEBY";
    Network[Network["GOERLI"] = 5] = "GOERLI";
    Network[Network["G\u00D6RLI"] = 5] = "G\u00D6RLI";
    Network[Network["OPTIMISM"] = 10] = "OPTIMISM";
    Network[Network["KOVAN"] = 42] = "KOVAN";
    Network[Network["POLYGON"] = 137] = "POLYGON";
    Network[Network["ARBITRUM"] = 42161] = "ARBITRUM";
})(Network || (Network = {}));

var PoolSpecialization;
(function (PoolSpecialization) {
    PoolSpecialization[PoolSpecialization["GeneralPool"] = 0] = "GeneralPool";
    PoolSpecialization[PoolSpecialization["MinimalSwapInfoPool"] = 1] = "MinimalSwapInfoPool";
    PoolSpecialization[PoolSpecialization["TwoTokenPool"] = 2] = "TwoTokenPool";
})(PoolSpecialization || (PoolSpecialization = {}));
// Balance Operations
var UserBalanceOpKind;
(function (UserBalanceOpKind) {
    UserBalanceOpKind[UserBalanceOpKind["DepositInternal"] = 0] = "DepositInternal";
    UserBalanceOpKind[UserBalanceOpKind["WithdrawInternal"] = 1] = "WithdrawInternal";
    UserBalanceOpKind[UserBalanceOpKind["TransferInternal"] = 2] = "TransferInternal";
    UserBalanceOpKind[UserBalanceOpKind["TransferExternal"] = 3] = "TransferExternal";
})(UserBalanceOpKind || (UserBalanceOpKind = {}));
var PoolBalanceOpKind;
(function (PoolBalanceOpKind) {
    PoolBalanceOpKind[PoolBalanceOpKind["Withdraw"] = 0] = "Withdraw";
    PoolBalanceOpKind[PoolBalanceOpKind["Deposit"] = 1] = "Deposit";
    PoolBalanceOpKind[PoolBalanceOpKind["Update"] = 2] = "Update";
})(PoolBalanceOpKind || (PoolBalanceOpKind = {}));
var PoolType;
(function (PoolType) {
    PoolType["Weighted"] = "Weighted";
    PoolType["Investment"] = "Investment";
    PoolType["Stable"] = "Stable";
    PoolType["ComposableStable"] = "ComposableStable";
    PoolType["MetaStable"] = "MetaStable";
    PoolType["StablePhantom"] = "StablePhantom";
    PoolType["LiquidityBootstrapping"] = "LiquidityBootstrapping";
    PoolType["AaveLinear"] = "AaveLinear";
    PoolType["ERC4626Linear"] = "ERC4626Linear";
    PoolType["Element"] = "Element";
    PoolType["Gyro2"] = "Gyro2";
    PoolType["Gyro3"] = "Gyro3";
})(PoolType || (PoolType = {}));

var SwapType;
(function (SwapType) {
    SwapType[SwapType["SwapExactIn"] = 0] = "SwapExactIn";
    SwapType[SwapType["SwapExactOut"] = 1] = "SwapExactOut";
})(SwapType || (SwapType = {}));

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
function getLimitsForSlippage(tokensIn, tokensOut, swapType, deltas, assets, slippage) {
    // Limits:
    // +ve means max to send
    // -ve mean min to receive
    // For a multihop the intermediate tokens should be 0
    const limits = new Array(assets.length).fill(Zero);
    assets.forEach((token, i) => {
        if (tokensIn.some((tokenIn) => isSameAddress(token, tokenIn))) {
            // For SwapExactOut slippage is on tokenIn, i.e. amtIn + slippage
            const slippageAmount = BigNumber.from(slippage).add(WeiPerEther);
            limits[i] =
                swapType === SwapType.SwapExactOut
                    ? limits[i].add(BigNumber.from(deltas[i]).mul(slippageAmount).div(WeiPerEther))
                    : limits[i].add(deltas[i]);
        }
        if (tokensOut.some((tokenOut) => isSameAddress(token, tokenOut))) {
            // For SwapExactIn slippage is on tokenOut, i.e. amtOut - slippage
            const slippageAmount = WeiPerEther.sub(BigNumber.from(slippage));
            limits[i] =
                swapType === SwapType.SwapExactIn
                    ? limits[i].add(BigNumber.from(deltas[i]).mul(slippageAmount).div(WeiPerEther))
                    : limits[i].add(deltas[i]);
        }
    });
    return limits;
}

const bpsPerOne = BigNumber.from('10000'); // number of basis points in 100%
/**
 * Multiplies input by slippage amount
 *
 * @param {BigNumber} amount Input amount (not parsed)
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result delta from multiplying amount and slippage
 */
const mulSlippage = (amount, slippage) => {
    const delta = amount.mul(slippage).div(bpsPerOne);
    return delta;
};
/**
 * Reduce input amount by slippage factor
 *
 * @param {BigNumber} amount Input in EVM amounts
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount subtracting slippage
 */
const subSlippage = (amount, slippage) => {
    const delta = mulSlippage(amount, slippage);
    return amount.sub(delta);
};
/**
 * Increase input amount by slippage factor
 *
 * @param {BigNumber} amount Input in EVM amounts
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount adding slippage
 */
const addSlippage = (amount, slippage) => {
    const delta = mulSlippage(amount, slippage);
    return amount.add(delta);
};

const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const BALANCER_NETWORK_CONFIG = {
    [Network.MAINNET]: {
        chainId: Network.MAINNET,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
                lidoRelayer: '0xdcdbf71A870cc60C6F9B621E28a7D3Ffd6Dd4965',
                gaugeController: '0xc128468b7ce63ea702c1f104d55a2566b13d3abd',
                feeDistributor: '0xD3cf852898b21fc233251427c2DC93d3d604F3BB',
            },
            tokens: {
                wrappedNativeAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                lbpRaisingTokens: [
                    '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                ],
                stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                bal: '0xba100000625a3754423978a60c9317c58a424e3d',
                veBal: '0xC128a9954e6c874eA3d62ce62B468bA073093F25',
                bbaUsd: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
            blockNumberSubgraph: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
        },
        pools: {
            wETHwstETH: {
                id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
                address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
            },
        },
    },
    [Network.POLYGON]: {
        chainId: Network.POLYGON,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0xa1B2b503959aedD81512C37e9dce48164ec6a94d',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-polygon',
            blockNumberSubgraph: 'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks',
        },
        pools: {},
    },
    [Network.ARBITRUM]: {
        chainId: Network.ARBITRUM,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x269ff446d9892c9e19082564df3f5e8741e190a1',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges-arbitrum',
            blockNumberSubgraph: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks',
        },
        pools: {},
    },
    [Network.KOVAN]: {
        chainId: Network.KOVAN,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x2cc8688C5f75E365aaEEb4ea8D6a480405A48D2A',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
        },
        pools: {},
    },
    [Network.ROPSTEN]: {
        chainId: Network.ROPSTEN,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: '',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
        },
        pools: {},
    },
    [Network.RINKEBY]: {
        chainId: Network.RINKEBY,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-rinkeby-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
        },
        pools: {},
    },
    [Network.GOERLI]: {
        chainId: Network.GOERLI,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e',
                gaugeController: '0xBB1CE49b16d55A1f2c6e88102f32144C7334B116',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
            blockNumberSubgraph: 'https://api.thegraph.com/subgraphs/name/blocklytics/goerli-blocks',
        },
        pools: {},
    },
    [Network.OPTIMISM]: {
        chainId: Network.OPTIMISM,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x2dc0e2aa608532da689e89e237df582b783e552c',
            },
            tokens: {
                wrappedNativeAsset: '0x4200000000000000000000000000000000000006',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism',
        },
        pools: {},
    },
};
const networkAddresses = (chainId) => BALANCER_NETWORK_CONFIG[chainId].addresses;

var BalancerErrorCode;
(function (BalancerErrorCode) {
    BalancerErrorCode["SWAP_ZERO_RETURN_AMOUNT"] = "SWAP_ZERO_RETURN_AMOUNT";
    BalancerErrorCode["UNWRAP_ZERO_AMOUNT"] = "UNWRAP_ZERO_AMOUNT";
    BalancerErrorCode["WRAP_ZERO_AMOUNT"] = "WRAP_ZERO_AMOUNT";
    BalancerErrorCode["QUERY_BATCH_SWAP"] = "QUERY_BATCH_SWAP";
    BalancerErrorCode["POOL_DOESNT_EXIST"] = "POOL_DOESNT_EXIST";
    BalancerErrorCode["UNSUPPORTED_POOL_TYPE"] = "UNSUPPORTED_POOL_TYPE";
    BalancerErrorCode["UNSUPPORTED_PAIR"] = "UNSUPPORTED_PAIR";
    BalancerErrorCode["NO_POOL_DATA"] = "NO_POOL_DATA";
    BalancerErrorCode["INPUT_OUT_OF_BOUNDS"] = "INPUT_OUT_OF_BOUNDS";
    BalancerErrorCode["INPUT_LENGTH_MISMATCH"] = "INPUT_LENGTH_MISMATCH";
    BalancerErrorCode["INPUT_ZERO_NOT_ALLOWED"] = "INPUT_ZERO_NOT_ALLOWED";
    BalancerErrorCode["TOKEN_MISMATCH"] = "TOKEN_MISMATCH";
    BalancerErrorCode["MISSING_TOKENS"] = "MISSING_TOKENS";
    BalancerErrorCode["MISSING_AMP"] = "MISSING_AMP";
    BalancerErrorCode["MISSING_DECIMALS"] = "MISSING_DECIMALS";
    BalancerErrorCode["MISSING_PRICE_RATE"] = "MISSING_PRICE_RATE";
    BalancerErrorCode["MISSING_WEIGHT"] = "MISSING_WEIGHT";
})(BalancerErrorCode || (BalancerErrorCode = {}));
class BalancerError extends Error {
    constructor(code) {
        super(BalancerError.getMessage(code));
        this.code = code;
        this.name = 'BalancerError';
    }
    static getMessage(code) {
        switch (code) {
            case BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT:
                return 'queryBatchSwapWithSor returned 0 amount';
            case BalancerErrorCode.UNWRAP_ZERO_AMOUNT:
                return 'swapUnwrapAaveStaticExactIn unwrapped amount < 0';
            case BalancerErrorCode.WRAP_ZERO_AMOUNT:
                return 'swapUnwrapAaveStaticExactOut wrapped amount < 0';
            case BalancerErrorCode.QUERY_BATCH_SWAP:
                return 'queryBatchSwap on chain call error';
            case BalancerErrorCode.POOL_DOESNT_EXIST:
                return 'balancer pool does not exist';
            case BalancerErrorCode.UNSUPPORTED_POOL_TYPE:
                return 'unsupported pool type';
            case BalancerErrorCode.UNSUPPORTED_PAIR:
                return 'unsupported token pair';
            case BalancerErrorCode.NO_POOL_DATA:
                return 'no pool data';
            case BalancerErrorCode.INPUT_OUT_OF_BOUNDS:
                return 'input out of bounds';
            case BalancerErrorCode.INPUT_LENGTH_MISMATCH:
                return 'input length mismatch';
            case BalancerErrorCode.TOKEN_MISMATCH:
                return 'token mismatch';
            case BalancerErrorCode.MISSING_DECIMALS:
                return 'missing decimals';
            case BalancerErrorCode.MISSING_TOKENS:
                return 'missing tokens';
            case BalancerErrorCode.MISSING_AMP:
                return 'missing amp';
            case BalancerErrorCode.MISSING_PRICE_RATE:
                return 'missing price rate';
            case BalancerErrorCode.MISSING_WEIGHT:
                return 'missing weight';
            case BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED:
                return 'zero input not allowed';
            default:
                return 'Unknown error';
        }
    }
}

class StablePoolExit {
    constructor() {
        this.buildExitExactBPTIn = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            if (!bptIn.length || parseFixed$1(bptIn, 18).isNegative()) {
                throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
            }
            if (singleTokenMaxOut &&
                singleTokenMaxOut !== AddressZero &&
                !pool.tokens.map((t) => t.address).some((a) => a === singleTokenMaxOut)) {
                throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
            }
            if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
                throw new Error('shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values');
            // Check if there's any relevant stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Replace WETH address with ETH - required for exiting with ETH
            const unwrappedTokens = parsedTokens.map((token) => token === wrappedNativeAsset ? AddressZero : token);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [sortedTokens, sortedBalances] = assetHelpers.sortTokens(shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens, parsedBalances);
            let minAmountsOut = Array(parsedTokens.length).fill('0');
            let userData;
            if (singleTokenMaxOut) {
                // Exit pool with single token using exact bptIn
                const singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
                // Calculate amount out given BPT in
                const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(BigInt(parsedAmp), sortedBalances.map((b) => BigInt(b)), singleTokenMaxOutIndex, BigInt(bptIn), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
                // Apply slippage tolerance
                minAmountsOut[singleTokenMaxOutIndex] = subSlippage(BigNumber.from(amountOut), BigNumber.from(slippage)).toString();
                userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(bptIn, singleTokenMaxOutIndex);
            }
            else {
                // Exit pool with all tokens proportinally
                // Calculate amount out given BPT in
                const amountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(sortedBalances.map((b) => BigInt(b)), BigInt(bptIn), BigInt(parsedTotalShares)).map((amount) => amount.toString());
                // Apply slippage tolerance
                minAmountsOut = amountsOut.map((amount) => {
                    const minAmount = subSlippage(BigNumber.from(amount), BigNumber.from(slippage));
                    return minAmount.toString();
                });
                userData = StablePoolEncoder.exitExactBPTInForTokensOut(bptIn);
            }
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut,
                    userData,
                    toInternalBalance: false,
                },
            };
            // Encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut,
                maxBPTIn: bptIn,
            };
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            if (tokensOut.length != amountsOut.length ||
                tokensOut.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            // Parse pool info into EVM amounts in order to match amountsOut scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [, sortedBalances] = assetHelpers.sortTokens(parsedTokens, parsedBalances);
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensOut, amountsOut);
            // Calculate expected BPT in given tokens out
            const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(BigInt(parsedAmp), sortedBalances.map((b) => BigInt(b)), sortedAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            // Apply slippage tolerance
            const maxBPTIn = addSlippage(BigNumber.from(bptIn), BigNumber.from(slippage)).toString();
            const userData = StablePoolEncoder.exitBPTInForExactTokensOut(sortedAmounts, maxBPTIn);
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut: sortedAmounts,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut: sortedAmounts,
                maxBPTIn,
            };
        };
    }
}

class StablePoolJoin {
    constructor() {
        /**
         * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
         * @param {JoinPoolParameters}  params - parameters used to build exact tokens in for bpt out transaction
         * @param {string}              params.joiner - Account address joining pool
         * @param {Pool}                params.pool - Subgraph pool object of pool being joined
         * @param {string[]}            params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
         * @param {string[]}            params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
         * @param {string}              params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
         * @returns                     transaction request ready to send with signer.sendTransaction
         */
        this.buildJoin = ({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) => {
            if (tokensIn.length != amountsIn.length ||
                tokensIn.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            // sort inputs
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensIn, amountsIn);
            // sort pool info
            const [, sortedBalances] = assetHelpers.sortTokens(parsedTokens, parsedBalances);
            const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(BigInt(parsedAmp), sortedBalances.map((b) => BigInt(b)), sortedAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            const minBPTOut = subSlippage(BigNumber.from(expectedBPTOut), BigNumber.from(slippage)).toString();
            const userData = StablePoolEncoder.joinExactTokensInForBPTOut(sortedAmounts, minBPTOut);
            const to = balancerVault;
            const functionName = 'joinPool';
            const attributes = {
                poolId: pool.id,
                sender: joiner,
                recipient: joiner,
                joinPoolRequest: {
                    assets: sortedTokens,
                    maxAmountsIn: sortedAmounts,
                    userData,
                    fromInternalBalance: false,
                },
            };
            const vaultInterface = Vault__factory.createInterface();
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.joinPoolRequest,
            ]);
            const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
            const value = values[0] ? BigNumber.from(values[0]) : undefined;
            return { to, functionName, attributes, data, value, minBPTOut };
        };
    }
}

function parseFixed(value, decimals) {
    const valueWithTrimmedDecimals = new RegExp(`[0-9]+\\.?[0-9]{0,${decimals}}`);
    const result = value.match(valueWithTrimmedDecimals);
    let parsedValue = value;
    if (result) {
        parsedValue = result[0];
    }
    return parseFixed$1(parsedValue, decimals);
}
function formatFixed(value, decimals) {
    const ethersFormat = formatFixed$1(value, decimals);
    return ethersFormat.replace(/(.0$)/, '');
}

const SCALING_FACTOR$4 = 18;
class StablePoolLiquidity {
    calcTotal(tokens) {
        var _a, _b;
        let sumBalance = BigNumber.from(0);
        let sumValue = BigNumber.from(0);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // if a token's price is unknown, ignore it
            // it will be computed at the next step
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR$4);
            const balance = parseFixed(token.balance, SCALING_FACTOR$4);
            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumBalance = sumBalance.add(balance);
        }
        // if at least the partial value of the pool is known
        // then compute the rest of the value of tokens with unknown prices
        if (sumBalance.gt(0)) {
            const avgPrice = sumValue.div(sumBalance);
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if ((_b = token.price) === null || _b === void 0 ? void 0 : _b.usd) {
                    continue;
                }
                const balance = parseFixed(token.balance, SCALING_FACTOR$4);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed$1(sumValue, SCALING_FACTOR$4 * 2).toString();
    }
}

class StablePoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const stablePool = StablePool.fromPool(pool);
        const poolPairData = stablePool.parsePoolPairData(tokenIn, tokenOut);
        return stablePool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

const BZERO = BigInt(0);
const BONE = BigInt(1);
const ONE$1 = BigInt('1000000000000000000'); // 18 decimal places
const _require = (b, message) => {
    if (!b)
        throw new Error(message);
};
/**
 * @dev Returns a scaling factor that, when multiplied to a token amount for `token`, normalizes its balance as if
 * it had 18 decimals.
 */
function _computeScalingFactor(tokenDecimals) {
    // Tokens with more than 18 decimals are not supported.
    const decimalsDifference = BigInt(18) - tokenDecimals;
    return ONE$1 * BigInt(10) ** decimalsDifference;
}
/**
 * @dev Applies `scalingFactor` to `amount`, resulting in a larger or equal value depending on whether it needed
 * scaling or not.
 */
function _upscale(amount, scalingFactor) {
    // Upscale rounding wouldn't necessarily always go in the same direction: in a swap for example the balance of
    // token in should be rounded up, and that of token out rounded down. This is the only place where we round in
    // the same direction for all amounts, as the impact of this rounding is expected to be minimal (and there's no
    // rounding error unless `_scalingFactor()` is overriden).
    return SolidityMaths.mulDownFixed(amount, scalingFactor);
}
class SolidityMaths {
    /**
     * @dev Returns the addition of two unsigned integers of 256 bits, reverting on overflow.
     */
    // add(a: bigint, b: bigint): bigint {
    //     const c = a + b;
    //     // _require(c >= a, Errors.ADD_OVERFLOW);
    //     return c;
    // }
    /**
     * @dev Returns the addition of two signed integers, reverting on overflow.
     */
    static add(a, b) {
        const c = a + b;
        _require((b >= 0 && c >= a) || (b < 0 && c < a), 'Errors.ADD_OVERFLOW');
        return c;
    }
    /**
     * @dev Returns the subtraction of two unsigned integers of 256 bits, reverting on overflow.
     */
    static sub(a, b) {
        _require(b <= a, 'Errors.SUB_OVERFLOW');
        const c = a - b;
        return c;
    }
    /**
     * @dev Returns the subtraction of two signed integers, reverting on overflow.
     */
    // sub(int256 a, int256 b) internal pure returns (int256) {
    //     int256 c = a - b;
    //     // _require((b >= 0 && c <= a) || (b < 0 && c > a), Errors.SUB_OVERFLOW);
    //     return c;
    // }
    /**
     * @dev Returns the largest of two numbers of 256 bits.
     */
    static max(a, b) {
        return a >= b ? a : b;
    }
    /**
     * @dev Returns the smallest of two numbers of 256 bits.
     */
    static min(a, b) {
        return a < b ? a : b;
    }
    static mul(a, b) {
        const c = a * b;
        _require(a == BZERO || c / a == b, 'Errors.MUL_OVERFLOW');
        return c;
    }
    static div(a, b, roundUp) {
        return roundUp ? this.divUp(a, b) : this.divDown(a, b);
    }
    static divDown(a, b) {
        _require(b != BZERO, 'Errors.ZERO_DIVISION');
        return a / b;
    }
    static divUp(a, b) {
        _require(b != BZERO, 'Errors.ZERO_DIVISION');
        if (a == BZERO) {
            return BZERO;
        }
        else {
            return BONE + (a - BONE) / b;
        }
    }
    static mulUpFixed(a, b) {
        const product = a * b;
        _require(a == BZERO || product / a == b, 'Errors.MUL_OVERFLOW');
        if (product == BZERO) {
            return BZERO;
        }
        else {
            // The traditional divUp formula is:
            // divUp(x, y) := (x + y - 1) / y
            // To avoid intermediate overflow in the addition, we distribute the division and get:
            // divUp(x, y) := (x - 1) / y + 1
            // Note that this requires x != 0, which we already tested for.
            return (product - BONE) / ONE$1 + BONE;
        }
    }
    // Modification: Taken from the fixed point class
    static divDownFixed(a, b) {
        _require(b != BZERO, 'Errors.ZERO_DIVISION');
        if (a == BZERO) {
            return BZERO;
        }
        else {
            const aInflated = a * ONE$1;
            // _require(aInflated / a == ONE, Errors.DIV_INTERNAL); // mul overflow
            return aInflated / b;
        }
    }
    // Modification: Taken from the fixed point class
    static divUpFixed(a, b) {
        _require(b != BZERO, 'Errors.ZERO_DIVISION');
        if (a == BZERO) {
            return BZERO;
        }
        else {
            const aInflated = a * ONE$1;
            _require(aInflated / a == ONE$1, 'Errors.DIV_INTERNAL'); // mul overflow
            // The traditional divUp formula is:
            // divUp(x, y) := (x + y - 1) / y
            // To avoid intermediate overflow in the addition, we distribute the division and get:
            // divUp(x, y) := (x - 1) / y + 1
            // Note that this requires x != 0, which we already tested for.
            return (aInflated - BONE) / b + BONE;
        }
    }
    // Modification: Taken from the fixed point class
    static powUpFixed(x, y) {
        const raw = LogExpMath.pow(x, y);
        const maxError = this.add(this.mulUpFixed(raw, this.MAX_POW_RELATIVE_ERROR), BONE);
        return this.add(raw, maxError);
    }
    // Modification: Taken from the fixed point class
    static complementFixed(x) {
        return x < ONE$1 ? ONE$1 - x : BZERO;
    }
    static mulDownFixed(a, b) {
        const product = a * b;
        _require(a == BZERO || product / a == b, 'Errors.MUL_OVERFLOW');
        return product / ONE$1;
    }
}
// Modification: Taken from the fixed point class
SolidityMaths.MAX_POW_RELATIVE_ERROR = BigInt(10000);
class LogExpMath {
    // All arguments and return values are 18 decimal fixed point numbers.
    static pow(x, y) {
        if (y === BZERO) {
            // We solve the 0^0 indetermination by making it equal one.
            return this.ONE_18;
        }
        if (x == BZERO) {
            return BZERO;
        }
        // Instead of computing x^y directly, we instead rely on the properties of logarithms and exponentiation to
        // arrive at that result. In particular, exp(ln(x)) = x, and ln(x^y) = y * ln(x). This means
        // x^y = exp(y * ln(x)).
        // The ln function takes a signed value, so we need to make sure x fits in the signed 256 bit range.
        _require(x <
            BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819968'), 'Errors.X_OUT_OF_BOUNDS');
        const x_int256 = x;
        // We will compute y * ln(x) in a single step. Depending on the value of x, we can either use ln or ln_36. In
        // both cases, we leave the division by ONE_18 (due to fixed point multiplication) to the end.
        // This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 256 bit range.
        _require(y < this.MILD_EXPONENT_BOUND, 'Errors.Y_OUT_OF_BOUNDS');
        const y_int256 = y;
        let logx_times_y;
        if (this.LN_36_LOWER_BOUND < x_int256 &&
            x_int256 < this.LN_36_UPPER_BOUND) {
            const ln_36_x = this._ln_36(x_int256);
            // ln_36_x has 36 decimal places, so multiplying by y_int256 isn't as straightforward, since we can't just
            // bring y_int256 to 36 decimal places, as it might overflow. Instead, we perform two 18 decimal
            // multiplications and add the results: one with the first 18 decimals of ln_36_x, and one with the
            // (downscaled) last 18 decimals.
            logx_times_y =
                (ln_36_x / this.ONE_18) * y_int256 +
                    ((ln_36_x % this.ONE_18) * y_int256) / this.ONE_18;
        }
        else {
            logx_times_y = this._ln(x_int256) * y_int256;
        }
        logx_times_y /= this.ONE_18;
        // Finally, we compute exp(y * ln(x)) to arrive at x^y
        _require(this.MIN_NATURAL_EXPONENT <= logx_times_y &&
            logx_times_y <= this.MAX_NATURAL_EXPONENT, 'Errors.PRODUCT_OUT_OF_BOUNDS');
        // return uint256(exp(logx_times_y));
        return this.exp(logx_times_y);
    }
    static exp(x) {
        _require(x >= this.MIN_NATURAL_EXPONENT && x <= this.MAX_NATURAL_EXPONENT, 'Errors.INVALID_EXPONENT');
        if (x < 0) {
            // We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
            // fits in the signed 256 bit range (as it is larger than MIN_NATURAL_EXPONENT).
            // Fixed point division requires multiplying by ONE_18.
            return (this.ONE_18 * this.ONE_18) / this.exp(BigInt(-1) * x);
        }
        // First, we use the fact that e^(x+y) = e^x * e^y to decompose x into a sum of powers of two, which we call x_n,
        // where x_n == 2^(7 - n), and e^x_n = a_n has been precomputed. We choose the first x_n, x0, to equal 2^7
        // because all larger powers are larger than MAX_NATURAL_EXPONENT, and therefore not present in the
        // decomposition.
        // At the end of this process we will have the product of all e^x_n = a_n that apply, and the remainder of this
        // decomposition, which will be lower than the smallest x_n.
        // exp(x) = k_0 * a_0 * k_1 * a_1 * ... + k_n * a_n * exp(remainder), where each k_n equals either 0 or 1.
        // We mutate x by subtracting x_n, making it the remainder of the decomposition.
        // The first two a_n (e^(2^7) and e^(2^6)) are too large if stored as 18 decimal numbers, and could cause
        // intermediate overflows. Instead we store them as plain integers, with 0 decimals.
        // Additionally, x0 + x1 is larger than MAX_NATURAL_EXPONENT, which means they will not both be present in the
        // decomposition.
        // For each x_n, we test if that term is present in the decomposition (if x is larger than it), and if so deduct
        // it and compute the accumulated product.
        let firstAN;
        if (x >= this.x0) {
            x -= this.x0;
            firstAN = this.a0;
        }
        else if (x >= this.x1) {
            x -= this.x1;
            firstAN = this.a1;
        }
        else {
            firstAN = BigInt(1); // One with no decimal places
        }
        // We now transform x into a 20 decimal fixed point number, to have enhanced precision when computing the
        // smaller terms.
        x *= BigInt(100);
        // `product` is the accumulated product of all a_n (except a0 and a1), which starts at 20 decimal fixed point
        // one. Recall that fixed point multiplication requires dividing by ONE_20.
        let product = this.ONE_20;
        if (x >= this.x2) {
            x -= this.x2;
            product = (product * this.a2) / this.ONE_20;
        }
        if (x >= this.x3) {
            x -= this.x3;
            product = (product * this.a3) / this.ONE_20;
        }
        if (x >= this.x4) {
            x -= this.x4;
            product = (product * this.a4) / this.ONE_20;
        }
        if (x >= this.x5) {
            x -= this.x5;
            product = (product * this.a5) / this.ONE_20;
        }
        if (x >= this.x6) {
            x -= this.x6;
            product = (product * this.a6) / this.ONE_20;
        }
        if (x >= this.x7) {
            x -= this.x7;
            product = (product * this.a7) / this.ONE_20;
        }
        if (x >= this.x8) {
            x -= this.x8;
            product = (product * this.a8) / this.ONE_20;
        }
        if (x >= this.x9) {
            x -= this.x9;
            product = (product * this.a9) / this.ONE_20;
        }
        // x10 and x11 are unnecessary here since we have high enough precision already.
        // Now we need to compute e^x, where x is small (in particular, it is smaller than x9). We use the Taylor series
        // expansion for e^x: 1 + x + (x^2 / 2!) + (x^3 / 3!) + ... + (x^n / n!).
        let seriesSum = this.ONE_20; // The initial one in the sum, with 20 decimal places.
        let term; // Each term in the sum, where the nth term is (x^n / n!).
        // The first term is simply x.
        term = x;
        seriesSum += term;
        // Each term (x^n / n!) equals the previous one times x, divided by n. Since x is a fixed point number,
        // multiplying by it requires dividing by this.ONE_20, but dividing by the non-fixed point n values does not.
        term = (term * x) / this.ONE_20 / BigInt(2);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(3);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(4);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(5);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(6);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(7);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(8);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(9);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(10);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(11);
        seriesSum += term;
        term = (term * x) / this.ONE_20 / BigInt(12);
        seriesSum += term;
        // 12 Taylor terms are sufficient for 18 decimal precision.
        // We now have the first a_n (with no decimals), and the product of all other a_n present, and the Taylor
        // approximation of the exponentiation of the remainder (both with 20 decimals). All that remains is to multiply
        // all three (one 20 decimal fixed point multiplication, dividing by this.ONE_20, and one integer multiplication),
        // and then drop two digits to return an 18 decimal value.
        return (((product * seriesSum) / this.ONE_20) * firstAN) / BigInt(100);
    }
    static _ln_36(x) {
        // Since ln(1) = 0, a value of x close to one will yield a very small result, which makes using 36 digits
        // worthwhile.
        // First, we transform x to a 36 digit fixed point value.
        x *= this.ONE_18;
        // We will use the following Taylor expansion, which converges very rapidly. Let z = (x - 1) / (x + 1).
        // ln(x) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))
        // Recall that 36 digit fixed point division requires multiplying by ONE_36, and multiplication requires
        // division by ONE_36.
        const z = ((x - this.ONE_36) * this.ONE_36) / (x + this.ONE_36);
        const z_squared = (z * z) / this.ONE_36;
        // num is the numerator of the series: the z^(2 * n + 1) term
        let num = z;
        // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        let seriesSum = num;
        // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(3);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(5);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(7);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(9);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(11);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(13);
        num = (num * z_squared) / this.ONE_36;
        seriesSum += num / BigInt(15);
        // 8 Taylor terms are sufficient for 36 decimal precision.
        // All that remains is multiplying by 2 (non fixed point).
        return seriesSum * BigInt(2);
    }
    /**
     * @dev Internal natural logarithm (ln(a)) with signed 18 decimal fixed point argument.
     */
    static _ln(a) {
        if (a < this.ONE_18) {
            // Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a)). If a is less
            // than one, 1/a will be greater than one, and this if statement will not be entered in the recursive call.
            // Fixed point division requires multiplying by this.ONE_18.
            return BigInt(-1) * this._ln((this.ONE_18 * this.ONE_18) / a);
        }
        // First, we use the fact that ln^(a * b) = ln(a) + ln(b) to decompose ln(a) into a sum of powers of two, which
        // we call x_n, where x_n == 2^(7 - n), which are the natural logarithm of precomputed quantities a_n (that is,
        // ln(a_n) = x_n). We choose the first x_n, x0, to equal 2^7 because the exponential of all larger powers cannot
        // be represented as 18 fixed point decimal numbers in 256 bits, and are therefore larger than a.
        // At the end of this process we will have the sum of all x_n = ln(a_n) that apply, and the remainder of this
        // decomposition, which will be lower than the smallest a_n.
        // ln(a) = k_0 * x_0 + k_1 * x_1 + ... + k_n * x_n + ln(remainder), where each k_n equals either 0 or 1.
        // We mutate a by subtracting a_n, making it the remainder of the decomposition.
        // For reasons related to how `exp` works, the first two a_n (e^(2^7) and e^(2^6)) are not stored as fixed point
        // numbers with 18 decimals, but instead as plain integers with 0 decimals, so we need to multiply them by
        // this.ONE_18 to convert them to fixed point.
        // For each a_n, we test if that term is present in the decomposition (if a is larger than it), and if so divide
        // by it and compute the accumulated sum.
        let sum = BZERO;
        if (a >= this.a0 * this.ONE_18) {
            a /= this.a0; // Integer, not fixed point division
            sum += this.x0;
        }
        if (a >= this.a1 * this.ONE_18) {
            a /= this.a1; // Integer, not fixed point division
            sum += this.x1;
        }
        // All other a_n and x_n are stored as 20 digit fixed point numbers, so we convert the sum and a to this format.
        sum *= BigInt(100);
        a *= BigInt(100);
        // Because further a_n are  20 digit fixed point numbers, we multiply by ONE_20 when dividing by them.
        if (a >= this.a2) {
            a = (a * this.ONE_20) / this.a2;
            sum += this.x2;
        }
        if (a >= this.a3) {
            a = (a * this.ONE_20) / this.a3;
            sum += this.x3;
        }
        if (a >= this.a4) {
            a = (a * this.ONE_20) / this.a4;
            sum += this.x4;
        }
        if (a >= this.a5) {
            a = (a * this.ONE_20) / this.a5;
            sum += this.x5;
        }
        if (a >= this.a6) {
            a = (a * this.ONE_20) / this.a6;
            sum += this.x6;
        }
        if (a >= this.a7) {
            a = (a * this.ONE_20) / this.a7;
            sum += this.x7;
        }
        if (a >= this.a8) {
            a = (a * this.ONE_20) / this.a8;
            sum += this.x8;
        }
        if (a >= this.a9) {
            a = (a * this.ONE_20) / this.a9;
            sum += this.x9;
        }
        if (a >= this.a10) {
            a = (a * this.ONE_20) / this.a10;
            sum += this.x10;
        }
        if (a >= this.a11) {
            a = (a * this.ONE_20) / this.a11;
            sum += this.x11;
        }
        // a is now a small number (smaller than a_11, which roughly equals 1.06). This means we can use a Taylor series
        // that converges rapidly for values of `a` close to one - the same one used in ln_36.
        // Let z = (a - 1) / (a + 1).
        // ln(a) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))
        // Recall that 20 digit fixed point division requires multiplying by ONE_20, and multiplication requires
        // division by ONE_20.
        const z = ((a - this.ONE_20) * this.ONE_20) / (a + this.ONE_20);
        const z_squared = (z * z) / this.ONE_20;
        // num is the numerator of the series: the z^(2 * n + 1) term
        let num = z;
        // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        let seriesSum = num;
        // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) / this.ONE_20;
        seriesSum += num / BigInt(3);
        num = (num * z_squared) / this.ONE_20;
        seriesSum += num / BigInt(5);
        num = (num * z_squared) / this.ONE_20;
        seriesSum += num / BigInt(7);
        num = (num * z_squared) / this.ONE_20;
        seriesSum += num / BigInt(9);
        num = (num * z_squared) / this.ONE_20;
        seriesSum += num / BigInt(11);
        // 6 Taylor terms are sufficient for 36 decimal precision.
        // Finally, we multiply by 2 (non fixed point) to compute ln(remainder)
        seriesSum *= BigInt(2);
        // We now have the sum of all x_n present, and the Taylor approximation of the logarithm of the remainder (both
        // with 20 decimals). All that remains is to sum these two, and then drop two digits to return a 18 decimal
        // value.
        return (sum + seriesSum) / BigInt(100);
    }
}
// All fixed point multiplications and divisions are inlined. This means we need to divide by ONE when multiplying
// two numbers, and multiply by ONE when dividing them.
// All arguments and return values are 18 decimal fixed point numbers.
LogExpMath.ONE_18 = BigInt('1000000000000000000');
// Internally, intermediate values are computed with higher precision as 20 decimal fixed point numbers, and in the
// case of ln36, 36 decimals.
LogExpMath.ONE_20 = BigInt('100000000000000000000');
LogExpMath.ONE_36 = BigInt('1000000000000000000000000000000000000');
// The domain of natural exponentiation is bound by the word size and number of decimals used.
//
// Because internally the result will be stored using 20 decimals, the largest possible result is
// (2^255 - 1) / 10^20, which makes the largest exponent ln((2^255 - 1) / 10^20) = 130.700829182905140221.
// The smallest possible result is 10^(-18), which makes largest negative argument
// ln(10^(-18)) = -41.446531673892822312.
// We use 130.0 and -41.0 to have some safety margin.
LogExpMath.MAX_NATURAL_EXPONENT = BigInt('130000000000000000000');
LogExpMath.MIN_NATURAL_EXPONENT = BigInt('-41000000000000000000');
// Bounds for ln_36's argument. Both ln(0.9) and ln(1.1) can be represented with 36 decimal places in a fixed point
// 256 bit integer.
LogExpMath.LN_36_LOWER_BOUND = BigInt(LogExpMath.ONE_18) - BigInt('100000000000000000');
LogExpMath.LN_36_UPPER_BOUND = BigInt(LogExpMath.ONE_18) + BigInt('100000000000000000');
LogExpMath.MILD_EXPONENT_BOUND = BigInt(2) ** BigInt(254) / LogExpMath.ONE_20;
// 18 decimal constants
LogExpMath.x0 = BigInt('128000000000000000000'); // 2ˆ7
LogExpMath.a0 = BigInt('38877084059945950922200000000000000000000000000000000000'); // eˆ(x0) (no decimals)
LogExpMath.x1 = BigInt('64000000000000000000'); // 2ˆ6
LogExpMath.a1 = BigInt('6235149080811616882910000000'); // eˆ(x1) (no decimals)
// 20 decimal constants
LogExpMath.x2 = BigInt('3200000000000000000000'); // 2ˆ5
LogExpMath.a2 = BigInt('7896296018268069516100000000000000'); // eˆ(x2)
LogExpMath.x3 = BigInt('1600000000000000000000'); // 2ˆ4
LogExpMath.a3 = BigInt('888611052050787263676000000'); // eˆ(x3)
LogExpMath.x4 = BigInt('800000000000000000000'); // 2ˆ3
LogExpMath.a4 = BigInt('298095798704172827474000'); // eˆ(x4)
LogExpMath.x5 = BigInt('400000000000000000000'); // 2ˆ2
LogExpMath.a5 = BigInt('5459815003314423907810'); // eˆ(x5)
LogExpMath.x6 = BigInt('200000000000000000000'); // 2ˆ1
LogExpMath.a6 = BigInt('738905609893065022723'); // eˆ(x6)
LogExpMath.x7 = BigInt('100000000000000000000'); // 2ˆ0
LogExpMath.a7 = BigInt('271828182845904523536'); // eˆ(x7)
LogExpMath.x8 = BigInt('50000000000000000000'); // 2ˆ-1
LogExpMath.a8 = BigInt('164872127070012814685'); // eˆ(x8)
LogExpMath.x9 = BigInt('25000000000000000000'); // 2ˆ-2
LogExpMath.a9 = BigInt('128402541668774148407'); // eˆ(x9)
LogExpMath.x10 = BigInt('12500000000000000000'); // 2ˆ-3
LogExpMath.a10 = BigInt('113314845306682631683'); // eˆ(x10)
LogExpMath.x11 = BigInt('6250000000000000000'); // 2ˆ-4
LogExpMath.a11 = BigInt('106449445891785942956'); // eˆ(x11)

function calcPriceImpact(bptAmount, bptZeroPriceImpact) {
    // 1 - (bptAmount/bptZeroPI)
    return ONE$1 - SolidityMaths.divDownFixed(bptAmount, bptZeroPriceImpact);
}

const AMP_PRECISION = BigInt(1e3);
function bptSpotPrice(amp, balances, bptSupply, tokenIndexIn) {
    const totalCoins = balances.length;
    const D = _calculateInvariant(amp, balances, true);
    let S = BZERO;
    let D_P = D / BigInt(totalCoins);
    for (let i = 0; i < totalCoins; i++) {
        if (i != tokenIndexIn) {
            S = S + balances[i];
            D_P = (D_P * D) / (BigInt(totalCoins) * balances[i]);
        }
    }
    const x = balances[tokenIndexIn];
    const alpha = amp * BigInt(totalCoins);
    const beta = alpha * S; // units: 10 ** 21
    const gamma = BigInt(AMP_PRECISION) - alpha;
    const partial_x = BigInt(2) * alpha * x + beta + gamma * D;
    const minus_partial_D = D_P * BigInt(totalCoins + 1) * AMP_PRECISION - gamma * x;
    const ans = SolidityMaths.divUpFixed((partial_x * bptSupply) / minus_partial_D, D);
    return ans;
}
function _calculateInvariant(amp, balances, roundUp) {
    /**********************************************************************************************
        // invariant                                                                                 //
        // D = invariant                                                  D^(n+1)                    //
        // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
        // S = sum of balances                                             n^n P                     //
        // P = product of balances                                                                   //
        // n = number of tokens                                                                      //
        *********x************************************************************************************/
    // We support rounding up or down.
    let sum = BZERO;
    const numTokens = balances.length;
    for (let i = 0; i < numTokens; i++) {
        sum = sum + balances[i];
    }
    if (sum == BZERO) {
        return BZERO;
    }
    let prevInvariant = BZERO;
    let invariant = sum;
    const ampTimesTotal = amp * BigInt(numTokens);
    for (let i = 0; i < 255; i++) {
        let P_D = balances[0] * BigInt(numTokens);
        for (let j = 1; j < numTokens; j++) {
            P_D = SolidityMaths.div(SolidityMaths.mul(SolidityMaths.mul(P_D, balances[j]), BigInt(numTokens)), invariant, roundUp);
        }
        prevInvariant = invariant;
        invariant = SolidityMaths.div(SolidityMaths.mul(SolidityMaths.mul(BigInt(numTokens), invariant), invariant) +
            SolidityMaths.div(SolidityMaths.mul(SolidityMaths.mul(ampTimesTotal, sum), P_D), AMP_PRECISION, roundUp), SolidityMaths.mul(BigInt(numTokens + 1), invariant) +
            // No need to use checked arithmetic for the amp precision, the amp is guaranteed to be at least 1
            SolidityMaths.div(SolidityMaths.mul(ampTimesTotal - AMP_PRECISION, P_D), AMP_PRECISION, !roundUp), roundUp);
        if (invariant > prevInvariant) {
            if (invariant - prevInvariant <= 1) {
                return invariant;
            }
        }
        else if (prevInvariant - invariant <= 1) {
            return invariant;
        }
    }
    throw new Error('Errors.STABLE_INVARIANT_DIDNT_CONVERGE');
}

class StablePoolPriceImpact {
    /**
     * Calculates the BPT return amount when investing with no price impact.
     * @param { Pool } pool Investment pool.
     * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token.
     * @returns { bigint } BPT amount.
     */
    bptZeroPriceImpact(pool, tokenAmounts) {
        if (tokenAmounts.length !== pool.tokensList.length)
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        // upscales amp, swapfee, totalshares
        const { parsedBalances, parsedDecimals, parsedAmp, parsedTotalShares } = parsePoolInfo(pool);
        const decimals = parsedDecimals.map((decimals) => {
            if (!decimals)
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            return BigInt(decimals);
        });
        if (!parsedAmp)
            throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
        const totalShares = BigInt(parsedTotalShares);
        const scalingFactors = decimals.map((decimals) => _computeScalingFactor(BigInt(decimals)));
        const balances = parsedBalances.map((balance, i) => _upscale(BigInt(balance), scalingFactors[i]));
        let bptZeroPriceImpact = BZERO;
        for (let i = 0; i < balances.length; i++) {
            const price = bptSpotPrice(BigInt(parsedAmp), // this already includes the extra digits from precision
            balances, totalShares, i);
            const scalingFactor = _computeScalingFactor(BigInt(decimals[i]));
            const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
            const newTerm = (price * amountUpscaled) / ONE$1;
            bptZeroPriceImpact += newTerm;
        }
        return bptZeroPriceImpact;
    }
    calcPriceImpact(pool, tokenAmounts, bptAmount) {
        const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts.map((a) => BigInt(a)));
        return calcPriceImpact(BigInt(bptAmount), bptZeroPriceImpact).toString();
    }
}

class Stable {
    constructor(exit = new StablePoolExit(), join = new StablePoolJoin(), liquidity = new StablePoolLiquidity(), spotPriceCalculator = new StablePoolSpotPrice(), priceImpactCalculator = new StablePoolPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

var ComposableStablePoolJoinKind;
(function (ComposableStablePoolJoinKind) {
    ComposableStablePoolJoinKind[ComposableStablePoolJoinKind["INIT"] = 0] = "INIT";
    ComposableStablePoolJoinKind[ComposableStablePoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
    ComposableStablePoolJoinKind[ComposableStablePoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
})(ComposableStablePoolJoinKind || (ComposableStablePoolJoinKind = {}));
var StablePhantomPoolJoinKind;
(function (StablePhantomPoolJoinKind) {
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["INIT"] = 0] = "INIT";
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["COLLECT_PROTOCOL_FEES"] = 1] = "COLLECT_PROTOCOL_FEES";
})(StablePhantomPoolJoinKind || (StablePhantomPoolJoinKind = {}));
var ComposableStablePoolExitKind;
(function (ComposableStablePoolExitKind) {
    ComposableStablePoolExitKind[ComposableStablePoolExitKind["EXACT_BPT_IN_FOR_ONE_TOKEN_OUT"] = 0] = "EXACT_BPT_IN_FOR_ONE_TOKEN_OUT";
    ComposableStablePoolExitKind[ComposableStablePoolExitKind["BPT_IN_FOR_EXACT_TOKENS_OUT"] = 1] = "BPT_IN_FOR_EXACT_TOKENS_OUT";
})(ComposableStablePoolExitKind || (ComposableStablePoolExitKind = {}));
class ComposableStablePoolEncoder {
    /**
     * Cannot be constructed.
     */
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    }
}
/**
 * Encodes the userData parameter for providing the initial liquidity to a ComposableStablePool
 * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
 */
ComposableStablePoolEncoder.joinInit = (amountsIn) => defaultAbiCoder.encode(['uint256', 'uint256[]'], [ComposableStablePoolJoinKind.INIT, amountsIn]);
/**
 * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
 */
ComposableStablePoolEncoder.joinCollectProtocolFees = () => defaultAbiCoder.encode(['uint256'], [StablePhantomPoolJoinKind.COLLECT_PROTOCOL_FEES]);
/**
 * Encodes the userData parameter for joining a ComposableStablePool with exact token inputs
 * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
 * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
 */
ComposableStablePoolEncoder.joinExactTokensInForBPTOut = (amountsIn, minimumBPT) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [
    ComposableStablePoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT,
    amountsIn,
    minimumBPT,
]);
/**
 * Encodes the userData parameter for joining a ComposableStablePool with to receive an exact amount of BPT
 * @param bptAmountOut - the amount of BPT to be minted
 * @param enterTokenIndex - the index of the token to be provided as liquidity
 */
ComposableStablePoolEncoder.joinTokenInForExactBPTOut = (bptAmountOut, enterTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    ComposableStablePoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT,
    bptAmountOut,
    enterTokenIndex,
]);
/**
 * Encodes the userData parameter for exiting a ComposableStablePool by removing a single token in return for an exact amount of BPT
 * @param bptAmountIn - the amount of BPT to be burned
 * @param enterTokenIndex - the index of the token to removed from the pool
 */
ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut = (bptAmountIn, exitTokenIndex) => defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [
    ComposableStablePoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT,
    bptAmountIn,
    exitTokenIndex,
]);
/**
 * Encodes the userData parameter for exiting a ComposableStablePool by removing exact amounts of tokens
 * @param amountsOut - the amounts of each token to be withdrawn from the pool
 * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
 */
ComposableStablePoolEncoder.exitBPTInForExactTokensOut = (amountsOut, maxBPTAmountIn) => defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [
    ComposableStablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT,
    amountsOut,
    maxBPTAmountIn,
]);

class ComposableStablePoolExit {
    constructor() {
        this.buildExitSingleTokenOut = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            if (!bptIn.length || parseFixed$1(bptIn, 18).isNegative()) {
                throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
            }
            if (singleTokenMaxOut &&
                singleTokenMaxOut !== AddressZero &&
                !pool.tokens.map((t) => t.address).some((a) => a === singleTokenMaxOut)) {
                throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
            }
            if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
                throw new Error('shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values');
            // Check if there's any relevant stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Replace WETH address with ETH - required for exiting with ETH
            const unwrappedTokens = parsedTokens.map((token) => token === wrappedNativeAsset ? AddressZero : token);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [sortedTokens, sortedBalances] = assetHelpers.sortTokens(shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens, parsedBalances);
            const minAmountsOut = Array(parsedTokens.length).fill('0');
            // Exit pool with single token using exact bptIn
            const singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
            // Calculate amount out given BPT in
            const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(BigInt(parsedAmp), sortedBalances.map((b) => BigInt(b)), singleTokenMaxOutIndex, BigInt(bptIn), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            // Apply slippage tolerance
            minAmountsOut[singleTokenMaxOutIndex] = subSlippage(BigNumber.from(amountOut), BigNumber.from(slippage)).toString();
            const userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(bptIn, singleTokenMaxOutIndex);
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut,
                    userData,
                    toInternalBalance: false,
                },
            };
            // Encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut,
                maxBPTIn: bptIn,
            };
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            if (tokensOut.length != amountsOut.length ||
                tokensOut.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            // Parse pool info into EVM amounts in order to match amountsOut scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [, sortedBalances] = assetHelpers.sortTokens(parsedTokens, parsedBalances);
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensOut, amountsOut);
            // Calculate expected BPT in given tokens out
            const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(BigInt(parsedAmp), sortedBalances.map((b) => BigInt(b)), sortedAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            // Apply slippage tolerance
            const maxBPTIn = addSlippage(BigNumber.from(bptIn), BigNumber.from(slippage)).toString();
            const userData = ComposableStablePoolEncoder.exitBPTInForExactTokensOut(sortedAmounts, maxBPTIn);
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut: sortedAmounts,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut: sortedAmounts,
                maxBPTIn,
            };
        };
    }
}

class ComposableStable {
    constructor(exit = new ComposableStablePoolExit(), join = new StablePoolJoin(), liquidity = new StablePoolLiquidity(), spotPriceCalculator = new StablePoolSpotPrice(), priceImpactCalculator = new StablePoolPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

class WeightedPoolExit {
    constructor() {
        this.buildExitExactBPTIn = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            if (!bptIn.length || parseFixed$1(bptIn, 18).isNegative()) {
                throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
            }
            if (singleTokenMaxOut &&
                singleTokenMaxOut !== AddressZero &&
                !pool.tokens.map((t) => t.address).some((a) => a === singleTokenMaxOut)) {
                throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
            }
            if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
                throw new Error('shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values');
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedWeights, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Replace WETH address with ETH - required for exiting with ETH
            const unwrappedTokens = parsedTokens.map((token) => token === wrappedNativeAsset ? AddressZero : token);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [sortedTokens, sortedBalances, sortedWeights] = assetHelpers.sortTokens(shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens, parsedBalances, parsedWeights);
            let minAmountsOut = Array(sortedTokens.length).fill('0');
            let userData;
            if (singleTokenMaxOut) {
                // Exit pool with single token using exact bptIn
                const singleTokenMaxOutIndex = sortedTokens.indexOf(singleTokenMaxOut);
                // Calculate amount out given BPT in
                const amountOut = SOR.WeightedMaths._calcTokenOutGivenExactBptIn(BigInt(sortedBalances[singleTokenMaxOutIndex]), BigInt(sortedWeights[singleTokenMaxOutIndex]), BigInt(bptIn), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
                // Apply slippage tolerance
                minAmountsOut[singleTokenMaxOutIndex] = subSlippage(BigNumber.from(amountOut), BigNumber.from(slippage)).toString();
                userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(bptIn, singleTokenMaxOutIndex);
            }
            else {
                // Exit pool with all tokens proportinally
                // Calculate amounts out given BPT in
                const amountsOut = SOR.WeightedMaths._calcTokensOutGivenExactBptIn(sortedBalances.map((b) => BigInt(b)), BigInt(bptIn), BigInt(parsedTotalShares)).map((amount) => amount.toString());
                // Apply slippage tolerance
                minAmountsOut = amountsOut.map((amount) => {
                    const minAmount = subSlippage(BigNumber.from(amount), BigNumber.from(slippage));
                    return minAmount.toString();
                });
                userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
            }
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut,
                maxBPTIn: bptIn,
            };
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            if (tokensOut.length != amountsOut.length ||
                tokensOut.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedWeights, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Sort pool info and inputs based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [, sortedBalances, sortedWeights] = assetHelpers.sortTokens(parsedTokens, parsedBalances, parsedWeights);
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensOut, amountsOut);
            // Calculate expected BPT in given tokens out
            const bptIn = SOR.WeightedMaths._calcBptInGivenExactTokensOut(sortedBalances.map((b) => BigInt(b)), sortedWeights.map((w) => BigInt(w)), sortedAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            // Apply slippage tolerance
            const maxBPTIn = addSlippage(BigNumber.from(bptIn), BigNumber.from(slippage)).toString();
            const userData = WeightedPoolEncoder.exitBPTInForExactTokensOut(sortedAmounts, maxBPTIn);
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut: sortedAmounts,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut: sortedAmounts,
                maxBPTIn,
            };
        };
    }
}

class WeightedPoolJoin {
    constructor() {
        /**
         * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
         * @param {JoinPoolParameters} params - parameters used to build exact tokens in for bpt out transaction
         * @param {string}                          params.joiner - Account address joining pool
         * @param {SubgraphPoolBase}                params.pool - Subgraph pool object of pool being joined
         * @param {string[]}                        params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
         * @param {string[]}                        params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
         * @param {string}                          params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
         * @param {string}                          wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for joining with ETH.
         * @returns                                 transaction request ready to send with signer.sendTransaction
         */
        this.buildJoin = ({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) => {
            if (tokensIn.length != amountsIn.length ||
                tokensIn.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant weighted pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (pool.tokens.some((token) => !token.weight))
                throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedWeights, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            // sort inputs
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensIn, amountsIn);
            // sort pool info
            const [, sortedBalances, sortedWeights] = assetHelpers.sortTokens(parsedTokens, parsedBalances, parsedWeights);
            const expectedBPTOut = WeightedMaths._calcBptOutGivenExactTokensIn(sortedBalances.map((b) => BigInt(b)), sortedWeights.map((w) => BigInt(w)), sortedAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            const minBPTOut = subSlippage(BigNumber.from(expectedBPTOut), BigNumber.from(slippage)).toString();
            const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(sortedAmounts, minBPTOut);
            const to = balancerVault;
            const functionName = 'joinPool';
            const attributes = {
                poolId: pool.id,
                sender: joiner,
                recipient: joiner,
                joinPoolRequest: {
                    assets: sortedTokens,
                    maxAmountsIn: sortedAmounts,
                    userData,
                    fromInternalBalance: false,
                },
            };
            const vaultInterface = Vault__factory.createInterface();
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.joinPoolRequest,
            ]);
            const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
            const value = values[0] ? BigNumber.from(values[0]) : undefined;
            return { to, functionName, attributes, data, value, minBPTOut };
        };
    }
}

const SCALING_FACTOR$3 = 18;
class WeightedPoolLiquidity {
    calcTotal(tokens) {
        var _a;
        let sumWeight = BigNumber.from(0);
        let sumValue = BigNumber.from(0);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR$3);
            const balance = parseFixed(token.balance, SCALING_FACTOR$3);
            const weight = parseFixed(token.weight || '0', SCALING_FACTOR$3);
            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumWeight = sumWeight.add(weight);
        }
        // Scale the known prices of x% of the pool to get value of 100% of the pool.
        const totalWeight = tokens.reduce((total, token) => total.add(parseFixed(token.weight || '0', SCALING_FACTOR$3)), BigNumber.from(0));
        if (sumWeight.gt(0)) {
            const liquidity = sumValue.mul(totalWeight).div(sumWeight);
            return formatFixed(liquidity, SCALING_FACTOR$3 * 2);
        }
        return '0';
    }
}

class WeightedPoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const weightedPool = WeightedPool.fromPool(pool);
        const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
        return weightedPool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class WeightedPoolPriceImpact {
    /**
     * Calculates the BPT return amount when investing with no price impact.
     * @param { Pool } pool Investment pool.
     * @param { bigint [] } amounts Token amounts being invested. EVM Scale. Needs a value for each pool token.
     * @returns { bigint } BPT amount.
     */
    bptZeroPriceImpact(pool, tokenAmounts) {
        if (tokenAmounts.length !== pool.tokensList.length)
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        // swapFee, totalShares, totalWeight all scaled up to 18 decimals
        const { parsedBalances, parsedDecimals, parsedTotalShares, parsedWeights } = parsePoolInfo(pool);
        const totalShares = BigInt(parsedTotalShares);
        const tokensList = cloneDeep(pool.tokensList);
        let bptZeroPriceImpact = BZERO;
        for (let i = 0; i < tokensList.length; i++) {
            const decimals = parsedDecimals[i];
            let scalingFactor;
            let balance;
            if (!decimals)
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            else {
                scalingFactor = _computeScalingFactor(BigInt(decimals));
                balance = _upscale(BigInt(parsedBalances[i]), scalingFactor);
            }
            const weightString = parsedWeights[i];
            let weight;
            if (!weightString)
                throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
            else {
                weight = BigInt(weightString);
            }
            const price = (weight * totalShares) / balance;
            const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
            const newTerm = (price * amountUpscaled) / ONE$1;
            bptZeroPriceImpact += newTerm;
        }
        return bptZeroPriceImpact;
    }
    calcPriceImpact(pool, tokenAmounts, bptAmount) {
        const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts.map((a) => BigInt(a)));
        return calcPriceImpact(BigInt(bptAmount), bptZeroPriceImpact).toString();
    }
}

class Weighted {
    constructor(exit = new WeightedPoolExit(), join = new WeightedPoolJoin(), liquidity = new WeightedPoolLiquidity(), spotPriceCalculator = new WeightedPoolSpotPrice(), priceImpactCalculator = new WeightedPoolPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

class MetaStablePoolExit {
    constructor() {
        this.buildExitExactBPTIn = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            if (!bptIn.length || parseFixed$1(bptIn, 18).isNegative()) {
                throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
            }
            if (singleTokenMaxOut &&
                singleTokenMaxOut !== AddressZero &&
                !pool.tokens.map((t) => t.address).some((a) => a === singleTokenMaxOut)) {
                throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
            }
            if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
                throw new Error('shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values');
            // Check if there's any relevant meta stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            if (pool.tokens.some((token) => !token.priceRate))
                throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedAmp, parsedPriceRates, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Replace WETH address with ETH - required for exiting with ETH
            const unwrappedTokens = parsedTokens.map((token) => token === wrappedNativeAsset ? AddressZero : token);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [sortedTokens, sortedBalances, sortedPriceRates] = assetHelpers.sortTokens(shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens, parsedBalances, parsedPriceRates);
            // Scale balances based on price rate for each token
            const scaledBalances = sortedBalances.map((balance, i) => {
                return BigNumber.from(balance)
                    .mul(BigNumber.from(sortedPriceRates[i]))
                    .div(parseFixed$1('1', 18))
                    .toString();
            });
            let minAmountsOut = Array(parsedTokens.length).fill('0');
            let userData;
            if (singleTokenMaxOut) {
                // Exit pool with single token using exact bptIn
                const singleTokenMaxOutIndex = sortedTokens.indexOf(singleTokenMaxOut);
                // Calculate amount out given BPT in
                const scaledAmountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(BigInt(parsedAmp), scaledBalances.map((b) => BigInt(b)), singleTokenMaxOutIndex, BigInt(bptIn), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
                // Reverse scaled amount out based on token price rate
                const amountOut = BigNumber.from(scaledAmountOut)
                    .div(BigNumber.from(sortedPriceRates[singleTokenMaxOutIndex]))
                    .mul(parseFixed$1('1', 18))
                    .toString();
                minAmountsOut[singleTokenMaxOutIndex] = subSlippage(BigNumber.from(amountOut), BigNumber.from(slippage)).toString();
                userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(bptIn, singleTokenMaxOutIndex);
            }
            else {
                // Exit pool with all tokens proportinally
                // Calculate amount out given BPT in
                const scaledAmountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(scaledBalances.map((b) => BigInt(b)), BigInt(bptIn), BigInt(parsedTotalShares)).map((amount) => amount.toString());
                // Reverse scaled amounts out based on token price rate
                const amountsOut = scaledAmountsOut.map((amount, i) => {
                    return BigNumber.from(amount)
                        .div(BigNumber.from(sortedPriceRates[i]))
                        .mul(parseFixed$1('1', 18))
                        .toString();
                });
                // Apply slippage tolerance
                minAmountsOut = amountsOut.map((amount) => {
                    const minAmount = subSlippage(BigNumber.from(amount), BigNumber.from(slippage));
                    return minAmount.toString();
                });
                userData = StablePoolEncoder.exitExactBPTInForTokensOut(bptIn);
            }
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut,
                maxBPTIn: bptIn,
            };
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            if (tokensOut.length != amountsOut.length ||
                tokensOut.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant meta stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            if (pool.tokens.some((token) => !token.priceRate))
                throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
            // Parse pool info into EVM amounts in order to match amountsOut scalling
            const { parsedTokens, parsedBalances, parsedPriceRates, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            // Sort pool info based on tokens addresses
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [, sortedBalances, sortedPriceRates] = assetHelpers.sortTokens(parsedTokens, parsedBalances, parsedPriceRates);
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensOut, amountsOut);
            // Scale amounts out based on price rate for each token
            const scaledAmounts = sortedAmounts.map((amount, i) => {
                return BigNumber.from(amount)
                    .mul(BigNumber.from(sortedPriceRates[i]))
                    .div(parseFixed$1('1', 18))
                    .toString();
            });
            // Scale balances based on price rate for each token
            const scaledBalances = sortedBalances.map((balance, i) => {
                return BigNumber.from(balance)
                    .mul(BigNumber.from(sortedPriceRates[i]))
                    .div(parseFixed$1('1', 18))
                    .toString();
            });
            // Calculate expected BPT in given tokens out
            const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(BigInt(parsedAmp), scaledBalances.map((b) => BigInt(b)), scaledAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            // Apply slippage tolerance
            const maxBPTIn = addSlippage(BigNumber.from(bptIn), BigNumber.from(slippage)).toString();
            const userData = StablePoolEncoder.exitBPTInForExactTokensOut(sortedAmounts, // must not use scaledAmounts because it should match amountsOut provided by the user
            maxBPTIn);
            // This is a hack to get around rounding issues for scaled amounts on MetaStable pools
            // TODO: do this more elegantly
            const minAmountsOut = sortedAmounts.map((a, i) => a === scaledAmounts[i] ? a : BigNumber.from(a).sub(1).toString());
            const to = balancerVault;
            const functionName = 'exitPool';
            const attributes = {
                poolId: pool.id,
                sender: exiter,
                recipient: exiter,
                exitPoolRequest: {
                    assets: sortedTokens,
                    minAmountsOut,
                    userData,
                    toInternalBalance: false,
                },
            };
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const vaultInterface = Vault__factory.createInterface();
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.exitPoolRequest,
            ]);
            return {
                to,
                functionName,
                attributes,
                data,
                minAmountsOut,
                maxBPTIn,
            };
        };
    }
}

class MetaStablePoolJoin {
    constructor() {
        /**
         * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
         * @param {JoinPoolParameters}  params - parameters used to build exact tokens in for bpt out transaction
         * @param {string}              params.joiner - Account address joining pool
         * @param {Pool}                params.pool - Subgraph pool object of pool being joined
         * @param {string[]}            params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
         * @param {string[]}            params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
         * @param {string}              params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
         * @returns                     transaction request ready to send with signer.sendTransaction
         */
        this.buildJoin = ({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) => {
            if (tokensIn.length != amountsIn.length ||
                tokensIn.length != pool.tokensList.length) {
                throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
            }
            // Check if there's any relevant meta stable pool info missing
            if (pool.tokens.some((token) => !token.decimals))
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            if (!pool.amp)
                throw new BalancerError(BalancerErrorCode.MISSING_AMP);
            if (pool.tokens.some((token) => !token.priceRate))
                throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
            // Parse pool info into EVM amounts in order to match amountsIn scalling
            const { parsedTokens, parsedBalances, parsedPriceRates, parsedAmp, parsedTotalShares, parsedSwapFee, } = parsePoolInfo(pool);
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            // sort input
            const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(tokensIn, amountsIn);
            // sort pool info
            const [, sortedBalances, sortedPriceRates] = assetHelpers.sortTokens(parsedTokens, parsedBalances, parsedPriceRates);
            // scale amounts in based on price rate for each token
            const scaledAmounts = sortedAmounts.map((amount, i) => {
                return BigNumber.from(amount)
                    .mul(BigNumber.from(sortedPriceRates[i]))
                    .div(parseFixed$1('1', 18))
                    .toString();
            });
            // scale balances based on price rate for each token
            const scaledBalances = sortedBalances.map((balance, i) => {
                return BigNumber.from(balance)
                    .mul(BigNumber.from(sortedPriceRates[i]))
                    .div(parseFixed$1('1', 18))
                    .toString();
            });
            // TODO: check if it's ok to remove amounts/balances scaled logic since it's cancelling itself out
            const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(BigInt(parsedAmp), scaledBalances.map((b) => BigInt(b)), scaledAmounts.map((a) => BigInt(a)), BigInt(parsedTotalShares), BigInt(parsedSwapFee)).toString();
            const minBPTOut = subSlippage(BigNumber.from(expectedBPTOut), BigNumber.from(slippage)).toString();
            const userData = StablePoolEncoder.joinExactTokensInForBPTOut(sortedAmounts, minBPTOut);
            const to = balancerVault;
            const functionName = 'joinPool';
            const attributes = {
                poolId: pool.id,
                sender: joiner,
                recipient: joiner,
                joinPoolRequest: {
                    assets: sortedTokens,
                    maxAmountsIn: sortedAmounts,
                    userData,
                    fromInternalBalance: false,
                },
            };
            const vaultInterface = Vault__factory.createInterface();
            // encode transaction data into an ABI byte string which can be sent to the network to be executed
            const data = vaultInterface.encodeFunctionData(functionName, [
                attributes.poolId,
                attributes.sender,
                attributes.recipient,
                attributes.joinPoolRequest,
            ]);
            const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
            const value = values[0] ? BigNumber.from(values[0]) : undefined;
            return { to, functionName, attributes, data, value, minBPTOut };
        };
    }
}

const SCALING_FACTOR$2 = 18;
class MetaStablePoolLiquidity {
    calcTotal(tokens) {
        var _a, _b;
        let sumBalance = Zero;
        let sumValue = Zero;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // if a token's price is unknown, ignore it
            // it will be computed at the next step
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR$2);
            const balance = parseFixed(token.balance, SCALING_FACTOR$2);
            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumBalance = sumBalance.add(balance);
        }
        // if at least the partial value of the pool is known
        // then compute the rest of the value of tokens with unknown prices
        if (sumBalance.gt(0)) {
            const avgPrice = sumValue.div(sumBalance);
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if ((_b = token.price) === null || _b === void 0 ? void 0 : _b.usd) {
                    continue;
                }
                const balance = parseFixed(token.balance, SCALING_FACTOR$2);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed$1(sumValue, SCALING_FACTOR$2 * 2).toString();
    }
}

class MetaStablePoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const metaStablePool = MetaStablePool.fromPool(pool);
        const poolPairData = metaStablePool.parsePoolPairData(tokenIn, tokenOut);
        return metaStablePool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class MetaStablePoolPriceImpact {
    /**
     * Calculates the BPT return amount when investing with no price impact.
     * @param { Pool } pool Investment pool.
     * @param { string [] } amounts Token amounts being invested. Needs a value for each pool token.
     * @returns { string } BPT amount.
     */
    bptZeroPriceImpact(pool, tokenAmounts) {
        if (tokenAmounts.length !== pool.tokensList.length)
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        const { parsedBalances, parsedDecimals, parsedPriceRates, parsedAmp, parsedTotalShares, } = parsePoolInfo(pool);
        const totalShares = BigInt(parsedTotalShares);
        const decimals = parsedDecimals.map((decimals) => {
            if (!decimals)
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            return BigInt(decimals);
        });
        const priceRates = parsedPriceRates.map((rate) => {
            if (!rate)
                throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
            return BigInt(rate);
        });
        if (!parsedAmp)
            throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
        const scalingFactors = decimals.map((decimals) => _computeScalingFactor(BigInt(decimals)));
        const balances = parsedBalances.map((balance, i) => _upscale(BigInt(balance), scalingFactors[i]));
        const balancesScaled = balances.map((balance, i) => SolidityMaths.mulDownFixed(balance, priceRates[i]));
        let bptZeroPriceImpact = BZERO;
        for (let i = 0; i < balances.length; i++) {
            const price = (bptSpotPrice(BigInt(parsedAmp), // this already includes the extra digits from precision
            balancesScaled, totalShares, i) *
                priceRates[i]) /
                ONE$1;
            const scalingFactor = _computeScalingFactor(BigInt(pool.tokens[i].decimals));
            const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
            const newTerm = (price * amountUpscaled) / ONE$1;
            bptZeroPriceImpact += newTerm;
        }
        return bptZeroPriceImpact;
    }
    calcPriceImpact(pool, tokenAmounts, bptAmount) {
        const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts.map((a) => BigInt(a)));
        return calcPriceImpact(BigInt(bptAmount), bptZeroPriceImpact).toString();
    }
}

class MetaStable {
    constructor(exit = new MetaStablePoolExit(), join = new MetaStablePoolJoin(), liquidity = new MetaStablePoolLiquidity(), spotPriceCalculator = new MetaStablePoolSpotPrice(), priceImpactCalculator = new MetaStablePoolPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

class StablePhantomPoolExit {
    constructor() {
        this.buildExitExactBPTIn = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            // TODO implementation
            console.log(exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut);
            throw new Error('To be implemented');
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            // TODO implementation
            console.log(exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset);
            throw new Error('To be implemented');
        };
    }
}

class StablePhantomPoolJoin {
    constructor() {
        this.buildJoin = ({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) => {
            // TODO implementation
            console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
            throw new Error('To be implemented');
        };
    }
}

class StablePhantomPoolLiquidity {
    calcTotal(tokens) {
        if (tokens.length > 0) {
            throw new Error('Not Implemented - StablePhantom liquidity should all come from sub-pools.');
        }
        return '0';
    }
}

class PhantomStablePoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const metaStablePool = PhantomStablePool.fromPool(pool);
        const poolPairData = metaStablePool.parsePoolPairData(tokenIn, tokenOut);
        return metaStablePool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class StablePhantomPriceImpact {
    /**
     * Calculates the BPT return amount when investing with no price impact.
     * @param { Pool } pool Investment pool.
     * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token that is not a PhantomBpt.
     * @returns { bigint } BPT amount.
     */
    bptZeroPriceImpact(pool, tokenAmounts) {
        if (tokenAmounts.length !== pool.tokensList.length - 1)
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        const tokensList = cloneDeep(pool.tokensList);
        const bptIndex = tokensList.findIndex((token) => token == pool.address);
        // upscales amp, swapfee, totalshares
        const { parsedBalances, parsedDecimals, parsedPriceRates, parsedAmp, parsedTotalShares, } = parsePoolInfo(pool);
        const decimals = parsedDecimals.map((decimals) => {
            if (!decimals)
                throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
            return BigInt(decimals);
        });
        const priceRates = parsedPriceRates.map((rate) => {
            if (!rate)
                throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
            return BigInt(rate);
        });
        if (!parsedAmp)
            throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
        const totalShares = BigInt(parsedTotalShares);
        tokensList.splice(bptIndex, 1);
        const scalingFactors = decimals.map((decimals) => _computeScalingFactor(BigInt(decimals)));
        const balances = parsedBalances.map((balance, i) => _upscale(BigInt(balance), scalingFactors[i]));
        if (tokenAmounts.length !== tokensList.length)
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        balances.splice(bptIndex, 1);
        const balancesScaled = balances.map((balance, i) => SolidityMaths.mulDownFixed(balance, priceRates[i]));
        let bptZeroPriceImpact = BZERO;
        for (let i = 0; i < tokensList.length; i++) {
            const price = (bptSpotPrice(BigInt(parsedAmp), // this already includes the extra digits from precision
            balancesScaled, totalShares, i) *
                priceRates[i]) /
                ONE$1;
            const scalingFactor = _computeScalingFactor(BigInt(decimals[i]));
            const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
            const newTerm = (price * amountUpscaled) / ONE$1;
            bptZeroPriceImpact += newTerm;
        }
        return bptZeroPriceImpact;
    }
    calcPriceImpact(pool, tokenAmounts, bptAmount) {
        const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts.map((a) => BigInt(a)));
        return calcPriceImpact(BigInt(bptAmount), bptZeroPriceImpact).toString();
    }
}

class StablePhantom {
    constructor(exit = new StablePhantomPoolExit(), join = new StablePhantomPoolJoin(), liquidity = new StablePhantomPoolLiquidity(), spotPriceCalculator = new PhantomStablePoolSpotPrice(), priceImpactCalculator = new StablePhantomPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

class LinearPoolExit {
    constructor() {
        this.buildExitExactBPTIn = ({ exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut, }) => {
            // TODO implementation
            console.log(exiter, pool, bptIn, slippage, shouldUnwrapNativeAsset, wrappedNativeAsset, singleTokenMaxOut);
            throw new Error('To be implemented');
        };
        this.buildExitExactTokensOut = ({ exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset, }) => {
            // TODO implementation
            console.log(exiter, pool, tokensOut, amountsOut, slippage, wrappedNativeAsset);
            throw new Error('To be implemented');
        };
    }
}

class LinearPoolJoin {
    constructor() {
        this.buildJoin = ({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) => {
            // TODO implementation
            console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
            throw new Error('To be implemented');
        };
    }
}

const SCALING_FACTOR$1 = 18;
const ONE = parseFixed('1', SCALING_FACTOR$1);
class LinearPoolLiquidity {
    calcTotal(tokens) {
        var _a, _b;
        let sumBalance = Zero;
        let sumValue = Zero;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // if a token's price is unknown, ignore it
            // it will be computed at the next step
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR$1);
            const balance = parseFixed(token.balance, SCALING_FACTOR$1);
            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumBalance = sumBalance.add(balance);
        }
        // if at least the partial value of the pool is known
        // then compute the rest of the value of tokens with unknown prices
        if (sumBalance.gt(0)) {
            const avgPrice = sumValue.div(sumBalance);
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if ((_b = token.price) === null || _b === void 0 ? void 0 : _b.usd) {
                    continue;
                }
                const priceRate = parseFixed(token.priceRate || '1', SCALING_FACTOR$1);
                // Apply priceRate to scale the balance correctly
                const balance = parseFixed(token.balance, SCALING_FACTOR$1)
                    .mul(priceRate)
                    .div(ONE);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed(sumValue, SCALING_FACTOR$1 * 2);
    }
}

class LinearPoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const linearPool = LinearPool.fromPool(pool);
        const poolPairData = linearPool.parsePoolPairData(tokenIn, tokenOut);
        return linearPool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class LinearPriceImpact {
    bptZeroPriceImpact(pool, amounts) {
        throw new Error('Linear Pool bptZeroPriceImpact Not Implented');
    }
    calcPriceImpact(pool, tokenAmounts, bptAmount) {
        throw new Error('Linear Pool Price Impact Not Implented');
    }
}

class Linear {
    constructor(exit = new LinearPoolExit(), join = new LinearPoolJoin(), liquidity = new LinearPoolLiquidity(), spotPriceCalculator = new LinearPoolSpotPrice(), priceImpactCalculator = new LinearPriceImpact()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
        this.priceImpactCalculator = priceImpactCalculator;
    }
}

/**
 * Wrapper around pool type specific methods.
 *
 * Returns a class instance of a type specific method handlers.
 */
class PoolTypeConcerns {
    constructor(config, weighted = new Weighted(), stable = new Stable(), composableStable = new ComposableStable(), metaStable = new MetaStable(), stablePhantom = new StablePhantom(), linear = new Linear()) {
        this.weighted = weighted;
        this.stable = stable;
        this.composableStable = composableStable;
        this.metaStable = metaStable;
        this.stablePhantom = stablePhantom;
        this.linear = linear;
    }
    static from(poolType) {
        // Calculate spot price using pool type
        switch (poolType) {
            case 'Weighted':
            case 'Investment':
            case 'LiquidityBootstrapping': {
                return new Weighted();
            }
            case 'Stable': {
                return new Stable();
            }
            case 'ComposableStable': {
                return new ComposableStable();
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
                throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
        }
    }
}

const SCALE = 18;
class Liquidity {
    constructor(pools, tokenPrices) {
        this.pools = pools;
        this.tokenPrices = tokenPrices;
    }
    async getLiquidity(pool) {
        // Remove any tokens with same address as pool as they are pre-printed BPT
        const parsedTokens = pool.tokens.filter((token) => {
            return token.address !== pool.address;
        });
        // For all tokens that are pools, recurse into them and fetch their liquidity
        const subPoolLiquidity = await Promise.all(parsedTokens.map(async (token) => {
            const pool = await this.pools.findBy('address', token.address);
            if (!pool)
                return;
            const liquidity = parseFixed(await this.getLiquidity(pool), SCALE);
            const totalBPT = parseFixed(pool.totalShares, SCALE);
            const bptInParentPool = parseFixed(token.balance, SCALE);
            const liquidityInParentPool = liquidity
                .mul(bptInParentPool)
                .div(totalBPT);
            return {
                address: pool.address,
                liquidity: liquidityInParentPool,
            };
        }));
        const totalSubPoolLiquidity = subPoolLiquidity.reduce((totalLiquidity, subPool) => {
            if (!subPool)
                return BigNumber.from(0);
            return totalLiquidity.add(subPool.liquidity);
        }, BigNumber.from(0));
        const nonPoolTokens = parsedTokens.filter((token) => {
            return !subPoolLiquidity.find((pool) => (pool === null || pool === void 0 ? void 0 : pool.address) === token.address);
        });
        const tokenBalances = await Promise.all(nonPoolTokens.map(async (token) => {
            const tokenPrice = await this.tokenPrices.find(token.address);
            const poolToken = {
                address: token.address,
                decimals: token.decimals,
                priceRate: token.priceRate,
                price: tokenPrice,
                balance: token.balance,
                weight: token.weight,
            };
            return poolToken;
        }));
        const tokenLiquidity = PoolTypeConcerns.from(pool.poolType).liquidity.calcTotal(tokenBalances);
        const tl = parseFixed(tokenLiquidity, SCALE);
        const totalLiquidity = totalSubPoolLiquidity.add(tl);
        return formatFixed(totalLiquidity, SCALE);
    }
}

/*
 * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas. Calls to `swap` cannot be
 * simulated directly, but an equivalent `batchSwap` call can and will yield the exact same result.
 *
 * Each element in the array corresponds to the asset at the same index, and indicates the number of tokens (or ETH)
 * the Vault would take from the sender (if positive) or send to the recipient (if negative). The arguments it
 * receives are the same that an equivalent `batchSwap` call would receive.
 */
async function queryBatchSwap(vaultContract, swapType, swaps, assets) {
    const funds = {
        sender: AddressZero,
        recipient: AddressZero,
        fromInternalBalance: false,
        toInternalBalance: false,
    };
    try {
        const deltas = await vaultContract.callStatic.queryBatchSwap(swapType, swaps, assets, funds);
        return deltas.map((d) => d.toString());
    }
    catch (err) {
        throw `queryBatchSwap call error: ${err}`;
    }
}
/*
Uses SOR to create a batchSwap which is then queried onChain.
*/
async function queryBatchSwapWithSor(sor, vaultContract, queryWithSor) {
    if (queryWithSor.fetchPools.fetchPools)
        await sor.fetchPools();
    const swaps = [];
    const assetArray = [];
    // get path information for each tokenIn
    for (let i = 0; i < queryWithSor.tokensIn.length; i++) {
        const swap = await getSorSwapInfo(queryWithSor.tokensIn[i], queryWithSor.tokensOut[i], queryWithSor.swapType, queryWithSor.amounts[i].toString(), sor);
        if (!swap.returnAmount.gt(Zero))
            // Throw here because swaps with 0 amounts has no path and has misleading result for query
            throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);
        swaps.push(swap.swaps);
        assetArray.push(swap.tokenAddresses);
    }
    // Join swaps and assets together correctly
    const batchedSwaps = batchSwaps(assetArray, swaps);
    const returnTokens = queryWithSor.swapType === SwapType.SwapExactIn
        ? queryWithSor.tokensOut
        : queryWithSor.tokensIn;
    const returnAmounts = Array(returnTokens.length).fill('0');
    let deltas = Array(batchedSwaps.assets.length).fill('0');
    try {
        // Onchain query
        deltas = await queryBatchSwap(vaultContract, queryWithSor.swapType, batchedSwaps.swaps, batchedSwaps.assets);
        if (deltas.length > 0) {
            returnTokens.forEach((t, i) => {
                var _a;
                return (returnAmounts[i] =
                    (_a = deltas[batchedSwaps.assets.indexOf(t.toLowerCase())].toString()) !== null && _a !== void 0 ? _a : Zero.toString());
            });
        }
    }
    catch (err) {
        throw new BalancerError(BalancerErrorCode.QUERY_BATCH_SWAP);
    }
    return {
        returnAmounts,
        swaps: batchedSwaps.swaps,
        assets: batchedSwaps.assets,
        deltas: deltas.map((d) => d.toString()),
    };
}
/*
Use SOR to get swapInfo for tokenIn>tokenOut.
SwapInfos.swaps has path information.
*/
async function getSorSwapInfo(tokenIn, tokenOut, swapType, amount, sor) {
    const swapTypeSOR = swapType === SwapType.SwapExactIn
        ? SwapTypes.SwapExactIn
        : SwapTypes.SwapExactOut;
    const swapInfo = await sor.getSwaps(tokenIn.toLowerCase(), tokenOut.toLowerCase(), swapTypeSOR, amount);
    return swapInfo;
}
/*
Format multiple individual swaps/assets into a single swap/asset.
*/
function batchSwaps(assetArray, swaps) {
    // asset addresses without duplicates
    const newAssetArray = [...new Set(assetArray.flat())];
    // Update indices of each swap to use new asset array
    swaps.forEach((swap, i) => {
        swap.forEach((poolSwap) => {
            poolSwap.assetInIndex = newAssetArray.indexOf(assetArray[i][poolSwap.assetInIndex]);
            poolSwap.assetOutIndex = newAssetArray.indexOf(assetArray[i][poolSwap.assetOutIndex]);
        });
    });
    // Join Swaps into a single batchSwap
    const batchedSwaps = swaps.flat();
    return { swaps: batchedSwaps, assets: newAssetArray };
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var docCache = new Map();
var fragmentSourceMap = new Map();
var printFragmentWarnings = true;
var experimentalFragmentVariables = false;
function normalize(string) {
    return string.replace(/[\s,]+/g, ' ').trim();
}
function cacheKeyFromLoc(loc) {
    return normalize(loc.source.body.substring(loc.start, loc.end));
}
function processFragments(ast) {
    var seenKeys = new Set();
    var definitions = [];
    ast.definitions.forEach(function (fragmentDefinition) {
        if (fragmentDefinition.kind === 'FragmentDefinition') {
            var fragmentName = fragmentDefinition.name.value;
            var sourceKey = cacheKeyFromLoc(fragmentDefinition.loc);
            var sourceKeySet = fragmentSourceMap.get(fragmentName);
            if (sourceKeySet && !sourceKeySet.has(sourceKey)) {
                if (printFragmentWarnings) {
                    console.warn("Warning: fragment with name " + fragmentName + " already exists.\n"
                        + "graphql-tag enforces all fragment names across your application to be unique; read more about\n"
                        + "this in the docs: http://dev.apollodata.com/core/fragments.html#unique-names");
                }
            }
            else if (!sourceKeySet) {
                fragmentSourceMap.set(fragmentName, sourceKeySet = new Set);
            }
            sourceKeySet.add(sourceKey);
            if (!seenKeys.has(sourceKey)) {
                seenKeys.add(sourceKey);
                definitions.push(fragmentDefinition);
            }
        }
        else {
            definitions.push(fragmentDefinition);
        }
    });
    return __assign(__assign({}, ast), { definitions: definitions });
}
function stripLoc(doc) {
    var workSet = new Set(doc.definitions);
    workSet.forEach(function (node) {
        if (node.loc)
            delete node.loc;
        Object.keys(node).forEach(function (key) {
            var value = node[key];
            if (value && typeof value === 'object') {
                workSet.add(value);
            }
        });
    });
    var loc = doc.loc;
    if (loc) {
        delete loc.startToken;
        delete loc.endToken;
    }
    return doc;
}
function parseDocument(source) {
    var cacheKey = normalize(source);
    if (!docCache.has(cacheKey)) {
        var parsed = parse(source, {
            experimentalFragmentVariables: experimentalFragmentVariables,
            allowLegacyFragmentVariables: experimentalFragmentVariables
        });
        if (!parsed || parsed.kind !== 'Document') {
            throw new Error('Not a valid GraphQL document.');
        }
        docCache.set(cacheKey, stripLoc(processFragments(parsed)));
    }
    return docCache.get(cacheKey);
}
function gql(literals) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (typeof literals === 'string') {
        literals = [literals];
    }
    var result = literals[0];
    args.forEach(function (arg, i) {
        if (arg && arg.kind === 'Document') {
            result += arg.loc.source.body;
        }
        else {
            result += arg;
        }
        result += literals[i + 1];
    });
    return parseDocument(result);
}
function resetCaches() {
    docCache.clear();
    fragmentSourceMap.clear();
}
function disableFragmentWarnings() {
    printFragmentWarnings = false;
}
function enableExperimentalFragmentVariables() {
    experimentalFragmentVariables = true;
}
function disableExperimentalFragmentVariables() {
    experimentalFragmentVariables = false;
}
var extras = {
    gql: gql,
    resetCaches: resetCaches,
    disableFragmentWarnings: disableFragmentWarnings,
    enableExperimentalFragmentVariables: enableExperimentalFragmentVariables,
    disableExperimentalFragmentVariables: disableExperimentalFragmentVariables
};
(function (gql_1) {
    gql_1.gql = extras.gql, gql_1.resetCaches = extras.resetCaches, gql_1.disableFragmentWarnings = extras.disableFragmentWarnings, gql_1.enableExperimentalFragmentVariables = extras.enableExperimentalFragmentVariables, gql_1.disableExperimentalFragmentVariables = extras.disableExperimentalFragmentVariables;
})(gql || (gql = {}));
gql["default"] = gql;
var gql$1 = gql;

var AmpUpdate_OrderBy;
(function (AmpUpdate_OrderBy) {
    AmpUpdate_OrderBy["EndAmp"] = "endAmp";
    AmpUpdate_OrderBy["EndTimestamp"] = "endTimestamp";
    AmpUpdate_OrderBy["Id"] = "id";
    AmpUpdate_OrderBy["PoolId"] = "poolId";
    AmpUpdate_OrderBy["ScheduledTimestamp"] = "scheduledTimestamp";
    AmpUpdate_OrderBy["StartAmp"] = "startAmp";
    AmpUpdate_OrderBy["StartTimestamp"] = "startTimestamp";
})(AmpUpdate_OrderBy || (AmpUpdate_OrderBy = {}));
var BalancerSnapshot_OrderBy;
(function (BalancerSnapshot_OrderBy) {
    BalancerSnapshot_OrderBy["Id"] = "id";
    BalancerSnapshot_OrderBy["PoolCount"] = "poolCount";
    BalancerSnapshot_OrderBy["Timestamp"] = "timestamp";
    BalancerSnapshot_OrderBy["TotalLiquidity"] = "totalLiquidity";
    BalancerSnapshot_OrderBy["TotalSwapCount"] = "totalSwapCount";
    BalancerSnapshot_OrderBy["TotalSwapFee"] = "totalSwapFee";
    BalancerSnapshot_OrderBy["TotalSwapVolume"] = "totalSwapVolume";
    BalancerSnapshot_OrderBy["Vault"] = "vault";
})(BalancerSnapshot_OrderBy || (BalancerSnapshot_OrderBy = {}));
var Balancer_OrderBy;
(function (Balancer_OrderBy) {
    Balancer_OrderBy["Id"] = "id";
    Balancer_OrderBy["PoolCount"] = "poolCount";
    Balancer_OrderBy["Pools"] = "pools";
    Balancer_OrderBy["TotalLiquidity"] = "totalLiquidity";
    Balancer_OrderBy["TotalSwapCount"] = "totalSwapCount";
    Balancer_OrderBy["TotalSwapFee"] = "totalSwapFee";
    Balancer_OrderBy["TotalSwapVolume"] = "totalSwapVolume";
})(Balancer_OrderBy || (Balancer_OrderBy = {}));
var GradualWeightUpdate_OrderBy;
(function (GradualWeightUpdate_OrderBy) {
    GradualWeightUpdate_OrderBy["EndTimestamp"] = "endTimestamp";
    GradualWeightUpdate_OrderBy["EndWeights"] = "endWeights";
    GradualWeightUpdate_OrderBy["Id"] = "id";
    GradualWeightUpdate_OrderBy["PoolId"] = "poolId";
    GradualWeightUpdate_OrderBy["ScheduledTimestamp"] = "scheduledTimestamp";
    GradualWeightUpdate_OrderBy["StartTimestamp"] = "startTimestamp";
    GradualWeightUpdate_OrderBy["StartWeights"] = "startWeights";
})(GradualWeightUpdate_OrderBy || (GradualWeightUpdate_OrderBy = {}));
var InvestType;
(function (InvestType) {
    InvestType["Exit"] = "Exit";
    InvestType["Join"] = "Join";
})(InvestType || (InvestType = {}));
var JoinExit_OrderBy;
(function (JoinExit_OrderBy) {
    JoinExit_OrderBy["Amounts"] = "amounts";
    JoinExit_OrderBy["Id"] = "id";
    JoinExit_OrderBy["Pool"] = "pool";
    JoinExit_OrderBy["Sender"] = "sender";
    JoinExit_OrderBy["Timestamp"] = "timestamp";
    JoinExit_OrderBy["Tx"] = "tx";
    JoinExit_OrderBy["Type"] = "type";
    JoinExit_OrderBy["User"] = "user";
})(JoinExit_OrderBy || (JoinExit_OrderBy = {}));
var LatestPrice_OrderBy;
(function (LatestPrice_OrderBy) {
    LatestPrice_OrderBy["Asset"] = "asset";
    LatestPrice_OrderBy["Block"] = "block";
    LatestPrice_OrderBy["Id"] = "id";
    LatestPrice_OrderBy["PoolId"] = "poolId";
    LatestPrice_OrderBy["Price"] = "price";
    LatestPrice_OrderBy["PricingAsset"] = "pricingAsset";
})(LatestPrice_OrderBy || (LatestPrice_OrderBy = {}));
var ManagementOperation_OrderBy;
(function (ManagementOperation_OrderBy) {
    ManagementOperation_OrderBy["CashDelta"] = "cashDelta";
    ManagementOperation_OrderBy["Id"] = "id";
    ManagementOperation_OrderBy["ManagedDelta"] = "managedDelta";
    ManagementOperation_OrderBy["PoolTokenId"] = "poolTokenId";
    ManagementOperation_OrderBy["Timestamp"] = "timestamp";
    ManagementOperation_OrderBy["Type"] = "type";
})(ManagementOperation_OrderBy || (ManagementOperation_OrderBy = {}));
var OperationType;
(function (OperationType) {
    OperationType["Deposit"] = "Deposit";
    OperationType["Update"] = "Update";
    OperationType["Withdraw"] = "Withdraw";
})(OperationType || (OperationType = {}));
/** Defines the order direction, either ascending or descending */
var OrderDirection$1;
(function (OrderDirection) {
    OrderDirection["Asc"] = "asc";
    OrderDirection["Desc"] = "desc";
})(OrderDirection$1 || (OrderDirection$1 = {}));
var PoolHistoricalLiquidity_OrderBy;
(function (PoolHistoricalLiquidity_OrderBy) {
    PoolHistoricalLiquidity_OrderBy["Block"] = "block";
    PoolHistoricalLiquidity_OrderBy["Id"] = "id";
    PoolHistoricalLiquidity_OrderBy["PoolId"] = "poolId";
    PoolHistoricalLiquidity_OrderBy["PoolLiquidity"] = "poolLiquidity";
    PoolHistoricalLiquidity_OrderBy["PoolShareValue"] = "poolShareValue";
    PoolHistoricalLiquidity_OrderBy["PoolTotalShares"] = "poolTotalShares";
    PoolHistoricalLiquidity_OrderBy["PricingAsset"] = "pricingAsset";
})(PoolHistoricalLiquidity_OrderBy || (PoolHistoricalLiquidity_OrderBy = {}));
var PoolShare_OrderBy;
(function (PoolShare_OrderBy) {
    PoolShare_OrderBy["Balance"] = "balance";
    PoolShare_OrderBy["Id"] = "id";
    PoolShare_OrderBy["PoolId"] = "poolId";
    PoolShare_OrderBy["UserAddress"] = "userAddress";
})(PoolShare_OrderBy || (PoolShare_OrderBy = {}));
var PoolSnapshot_OrderBy;
(function (PoolSnapshot_OrderBy) {
    PoolSnapshot_OrderBy["Amounts"] = "amounts";
    PoolSnapshot_OrderBy["Id"] = "id";
    PoolSnapshot_OrderBy["Liquidity"] = "liquidity";
    PoolSnapshot_OrderBy["Pool"] = "pool";
    PoolSnapshot_OrderBy["SwapFees"] = "swapFees";
    PoolSnapshot_OrderBy["SwapVolume"] = "swapVolume";
    PoolSnapshot_OrderBy["Timestamp"] = "timestamp";
    PoolSnapshot_OrderBy["TotalShares"] = "totalShares";
})(PoolSnapshot_OrderBy || (PoolSnapshot_OrderBy = {}));
var PoolToken_OrderBy;
(function (PoolToken_OrderBy) {
    PoolToken_OrderBy["Address"] = "address";
    PoolToken_OrderBy["AssetManager"] = "assetManager";
    PoolToken_OrderBy["Balance"] = "balance";
    PoolToken_OrderBy["CashBalance"] = "cashBalance";
    PoolToken_OrderBy["Decimals"] = "decimals";
    PoolToken_OrderBy["Id"] = "id";
    PoolToken_OrderBy["ManagedBalance"] = "managedBalance";
    PoolToken_OrderBy["Managements"] = "managements";
    PoolToken_OrderBy["Name"] = "name";
    PoolToken_OrderBy["PoolId"] = "poolId";
    PoolToken_OrderBy["PriceRate"] = "priceRate";
    PoolToken_OrderBy["Symbol"] = "symbol";
    PoolToken_OrderBy["Token"] = "token";
    PoolToken_OrderBy["Weight"] = "weight";
})(PoolToken_OrderBy || (PoolToken_OrderBy = {}));
var Pool_OrderBy$1;
(function (Pool_OrderBy) {
    Pool_OrderBy["Address"] = "address";
    Pool_OrderBy["Amp"] = "amp";
    Pool_OrderBy["BaseToken"] = "baseToken";
    Pool_OrderBy["CreateTime"] = "createTime";
    Pool_OrderBy["ExpiryTime"] = "expiryTime";
    Pool_OrderBy["Factory"] = "factory";
    Pool_OrderBy["HistoricalValues"] = "historicalValues";
    Pool_OrderBy["HoldersCount"] = "holdersCount";
    Pool_OrderBy["Id"] = "id";
    Pool_OrderBy["LowerTarget"] = "lowerTarget";
    Pool_OrderBy["MainIndex"] = "mainIndex";
    Pool_OrderBy["ManagementFee"] = "managementFee";
    Pool_OrderBy["Name"] = "name";
    Pool_OrderBy["OracleEnabled"] = "oracleEnabled";
    Pool_OrderBy["Owner"] = "owner";
    Pool_OrderBy["PoolType"] = "poolType";
    Pool_OrderBy["PriceRateProviders"] = "priceRateProviders";
    Pool_OrderBy["PrincipalToken"] = "principalToken";
    Pool_OrderBy["Root3Alpha"] = "root3Alpha";
    Pool_OrderBy["Shares"] = "shares";
    Pool_OrderBy["Snapshots"] = "snapshots";
    Pool_OrderBy["SqrtAlpha"] = "sqrtAlpha";
    Pool_OrderBy["SqrtBeta"] = "sqrtBeta";
    Pool_OrderBy["StrategyType"] = "strategyType";
    Pool_OrderBy["SwapEnabled"] = "swapEnabled";
    Pool_OrderBy["SwapFee"] = "swapFee";
    Pool_OrderBy["Swaps"] = "swaps";
    Pool_OrderBy["SwapsCount"] = "swapsCount";
    Pool_OrderBy["Symbol"] = "symbol";
    Pool_OrderBy["Tokens"] = "tokens";
    Pool_OrderBy["TokensList"] = "tokensList";
    Pool_OrderBy["TotalLiquidity"] = "totalLiquidity";
    Pool_OrderBy["TotalShares"] = "totalShares";
    Pool_OrderBy["TotalSwapFee"] = "totalSwapFee";
    Pool_OrderBy["TotalSwapVolume"] = "totalSwapVolume";
    Pool_OrderBy["TotalWeight"] = "totalWeight";
    Pool_OrderBy["Tx"] = "tx";
    Pool_OrderBy["UnitSeconds"] = "unitSeconds";
    Pool_OrderBy["UpperTarget"] = "upperTarget";
    Pool_OrderBy["VaultId"] = "vaultID";
    Pool_OrderBy["WeightUpdates"] = "weightUpdates";
    Pool_OrderBy["WrappedIndex"] = "wrappedIndex";
})(Pool_OrderBy$1 || (Pool_OrderBy$1 = {}));
var PriceRateProvider_OrderBy;
(function (PriceRateProvider_OrderBy) {
    PriceRateProvider_OrderBy["Address"] = "address";
    PriceRateProvider_OrderBy["CacheDuration"] = "cacheDuration";
    PriceRateProvider_OrderBy["CacheExpiry"] = "cacheExpiry";
    PriceRateProvider_OrderBy["Id"] = "id";
    PriceRateProvider_OrderBy["LastCached"] = "lastCached";
    PriceRateProvider_OrderBy["PoolId"] = "poolId";
    PriceRateProvider_OrderBy["Rate"] = "rate";
    PriceRateProvider_OrderBy["Token"] = "token";
})(PriceRateProvider_OrderBy || (PriceRateProvider_OrderBy = {}));
var Swap_OrderBy;
(function (Swap_OrderBy) {
    Swap_OrderBy["Caller"] = "caller";
    Swap_OrderBy["Id"] = "id";
    Swap_OrderBy["PoolId"] = "poolId";
    Swap_OrderBy["Timestamp"] = "timestamp";
    Swap_OrderBy["TokenAmountIn"] = "tokenAmountIn";
    Swap_OrderBy["TokenAmountOut"] = "tokenAmountOut";
    Swap_OrderBy["TokenIn"] = "tokenIn";
    Swap_OrderBy["TokenInSym"] = "tokenInSym";
    Swap_OrderBy["TokenOut"] = "tokenOut";
    Swap_OrderBy["TokenOutSym"] = "tokenOutSym";
    Swap_OrderBy["Tx"] = "tx";
    Swap_OrderBy["UserAddress"] = "userAddress";
    Swap_OrderBy["ValueUsd"] = "valueUSD";
})(Swap_OrderBy || (Swap_OrderBy = {}));
var TokenPrice_OrderBy;
(function (TokenPrice_OrderBy) {
    TokenPrice_OrderBy["Amount"] = "amount";
    TokenPrice_OrderBy["Asset"] = "asset";
    TokenPrice_OrderBy["Block"] = "block";
    TokenPrice_OrderBy["Id"] = "id";
    TokenPrice_OrderBy["PoolId"] = "poolId";
    TokenPrice_OrderBy["Price"] = "price";
    TokenPrice_OrderBy["PricingAsset"] = "pricingAsset";
    TokenPrice_OrderBy["Timestamp"] = "timestamp";
})(TokenPrice_OrderBy || (TokenPrice_OrderBy = {}));
var TokenSnapshot_OrderBy;
(function (TokenSnapshot_OrderBy) {
    TokenSnapshot_OrderBy["Id"] = "id";
    TokenSnapshot_OrderBy["Timestamp"] = "timestamp";
    TokenSnapshot_OrderBy["Token"] = "token";
    TokenSnapshot_OrderBy["TotalBalanceNotional"] = "totalBalanceNotional";
    TokenSnapshot_OrderBy["TotalBalanceUsd"] = "totalBalanceUSD";
    TokenSnapshot_OrderBy["TotalSwapCount"] = "totalSwapCount";
    TokenSnapshot_OrderBy["TotalVolumeNotional"] = "totalVolumeNotional";
    TokenSnapshot_OrderBy["TotalVolumeUsd"] = "totalVolumeUSD";
})(TokenSnapshot_OrderBy || (TokenSnapshot_OrderBy = {}));
var Token_OrderBy;
(function (Token_OrderBy) {
    Token_OrderBy["Address"] = "address";
    Token_OrderBy["Decimals"] = "decimals";
    Token_OrderBy["Id"] = "id";
    Token_OrderBy["LatestPrice"] = "latestPrice";
    Token_OrderBy["LatestUsdPrice"] = "latestUSDPrice";
    Token_OrderBy["Name"] = "name";
    Token_OrderBy["Pool"] = "pool";
    Token_OrderBy["Symbol"] = "symbol";
    Token_OrderBy["TotalBalanceNotional"] = "totalBalanceNotional";
    Token_OrderBy["TotalBalanceUsd"] = "totalBalanceUSD";
    Token_OrderBy["TotalSwapCount"] = "totalSwapCount";
    Token_OrderBy["TotalVolumeNotional"] = "totalVolumeNotional";
    Token_OrderBy["TotalVolumeUsd"] = "totalVolumeUSD";
})(Token_OrderBy || (Token_OrderBy = {}));
var TradePairSnapshot_OrderBy;
(function (TradePairSnapshot_OrderBy) {
    TradePairSnapshot_OrderBy["Id"] = "id";
    TradePairSnapshot_OrderBy["Pair"] = "pair";
    TradePairSnapshot_OrderBy["Timestamp"] = "timestamp";
    TradePairSnapshot_OrderBy["TotalSwapFee"] = "totalSwapFee";
    TradePairSnapshot_OrderBy["TotalSwapVolume"] = "totalSwapVolume";
})(TradePairSnapshot_OrderBy || (TradePairSnapshot_OrderBy = {}));
var TradePair_OrderBy;
(function (TradePair_OrderBy) {
    TradePair_OrderBy["Id"] = "id";
    TradePair_OrderBy["Token0"] = "token0";
    TradePair_OrderBy["Token1"] = "token1";
    TradePair_OrderBy["TotalSwapFee"] = "totalSwapFee";
    TradePair_OrderBy["TotalSwapVolume"] = "totalSwapVolume";
})(TradePair_OrderBy || (TradePair_OrderBy = {}));
var UserInternalBalance_OrderBy;
(function (UserInternalBalance_OrderBy) {
    UserInternalBalance_OrderBy["Balance"] = "balance";
    UserInternalBalance_OrderBy["Id"] = "id";
    UserInternalBalance_OrderBy["Token"] = "token";
    UserInternalBalance_OrderBy["UserAddress"] = "userAddress";
})(UserInternalBalance_OrderBy || (UserInternalBalance_OrderBy = {}));
var User_OrderBy$1;
(function (User_OrderBy) {
    User_OrderBy["Id"] = "id";
    User_OrderBy["SharesOwned"] = "sharesOwned";
    User_OrderBy["Swaps"] = "swaps";
    User_OrderBy["UserInternalBalances"] = "userInternalBalances";
})(User_OrderBy$1 || (User_OrderBy$1 = {}));
var _SubgraphErrorPolicy_$1;
(function (_SubgraphErrorPolicy_) {
    /** Data will be returned even if the subgraph has indexing errors */
    _SubgraphErrorPolicy_["Allow"] = "allow";
    /** If the subgraph has indexing errors, data will be omitted. The default. */
    _SubgraphErrorPolicy_["Deny"] = "deny";
})(_SubgraphErrorPolicy_$1 || (_SubgraphErrorPolicy_$1 = {}));
const SubgraphPoolTokenFragmentDoc = gql$1 `
    fragment SubgraphPoolToken on PoolToken {
  id
  symbol
  name
  decimals
  address
  balance
  managedBalance
  weight
  priceRate
}
    `;
const SubgraphPoolFragmentDoc = gql$1 `
    fragment SubgraphPool on Pool {
  id
  address
  poolType
  symbol
  name
  swapFee
  totalWeight
  totalSwapVolume
  totalSwapFee
  totalLiquidity
  totalShares
  tokens(first: 100) {
    ...SubgraphPoolToken
  }
  swapsCount
  holdersCount
  tokensList
  totalWeight
  amp
  expiryTime
  unitSeconds
  createTime
  principalToken
  baseToken
  swapEnabled
  wrappedIndex
  mainIndex
  lowerTarget
  upperTarget
  sqrtAlpha
  sqrtBeta
  root3Alpha
}
    ${SubgraphPoolTokenFragmentDoc}`;
const SubgraphPoolWithoutLinearFragmentDoc = gql$1 `
    fragment SubgraphPoolWithoutLinear on Pool {
  id
  address
  poolType
  symbol
  name
  swapFee
  totalWeight
  totalSwapVolume
  totalSwapFee
  totalLiquidity
  totalShares
  tokens(first: 1000) {
    ...SubgraphPoolToken
  }
  swapsCount
  holdersCount
  tokensList
  totalWeight
  amp
  expiryTime
  unitSeconds
  principalToken
  baseToken
  swapEnabled
}
    ${SubgraphPoolTokenFragmentDoc}`;
const SubgraphPoolSnapshotFragmentDoc = gql$1 `
    fragment SubgraphPoolSnapshot on PoolSnapshot {
  id
  pool {
    id
  }
  totalShares
  swapVolume
  swapFees
  timestamp
}
    `;
const SubgraphJoinExitFragmentDoc = gql$1 `
    fragment SubgraphJoinExit on JoinExit {
  amounts
  id
  sender
  timestamp
  tx
  type
  user {
    id
  }
  pool {
    id
    tokensList
  }
}
    `;
const SubgraphBalancerFragmentDoc = gql$1 `
    fragment SubgraphBalancer on Balancer {
  id
  totalLiquidity
  totalSwapVolume
  totalSwapFee
  totalSwapCount
  poolCount
}
    `;
const SubgraphTokenPriceFragmentDoc = gql$1 `
    fragment SubgraphTokenPrice on TokenPrice {
  id
  poolId {
    id
  }
  asset
  amount
  pricingAsset
  price
  block
  timestamp
}
    `;
const SubgraphTokenLatestPriceFragmentDoc = gql$1 `
    fragment SubgraphTokenLatestPrice on LatestPrice {
  id
  asset
  price
  poolId {
    id
  }
  pricingAsset
}
    `;
const SubgraphUserFragmentDoc = gql$1 `
    fragment SubgraphUser on User {
  id
  sharesOwned(first: 1000) {
    balance
    poolId {
      id
    }
  }
}
    `;
const PoolsDocument$1 = gql$1 `
    query Pools($skip: Int, $first: Int, $orderBy: Pool_orderBy, $orderDirection: OrderDirection, $where: Pool_filter, $block: Block_height) {
  pool0: pools(
    first: 1000
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphPool
  }
  pool1000: pools(
    skip: 1000
    first: 1000
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphPool
  }
}
    ${SubgraphPoolFragmentDoc}`;
const PoolDocument = gql$1 `
    query Pool($id: ID!, $block: Block_height) {
  pool(id: $id, block: $block) {
    ...SubgraphPool
  }
}
    ${SubgraphPoolFragmentDoc}`;
const PoolsWithoutLinearDocument = gql$1 `
    query PoolsWithoutLinear($skip: Int, $first: Int, $orderBy: Pool_orderBy, $orderDirection: OrderDirection, $where: Pool_filter, $block: Block_height) {
  pools(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphPoolWithoutLinear
  }
}
    ${SubgraphPoolWithoutLinearFragmentDoc}`;
const PoolWithoutLinearDocument = gql$1 `
    query PoolWithoutLinear($id: ID!, $block: Block_height) {
  pool(id: $id, block: $block) {
    ...SubgraphPoolWithoutLinear
  }
}
    ${SubgraphPoolWithoutLinearFragmentDoc}`;
const PoolHistoricalLiquiditiesDocument = gql$1 `
    query PoolHistoricalLiquidities($skip: Int, $first: Int, $orderBy: PoolHistoricalLiquidity_orderBy, $orderDirection: OrderDirection, $where: PoolHistoricalLiquidity_filter, $block: Block_height) {
  poolHistoricalLiquidities(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    id
    poolId {
      id
    }
    poolTotalShares
    poolLiquidity
    poolShareValue
    pricingAsset
    block
  }
}
    `;
const PoolSnapshotsDocument = gql$1 `
    query PoolSnapshots($skip: Int, $first: Int, $orderBy: PoolSnapshot_orderBy, $orderDirection: OrderDirection, $where: PoolSnapshot_filter, $block: Block_height) {
  poolSnapshots(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphPoolSnapshot
  }
}
    ${SubgraphPoolSnapshotFragmentDoc}`;
const JoinExitsDocument = gql$1 `
    query JoinExits($skip: Int, $first: Int, $orderBy: JoinExit_orderBy, $orderDirection: OrderDirection, $where: JoinExit_filter, $block: Block_height) {
  joinExits(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphJoinExit
  }
}
    ${SubgraphJoinExitFragmentDoc}`;
const BalancersDocument = gql$1 `
    query Balancers($skip: Int, $first: Int, $orderBy: Balancer_orderBy, $orderDirection: OrderDirection, $where: Balancer_filter, $block: Block_height) {
  balancers(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphBalancer
  }
}
    ${SubgraphBalancerFragmentDoc}`;
const TokenPricesDocument = gql$1 `
    query TokenPrices($skip: Int, $first: Int, $orderBy: TokenPrice_orderBy, $orderDirection: OrderDirection, $where: TokenPrice_filter, $block: Block_height) {
  tokenPrices(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphTokenPrice
  }
}
    ${SubgraphTokenPriceFragmentDoc}`;
const TokenLatestPricesDocument = gql$1 `
    query TokenLatestPrices($skip: Int, $first: Int, $orderBy: LatestPrice_orderBy, $orderDirection: OrderDirection, $where: LatestPrice_filter, $block: Block_height) {
  latestPrices(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphTokenLatestPrice
  }
}
    ${SubgraphTokenLatestPriceFragmentDoc}`;
const TokenLatestPriceDocument = gql$1 `
    query TokenLatestPrice($id: ID!) {
  latestPrice(id: $id) {
    ...SubgraphTokenLatestPrice
  }
}
    ${SubgraphTokenLatestPriceFragmentDoc}`;
const UserDocument = gql$1 `
    query User($id: ID!, $block: Block_height) {
  user(id: $id, block: $block) {
    ...SubgraphUser
  }
}
    ${SubgraphUserFragmentDoc}`;
const UsersDocument = gql$1 `
    query Users($skip: Int, $first: Int, $orderBy: User_orderBy, $orderDirection: OrderDirection, $where: User_filter, $block: Block_height) {
  users(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphUser
  }
}
    ${SubgraphUserFragmentDoc}`;
const defaultWrapper$1 = (action, _operationName, _operationType) => action();
function getSdk$1(client, withWrapper = defaultWrapper$1) {
    return {
        Pools(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolsDocument$1, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Pools', 'query');
        },
        Pool(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Pool', 'query');
        },
        PoolsWithoutLinear(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolsWithoutLinearDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'PoolsWithoutLinear', 'query');
        },
        PoolWithoutLinear(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolWithoutLinearDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'PoolWithoutLinear', 'query');
        },
        PoolHistoricalLiquidities(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolHistoricalLiquiditiesDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'PoolHistoricalLiquidities', 'query');
        },
        PoolSnapshots(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolSnapshotsDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'PoolSnapshots', 'query');
        },
        JoinExits(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(JoinExitsDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'JoinExits', 'query');
        },
        Balancers(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(BalancersDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Balancers', 'query');
        },
        TokenPrices(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(TokenPricesDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'TokenPrices', 'query');
        },
        TokenLatestPrices(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(TokenLatestPricesDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'TokenLatestPrices', 'query');
        },
        TokenLatestPrice(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(TokenLatestPriceDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'TokenLatestPrice', 'query');
        },
        User(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(UserDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'User', 'query');
        },
        Users(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(UsersDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Users', 'query');
        }
    };
}

var Chain;
(function (Chain) {
    Chain["Arbitrum"] = "Arbitrum";
    Chain["Optimism"] = "Optimism";
    Chain["Polygon"] = "Polygon";
})(Chain || (Chain = {}));
var GaugeFactory_OrderBy;
(function (GaugeFactory_OrderBy) {
    GaugeFactory_OrderBy["Gauges"] = "gauges";
    GaugeFactory_OrderBy["Id"] = "id";
    GaugeFactory_OrderBy["NumGauges"] = "numGauges";
})(GaugeFactory_OrderBy || (GaugeFactory_OrderBy = {}));
var GaugeShare_OrderBy;
(function (GaugeShare_OrderBy) {
    GaugeShare_OrderBy["Balance"] = "balance";
    GaugeShare_OrderBy["Gauge"] = "gauge";
    GaugeShare_OrderBy["Id"] = "id";
    GaugeShare_OrderBy["User"] = "user";
})(GaugeShare_OrderBy || (GaugeShare_OrderBy = {}));
var GaugeType_OrderBy;
(function (GaugeType_OrderBy) {
    GaugeType_OrderBy["Id"] = "id";
    GaugeType_OrderBy["Name"] = "name";
})(GaugeType_OrderBy || (GaugeType_OrderBy = {}));
var GaugeVote_OrderBy;
(function (GaugeVote_OrderBy) {
    GaugeVote_OrderBy["Gauge"] = "gauge";
    GaugeVote_OrderBy["Id"] = "id";
    GaugeVote_OrderBy["Timestamp"] = "timestamp";
    GaugeVote_OrderBy["User"] = "user";
    GaugeVote_OrderBy["Weight"] = "weight";
})(GaugeVote_OrderBy || (GaugeVote_OrderBy = {}));
var Gauge_OrderBy;
(function (Gauge_OrderBy) {
    Gauge_OrderBy["AddedTimestamp"] = "addedTimestamp";
    Gauge_OrderBy["Address"] = "address";
    Gauge_OrderBy["Id"] = "id";
    Gauge_OrderBy["LiquidityGauge"] = "liquidityGauge";
    Gauge_OrderBy["RootGauge"] = "rootGauge";
    Gauge_OrderBy["Type"] = "type";
})(Gauge_OrderBy || (Gauge_OrderBy = {}));
var LiquidityGauge_OrderBy;
(function (LiquidityGauge_OrderBy) {
    LiquidityGauge_OrderBy["Factory"] = "factory";
    LiquidityGauge_OrderBy["Gauge"] = "gauge";
    LiquidityGauge_OrderBy["Id"] = "id";
    LiquidityGauge_OrderBy["IsKilled"] = "isKilled";
    LiquidityGauge_OrderBy["Pool"] = "pool";
    LiquidityGauge_OrderBy["PoolAddress"] = "poolAddress";
    LiquidityGauge_OrderBy["PoolId"] = "poolId";
    LiquidityGauge_OrderBy["RelativeWeightCap"] = "relativeWeightCap";
    LiquidityGauge_OrderBy["Shares"] = "shares";
    LiquidityGauge_OrderBy["Streamer"] = "streamer";
    LiquidityGauge_OrderBy["Symbol"] = "symbol";
    LiquidityGauge_OrderBy["Tokens"] = "tokens";
    LiquidityGauge_OrderBy["TotalSupply"] = "totalSupply";
})(LiquidityGauge_OrderBy || (LiquidityGauge_OrderBy = {}));
/** Defines the order direction, either ascending or descending */
var OrderDirection;
(function (OrderDirection) {
    OrderDirection["Asc"] = "asc";
    OrderDirection["Desc"] = "desc";
})(OrderDirection || (OrderDirection = {}));
var Pool_OrderBy;
(function (Pool_OrderBy) {
    Pool_OrderBy["Address"] = "address";
    Pool_OrderBy["Gauges"] = "gauges";
    Pool_OrderBy["GaugesList"] = "gaugesList";
    Pool_OrderBy["Id"] = "id";
    Pool_OrderBy["PoolId"] = "poolId";
    Pool_OrderBy["PreferentialGauge"] = "preferentialGauge";
})(Pool_OrderBy || (Pool_OrderBy = {}));
var RewardToken_OrderBy;
(function (RewardToken_OrderBy) {
    RewardToken_OrderBy["Decimals"] = "decimals";
    RewardToken_OrderBy["Gauge"] = "gauge";
    RewardToken_OrderBy["Id"] = "id";
    RewardToken_OrderBy["Symbol"] = "symbol";
    RewardToken_OrderBy["TotalDeposited"] = "totalDeposited";
})(RewardToken_OrderBy || (RewardToken_OrderBy = {}));
var RootGauge_OrderBy;
(function (RootGauge_OrderBy) {
    RootGauge_OrderBy["Chain"] = "chain";
    RootGauge_OrderBy["Factory"] = "factory";
    RootGauge_OrderBy["Gauge"] = "gauge";
    RootGauge_OrderBy["Id"] = "id";
    RootGauge_OrderBy["IsKilled"] = "isKilled";
    RootGauge_OrderBy["Recipient"] = "recipient";
    RootGauge_OrderBy["RelativeWeightCap"] = "relativeWeightCap";
})(RootGauge_OrderBy || (RootGauge_OrderBy = {}));
var User_OrderBy;
(function (User_OrderBy) {
    User_OrderBy["GaugeShares"] = "gaugeShares";
    User_OrderBy["GaugeVotes"] = "gaugeVotes";
    User_OrderBy["Id"] = "id";
    User_OrderBy["VotingLocks"] = "votingLocks";
})(User_OrderBy || (User_OrderBy = {}));
var VotingEscrowLock_OrderBy;
(function (VotingEscrowLock_OrderBy) {
    VotingEscrowLock_OrderBy["Id"] = "id";
    VotingEscrowLock_OrderBy["LockedBalance"] = "lockedBalance";
    VotingEscrowLock_OrderBy["UnlockTime"] = "unlockTime";
    VotingEscrowLock_OrderBy["UpdatedAt"] = "updatedAt";
    VotingEscrowLock_OrderBy["User"] = "user";
    VotingEscrowLock_OrderBy["VotingEscrowId"] = "votingEscrowID";
})(VotingEscrowLock_OrderBy || (VotingEscrowLock_OrderBy = {}));
var VotingEscrow_OrderBy;
(function (VotingEscrow_OrderBy) {
    VotingEscrow_OrderBy["Id"] = "id";
    VotingEscrow_OrderBy["Locks"] = "locks";
    VotingEscrow_OrderBy["StakedSupply"] = "stakedSupply";
})(VotingEscrow_OrderBy || (VotingEscrow_OrderBy = {}));
var _SubgraphErrorPolicy_;
(function (_SubgraphErrorPolicy_) {
    /** Data will be returned even if the subgraph has indexing errors */
    _SubgraphErrorPolicy_["Allow"] = "allow";
    /** If the subgraph has indexing errors, data will be omitted. The default. */
    _SubgraphErrorPolicy_["Deny"] = "deny";
})(_SubgraphErrorPolicy_ || (_SubgraphErrorPolicy_ = {}));
const SubgraphLiquidityGaugeFragmentDoc = gql$1 `
    fragment SubgraphLiquidityGauge on LiquidityGauge {
  id
  symbol
  poolAddress
  poolId
  streamer
  factory {
    id
    numGauges
  }
  totalSupply
  tokens {
    id
    symbol
    decimals
    totalDeposited
  }
}
    `;
const SubgraphPoolWithPreferentialGaugeFragmentDoc = gql$1 `
    fragment SubgraphPoolWithPreferentialGauge on Pool {
  id
  poolId
  preferentialGauge {
    ...SubgraphLiquidityGauge
  }
}
    ${SubgraphLiquidityGaugeFragmentDoc}`;
const LiquidityGaugesDocument = gql$1 `
    query LiquidityGauges($skip: Int, $first: Int, $orderBy: LiquidityGauge_orderBy, $orderDirection: OrderDirection, $where: LiquidityGauge_filter, $block: Block_height) {
  liquidityGauges(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphLiquidityGauge
  }
}
    ${SubgraphLiquidityGaugeFragmentDoc}`;
const PoolsDocument = gql$1 `
    query Pools($skip: Int, $first: Int, $orderBy: Pool_orderBy, $orderDirection: OrderDirection, $where: Pool_filter, $block: Block_height) {
  pools(
    skip: $skip
    first: $first
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
    block: $block
  ) {
    ...SubgraphPoolWithPreferentialGauge
  }
}
    ${SubgraphPoolWithPreferentialGaugeFragmentDoc}`;
const defaultWrapper = (action, _operationName, _operationType) => action();
function getSdk(client, withWrapper = defaultWrapper) {
    return {
        LiquidityGauges(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(LiquidityGaugesDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'LiquidityGauges', 'query');
        },
        Pools(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolsDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Pools', 'query');
        }
    };
}

function createSubgraphClient(subgraphUrl) {
    const client = new GraphQLClient(subgraphUrl);
    return getSdk$1(client);
}
function createGaugesClient(url) {
    const client = new GraphQLClient(url);
    return getSdk(client);
}

const multicallAbi = [
    'function aggregate(tuple[](address target, bytes callData) memory calls) public view returns (uint256 blockNumber, bytes[] memory returnData)',
];
const Multicall = (address, provider) => new Contract(address, multicallAbi, provider);

class Multicaller {
    constructor(multiAddress, provider, abi, options = {}) {
        this.options = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.calls = [];
        this.paths = [];
        this.multiAddress = multiAddress;
        this.provider = provider;
        this.interface = new Interface(abi);
        this.options = options;
    }
    call(path, address, functionName, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params) {
        this.calls.push([address, functionName, params]);
        this.paths.push(path);
        return this;
    }
    async execute(from = {}) {
        const obj = from;
        const results = await this.executeMulticall();
        results.forEach((result, i) => set(obj, this.paths[i], result.length > 1 ? result : result[0]));
        this.calls = [];
        this.paths = [];
        return obj;
    }
    async executeMulticall() {
        const multi = Multicall(this.multiAddress, this.provider);
        const [, res] = await multi.aggregate(this.calls.map(([address, functionName, params]) => [
            address,
            this.interface.encodeFunctionData(functionName, params),
        ]), this.options);
        return res.map((result, i) => this.interface.decodeFunctionResult(this.calls[i][1], result));
    }
}

var weightedPoolAbi = [
	{
		inputs: [
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "string",
				name: "name",
				type: "string"
			},
			{
				internalType: "string",
				name: "symbol",
				type: "string"
			},
			{
				internalType: "contract IERC20[]",
				name: "tokens",
				type: "address[]"
			},
			{
				internalType: "uint256[]",
				name: "normalizedWeights",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "pauseWindowDuration",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodDuration",
				type: "uint256"
			},
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "PausedStateChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "SwapFeePercentageChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	},
	{
		inputs: [
		],
		name: "DOMAIN_SEPARATOR",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "pure",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "decreaseApproval",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes4",
				name: "selector",
				type: "bytes4"
			}
		],
		name: "getActionId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAuthorizer",
		outputs: [
			{
				internalType: "contract IAuthorizer",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getInvariant",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getLastInvariant",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getNormalizedWeights",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getOwner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPausedState",
		outputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "pauseWindowEndTime",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodEndTime",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPoolId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getSwapFeePercentage",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "increaseApproval",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onExitPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onJoinPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "request",
				type: "tuple"
			},
			{
				internalType: "uint256",
				name: "balanceTokenIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "balanceTokenOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "permit",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryExit",
		outputs: [
			{
				internalType: "uint256",
				name: "bptIn",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsOut",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryJoin",
		outputs: [
			{
				internalType: "uint256",
				name: "bptOut",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsIn",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "setPaused",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "setSwapFeePercentage",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	}
];

var stablePoolAbi = [
	{
		inputs: [
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "string",
				name: "name",
				type: "string"
			},
			{
				internalType: "string",
				name: "symbol",
				type: "string"
			},
			{
				internalType: "contract IERC20[]",
				name: "tokens",
				type: "address[]"
			},
			{
				internalType: "uint256",
				name: "amplificationParameter",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "pauseWindowDuration",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodDuration",
				type: "uint256"
			},
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "startValue",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "endValue",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "startTime",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "endTime",
				type: "uint256"
			}
		],
		name: "AmpUpdateStarted",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "currentValue",
				type: "uint256"
			}
		],
		name: "AmpUpdateStopped",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "PausedStateChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "SwapFeePercentageChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	},
	{
		inputs: [
		],
		name: "DOMAIN_SEPARATOR",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "decreaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes4",
				name: "selector",
				type: "bytes4"
			}
		],
		name: "getActionId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAmplificationParameter",
		outputs: [
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "isUpdating",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "precision",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAuthorizer",
		outputs: [
			{
				internalType: "contract IAuthorizer",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getOwner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPausedState",
		outputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "pauseWindowEndTime",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodEndTime",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPoolId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getSwapFeePercentage",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "addedValue",
				type: "uint256"
			}
		],
		name: "increaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onExitPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onJoinPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "swapRequest",
				type: "tuple"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "indexIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "indexOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "request",
				type: "tuple"
			},
			{
				internalType: "uint256",
				name: "balanceTokenIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "balanceTokenOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "permit",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryExit",
		outputs: [
			{
				internalType: "uint256",
				name: "bptIn",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsOut",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryJoin",
		outputs: [
			{
				internalType: "uint256",
				name: "bptOut",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsIn",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "bytes",
				name: "poolConfig",
				type: "bytes"
			}
		],
		name: "setAssetManagerPoolConfig",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "setPaused",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "setSwapFeePercentage",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "rawEndValue",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "endTime",
				type: "uint256"
			}
		],
		name: "startAmplificationParameterUpdate",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "stopAmplificationParameterUpdate",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	}
];

var elementPoolAbi = [
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "_underlying",
				type: "address"
			},
			{
				internalType: "contract IERC20",
				name: "_bond",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "_expiration",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "_unitSeconds",
				type: "uint256"
			},
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "_percentFee",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "_percentFeeGov",
				type: "uint256"
			},
			{
				internalType: "address",
				name: "_governance",
				type: "address"
			},
			{
				internalType: "string",
				name: "name",
				type: "string"
			},
			{
				internalType: "string",
				name: "symbol",
				type: "string"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "collectedBase",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "collectedBond",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "remainingBase",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "remainingBond",
				type: "uint256"
			}
		],
		name: "FeeCollection",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	},
	{
		inputs: [
		],
		name: "DOMAIN_SEPARATOR",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "FEE_BOUND",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "bond",
		outputs: [
			{
				internalType: "contract IERC20",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "bondDecimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "pure",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "decreaseApproval",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "expiration",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "feesBond",
		outputs: [
			{
				internalType: "uint128",
				name: "",
				type: "uint128"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "feesUnderlying",
		outputs: [
			{
				internalType: "uint128",
				name: "",
				type: "uint128"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPoolId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "governance",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "increaseApproval",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "currentBalances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFee",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onExitPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "amountsOut",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "dueProtocolFeeAmounts",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "currentBalances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFee",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onJoinPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "amountsIn",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "dueProtocolFeeAmounts",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "swapRequest",
				type: "tuple"
			},
			{
				internalType: "uint256",
				name: "currentBalanceTokenIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "currentBalanceTokenOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "percentFee",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "percentFeeGov",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "permit",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "amountX",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "reserveX",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "reserveY",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "out",
				type: "bool"
			}
		],
		name: "solveTradeInvariant",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "underlying",
		outputs: [
			{
				internalType: "contract IERC20",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "underlyingDecimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "unitSeconds",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	}
];

var linearPoolAbi = [
	{
		inputs: [
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "string",
				name: "name",
				type: "string"
			},
			{
				internalType: "string",
				name: "symbol",
				type: "string"
			},
			{
				internalType: "contract IERC20",
				name: "mainToken",
				type: "address"
			},
			{
				internalType: "contract IERC20",
				name: "wrappedToken",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "upperTarget",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "pauseWindowDuration",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodDuration",
				type: "uint256"
			},
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "PausedStateChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "SwapFeePercentageChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "lowerTarget",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "upperTarget",
				type: "uint256"
			}
		],
		name: "TargetsSet",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	},
	{
		inputs: [
		],
		name: "DOMAIN_SEPARATOR",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "decreaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes4",
				name: "selector",
				type: "bytes4"
			}
		],
		name: "getActionId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAuthorizer",
		outputs: [
			{
				internalType: "contract IAuthorizer",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getBptIndex",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getMainIndex",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getMainToken",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getOwner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPausedState",
		outputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "pauseWindowEndTime",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodEndTime",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPoolId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getScalingFactors",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getSwapFeePercentage",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getTargets",
		outputs: [
			{
				internalType: "uint256",
				name: "lowerTarget",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "upperTarget",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVirtualSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getWrappedIndex",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getWrappedToken",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getWrappedTokenRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "addedValue",
				type: "uint256"
			}
		],
		name: "increaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "initialize",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onExitPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onJoinPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "request",
				type: "tuple"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "indexIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "indexOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "permit",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryExit",
		outputs: [
			{
				internalType: "uint256",
				name: "bptIn",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsOut",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryJoin",
		outputs: [
			{
				internalType: "uint256",
				name: "bptOut",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsIn",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "bytes",
				name: "poolConfig",
				type: "bytes"
			}
		],
		name: "setAssetManagerPoolConfig",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "setPaused",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "setSwapFeePercentage",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "newLowerTarget",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "newUpperTarget",
				type: "uint256"
			}
		],
		name: "setTargets",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	}
];

var composableStableAbi = [
	{
		inputs: [
			{
				components: [
					{
						internalType: "contract IVault",
						name: "vault",
						type: "address"
					},
					{
						internalType: "contract IProtocolFeePercentagesProvider",
						name: "protocolFeeProvider",
						type: "address"
					},
					{
						internalType: "string",
						name: "name",
						type: "string"
					},
					{
						internalType: "string",
						name: "symbol",
						type: "string"
					},
					{
						internalType: "contract IERC20[]",
						name: "tokens",
						type: "address[]"
					},
					{
						internalType: "contract IRateProvider[]",
						name: "rateProviders",
						type: "address[]"
					},
					{
						internalType: "uint256[]",
						name: "tokenRateCacheDurations",
						type: "uint256[]"
					},
					{
						internalType: "bool[]",
						name: "exemptFromYieldProtocolFeeFlags",
						type: "bool[]"
					},
					{
						internalType: "uint256",
						name: "amplificationParameter",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "swapFeePercentage",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "pauseWindowDuration",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "bufferPeriodDuration",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "owner",
						type: "address"
					}
				],
				internalType: "struct ComposableStablePool.NewPoolParams",
				name: "params",
				type: "tuple"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "startValue",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "endValue",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "startTime",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "endTime",
				type: "uint256"
			}
		],
		name: "AmpUpdateStarted",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "currentValue",
				type: "uint256"
			}
		],
		name: "AmpUpdateStopped",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "bool",
				name: "paused",
				type: "bool"
			}
		],
		name: "PausedStateChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "uint256",
				name: "feeType",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "protocolFeePercentage",
				type: "uint256"
			}
		],
		name: "ProtocolFeePercentageCacheUpdated",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "bool",
				name: "enabled",
				type: "bool"
			}
		],
		name: "RecoveryModeStateChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "SwapFeePercentageChanged",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "uint256",
				name: "tokenIndex",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "rate",
				type: "uint256"
			}
		],
		name: "TokenRateCacheUpdated",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "uint256",
				name: "tokenIndex",
				type: "uint256"
			},
			{
				indexed: true,
				internalType: "contract IRateProvider",
				name: "provider",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "cacheDuration",
				type: "uint256"
			}
		],
		name: "TokenRateProviderSet",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				internalType: "address",
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	},
	{
		inputs: [
		],
		name: "DELEGATE_PROTOCOL_SWAP_FEES_SENTINEL",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "DOMAIN_SEPARATOR",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				internalType: "uint8",
				name: "",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "decreaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "disableRecoveryMode",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "enableRecoveryMode",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes4",
				name: "selector",
				type: "bytes4"
			}
		],
		name: "getActionId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getActualSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAmplificationParameter",
		outputs: [
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "isUpdating",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "precision",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getAuthorizer",
		outputs: [
			{
				internalType: "contract IAuthorizer",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getBptIndex",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getDomainSeparator",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getLastJoinExitData",
		outputs: [
			{
				internalType: "uint256",
				name: "lastJoinExitAmplification",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "lastPostJoinExitInvariant",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getMinimumBpt",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "pure",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address"
			}
		],
		name: "getNextNonce",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getOwner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPausedState",
		outputs: [
			{
				internalType: "bool",
				name: "paused",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "pauseWindowEndTime",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "bufferPeriodEndTime",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getPoolId",
		outputs: [
			{
				internalType: "bytes32",
				name: "",
				type: "bytes32"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "feeType",
				type: "uint256"
			}
		],
		name: "getProtocolFeePercentageCache",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getProtocolFeesCollector",
		outputs: [
			{
				internalType: "contract IProtocolFeesCollector",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getProtocolSwapFeeDelegation",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getRateProviders",
		outputs: [
			{
				internalType: "contract IRateProvider[]",
				name: "",
				type: "address[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getScalingFactors",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getSwapFeePercentage",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			}
		],
		name: "getTokenRate",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			}
		],
		name: "getTokenRateCache",
		outputs: [
			{
				internalType: "uint256",
				name: "rate",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "oldRate",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "duration",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "expires",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "inRecoveryMode",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "addedValue",
				type: "uint256"
			}
		],
		name: "increaseAllowance",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			}
		],
		name: "isTokenExemptFromYieldProtocolFee",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			}
		],
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onExitPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "onJoinPool",
		outputs: [
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			},
			{
				internalType: "uint256[]",
				name: "",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IERC20",
						name: "tokenIn",
						type: "address"
					},
					{
						internalType: "contract IERC20",
						name: "tokenOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "lastChangeBlock",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "from",
						type: "address"
					},
					{
						internalType: "address",
						name: "to",
						type: "address"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IPoolSwapStructs.SwapRequest",
				name: "swapRequest",
				type: "tuple"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "indexIn",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "indexOut",
				type: "uint256"
			}
		],
		name: "onSwap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "pause",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "address",
				name: "spender",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "permit",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryExit",
		outputs: [
			{
				internalType: "uint256",
				name: "bptIn",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsOut",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256[]",
				name: "balances",
				type: "uint256[]"
			},
			{
				internalType: "uint256",
				name: "lastChangeBlock",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "protocolSwapFeePercentage",
				type: "uint256"
			},
			{
				internalType: "bytes",
				name: "userData",
				type: "bytes"
			}
		],
		name: "queryJoin",
		outputs: [
			{
				internalType: "uint256",
				name: "bptOut",
				type: "uint256"
			},
			{
				internalType: "uint256[]",
				name: "amountsIn",
				type: "uint256[]"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "bytes",
				name: "poolConfig",
				type: "bytes"
			}
		],
		name: "setAssetManagerPoolConfig",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "swapFeePercentage",
				type: "uint256"
			}
		],
		name: "setSwapFeePercentage",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "duration",
				type: "uint256"
			}
		],
		name: "setTokenRateCacheDuration",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "rawEndValue",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "endTime",
				type: "uint256"
			}
		],
		name: "startAmplificationParameterUpdate",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "stopAmplificationParameterUpdate",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool"
			}
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "unpause",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "updateProtocolFeePercentageCache",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			}
		],
		name: "updateTokenRateCache",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	}
];

async function getOnChainBalances(subgraphPoolsOriginal, multiAddress, vaultAddress, provider) {
    if (subgraphPoolsOriginal.length === 0)
        return subgraphPoolsOriginal;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const abis = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries([
        ...Vault__factory.abi,
        ...aTokenRateProvider,
        ...weightedPoolAbi,
        ...stablePoolAbi,
        ...elementPoolAbi,
        ...linearPoolAbi,
        ...composableStableAbi,
    ].map((row) => [row.name, row])));
    const multiPool = new Multicaller(multiAddress, provider, abis);
    const supportedPoolTypes = Object.values(PoolFilter);
    const subgraphPools = [];
    subgraphPoolsOriginal.forEach((pool) => {
        if (!supportedPoolTypes.includes(pool.poolType)) {
            console.error(`Unknown pool type: ${pool.poolType} ${pool.id}`);
            return;
        }
        subgraphPools.push(pool);
        multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [
            pool.id,
        ]);
        multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');
        // Pools with pre minted BPT
        if (pool.poolType.includes('Linear') || pool.poolType === 'StablePhantom') {
            multiPool.call(`${pool.id}.virtualSupply`, pool.address, 'getVirtualSupply');
        }
        /**
         * Returns the effective BPT supply.
         * In other pools, this would be the same as `totalSupply`, but there are two key differences here:
         *  - this pool pre-mints BPT and holds it in the Vault as a token, and as such we need to subtract the Vault's
         *    balance to get the total "circulating supply". This is called the 'virtualSupply'.
         *  - the Pool owes debt to the Protocol in the form of unminted BPT, which will be minted immediately before the
         *    next join or exit. We need to take these into account since, even if they don't yet exist, they will
         *    effectively be included in any Pool operation that involves BPT.
         * In the vast majority of cases, this function should be used instead of `totalSupply()`.
         */
        if (pool.poolType === 'ComposableStable')
            multiPool.call(`${pool.id}.actualSupply`, pool.address, 'getActualSupply');
        // TO DO - Make this part of class to make more flexible?
        if (pool.poolType === 'Weighted' ||
            pool.poolType === 'LiquidityBootstrapping' ||
            pool.poolType === 'Investment') {
            multiPool.call(`${pool.id}.weights`, pool.address, 'getNormalizedWeights');
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
        }
        else if (pool.poolType === 'Stable' ||
            pool.poolType === 'MetaStable' ||
            pool.poolType === 'StablePhantom' ||
            pool.poolType === 'ComposableStable') {
            // MetaStable & StablePhantom is the same as Stable for multicall purposes
            multiPool.call(`${pool.id}.amp`, pool.address, 'getAmplificationParameter');
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
        }
        else if (pool.poolType === 'Element') {
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'percentFee');
        }
        else if (pool.poolType.toString().includes('Linear')) {
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
            multiPool.call(`${pool.id}.targets`, pool.address, 'getTargets');
            multiPool.call(`${pool.id}.rate`, pool.address, 'getWrappedTokenRate');
        }
        else if (pool.poolType.toString().includes('Gyro')) {
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
        }
    });
    let pools = {};
    try {
        pools = (await multiPool.execute());
    }
    catch (err) {
        throw `Issue with multicall execution.`;
    }
    const onChainPools = [];
    Object.entries(pools).forEach(([poolId, onchainData], index) => {
        try {
            const { poolTokens, swapFee, weights, totalSupply, virtualSupply, actualSupply, } = onchainData;
            if (subgraphPools[index].poolType === 'Stable' ||
                subgraphPools[index].poolType === 'MetaStable' ||
                subgraphPools[index].poolType === 'StablePhantom' ||
                subgraphPools[index].poolType === 'ComposableStable') {
                if (!onchainData.amp) {
                    console.error(`Stable Pool Missing Amp: ${poolId}`);
                    return;
                }
                else {
                    // Need to scale amp by precision to match expected Subgraph scale
                    // amp is stored with 3 decimals of precision
                    subgraphPools[index].amp = formatFixed$1(onchainData.amp[0], 3);
                }
            }
            if (subgraphPools[index].poolType.includes('Linear')) {
                if (!onchainData.targets) {
                    console.error(`Linear Pool Missing Targets: ${poolId}`);
                    return;
                }
                else {
                    subgraphPools[index].lowerTarget = formatFixed$1(onchainData.targets[0], 18);
                    subgraphPools[index].upperTarget = formatFixed$1(onchainData.targets[1], 18);
                }
                const wrappedIndex = subgraphPools[index].wrappedIndex;
                if (wrappedIndex === undefined || onchainData.rate === undefined) {
                    console.error(`Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`);
                    return;
                }
                // Update priceRate of wrappedToken
                subgraphPools[index].tokens[wrappedIndex].priceRate = formatFixed$1(onchainData.rate, 18);
            }
            subgraphPools[index].swapFee = formatFixed$1(swapFee, 18);
            poolTokens.tokens.forEach((token, i) => {
                const T = subgraphPools[index].tokens.find((t) => isSameAddress(t.address, token));
                if (!T)
                    throw `Pool Missing Expected Token: ${poolId} ${token}`;
                T.balance = formatFixed$1(poolTokens.balances[i], T.decimals);
                if (weights) {
                    // Only expected for WeightedPools
                    T.weight = formatFixed$1(weights[i], 18);
                }
            });
            // Pools with pre minted BPT
            if (subgraphPools[index].poolType.includes('Linear') ||
                subgraphPools[index].poolType === 'StablePhantom') {
                if (virtualSupply === undefined) {
                    console.error(`Pool with pre-minted BPT missing Virtual Supply: ${poolId}`);
                    return;
                }
                subgraphPools[index].totalShares = formatFixed$1(virtualSupply, 18);
            }
            else if (subgraphPools[index].poolType === 'ComposableStable') {
                if (actualSupply === undefined) {
                    console.error(`ComposableStable missing Actual Supply: ${poolId}`);
                    return;
                }
                subgraphPools[index].totalShares = formatFixed$1(actualSupply, 18);
            }
            else {
                subgraphPools[index].totalShares = formatFixed$1(totalSupply, 18);
            }
            onChainPools.push(subgraphPools[index]);
        }
        catch (err) {
            throw `Issue with pool onchain data: ${err}`;
        }
    });
    return onChainPools;
}

const NETWORKS_WITH_LINEAR_POOLS = [
    Network.MAINNET,
    Network.POLYGON,
    Network.ROPSTEN,
    Network.RINKEBY,
    Network.GOERLI,
    Network.KOVAN,
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPools(pools) {
    return pools.map((pool) => ({
        ...pool,
        poolType: pool.poolType || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tokens: (pool.tokens || []).map((token) => ({
            ...token,
            weight: token.weight || null,
        })),
        totalWeight: pool.totalWeight || undefined,
        amp: pool.amp || undefined,
        expiryTime: pool.expiryTime ? parseInt$1(pool.expiryTime) : undefined,
        unitSeconds: pool.unitSeconds ? parseInt$1(pool.unitSeconds) : undefined,
        principalToken: pool.principalToken || undefined,
        baseToken: pool.baseToken || undefined,
    }));
}
class SubgraphPoolDataService {
    constructor(client, provider, network, sorConfig) {
        this.client = client;
        this.provider = provider;
        this.network = network;
        this.sorConfig = sorConfig;
    }
    async getPools() {
        const pools = this.supportsLinearPools
            ? await this.getLinearPools()
            : await this.getNonLinearPools();
        const mapped = mapPools(pools);
        if (this.sorConfig.fetchOnChainBalances === false) {
            return mapped;
        }
        return getOnChainBalances(mapped, this.network.addresses.contracts.multicall, this.network.addresses.contracts.vault, this.provider);
    }
    get supportsLinearPools() {
        return NETWORKS_WITH_LINEAR_POOLS.includes(this.network.chainId);
    }
    async getLinearPools() {
        const { pool0, pool1000 } = await this.client.Pools({
            where: { swapEnabled: true, totalShares_gt: '0' },
            orderBy: Pool_OrderBy$1.TotalLiquidity,
            orderDirection: OrderDirection$1.Desc,
        });
        const pools = [...pool0, ...pool1000];
        return pools;
    }
    async getNonLinearPools() {
        const { pools } = await this.client.PoolsWithoutLinear({
            where: { swapEnabled: true, totalShares_gt: '0' },
            orderBy: Pool_OrderBy$1.TotalLiquidity,
            orderDirection: OrderDirection$1.Desc,
            first: 1000,
        });
        return pools;
    }
}

class CoingeckoTokenPriceService {
    constructor(chainId) {
        this.chainId = chainId;
    }
    async getNativeAssetPriceInToken(tokenAddress) {
        const ethPerToken = await this.getTokenPriceInNativeAsset(tokenAddress);
        // We get the price of token in terms of ETH
        // We want the price of 1 ETH in terms of the token base units
        return `${1 / parseFloat(ethPerToken)}`;
    }
    /**
     * @dev Assumes that the native asset has 18 decimals
     * @param tokenAddress - the address of the token contract
     * @returns the price of 1 ETH in terms of the token base units
     */
    async getTokenPriceInNativeAsset(tokenAddress) {
        const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${this.platformId}?contract_addresses=${tokenAddress}&vs_currencies=${this.nativeAssetId}`;
        const { data } = await axios.get(endpoint, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        if (data[tokenAddress.toLowerCase()][this.nativeAssetId] === undefined) {
            throw Error('No price returned from Coingecko');
        }
        return data[tokenAddress.toLowerCase()][this.nativeAssetId];
    }
    get platformId() {
        switch (this.chainId) {
            case 1:
                return 'ethereum';
            case 42:
                return 'ethereum';
            case 137:
                return 'polygon-pos';
            case 42161:
                return 'arbitrum-one';
        }
        return '2';
    }
    get nativeAssetId() {
        switch (this.chainId) {
            case 1:
                return 'eth';
            case 42:
                return 'eth';
            case 137:
                return '';
            case 42161:
                return 'eth';
        }
        return '';
    }
}

class SubgraphTokenPriceService {
    constructor(client, weth) {
        this.client = client;
        //the subgraph addresses are all toLowerCase
        this.weth = weth.toLowerCase();
    }
    async getNativeAssetPriceInToken(tokenAddress) {
        const ethPerToken = await this.getLatestPriceInEthFromSubgraph(tokenAddress);
        if (!ethPerToken) {
            throw Error('No price found in the subgraph');
        }
        // We want the price of 1 ETH in terms of the token base units
        return `${1 / ethPerToken}`;
    }
    async getLatestPriceInEthFromSubgraph(tokenAddress) {
        tokenAddress = tokenAddress.toLowerCase();
        const { latestPrices } = await this.client.TokenLatestPrices({
            where: { asset_in: [tokenAddress, this.weth] },
        });
        const pricesKeyedOnId = keyBy(latestPrices, 'id');
        //the ids are set as ${asset}-${pricingAsset}
        //first try to find an exact match
        if (pricesKeyedOnId[`${tokenAddress}-${this.weth}`]) {
            return parseFloat(pricesKeyedOnId[`${tokenAddress}-${this.weth}`].price);
        }
        //no exact match, try to traverse the path
        const matchingLatestPrices = latestPrices.filter((price) => price.asset === tokenAddress);
        //pick the first one we match on.
        //There is no timestamp on latestPrice, should get introduced to allow for sorting by latest
        for (const tokenPrice of matchingLatestPrices) {
            const pricingAssetPricedInEth = pricesKeyedOnId[`${tokenPrice.pricingAsset}-${this.weth}`];
            //1 BAL = 20 USDC, 1 USDC = 0.00025 ETH, 1 BAL = 20 * 0.00025
            if (pricingAssetPricedInEth) {
                return (parseFloat(tokenPrice.price) *
                    parseFloat(pricingAssetPricedInEth.price));
            }
        }
        return null;
    }
}

function getNetworkConfig(config) {
    var _a, _b;
    if (typeof config.network === 'number') {
        const networkConfig = BALANCER_NETWORK_CONFIG[config.network];
        return {
            ...networkConfig,
            urls: {
                ...networkConfig.urls,
                subgraph: (_a = config.customSubgraphUrl) !== null && _a !== void 0 ? _a : networkConfig.urls.subgraph,
            },
        };
    }
    return {
        ...config.network,
        urls: {
            ...config.network.urls,
            subgraph: (_b = config.customSubgraphUrl) !== null && _b !== void 0 ? _b : config.network.urls.subgraph,
        },
    };
}

class Sor extends SOR$1 {
    constructor(sdkConfig) {
        const network = getNetworkConfig(sdkConfig);
        const sorConfig = Sor.getSorConfig(sdkConfig);
        const sorNetworkConfig = Sor.getSorNetworkConfig(network);
        const provider = new JsonRpcProvider(sdkConfig.rpcUrl, sdkConfig.network);
        const subgraphClient = createSubgraphClient(network.urls.subgraph);
        const poolDataService = Sor.getPoolDataService(network, sorConfig, provider, subgraphClient);
        const tokenPriceService = Sor.getTokenPriceService(network, sorConfig, subgraphClient);
        super(provider, sorNetworkConfig, poolDataService, tokenPriceService);
    }
    static getSorConfig(config) {
        return {
            tokenPriceService: 'coingecko',
            poolDataService: 'subgraph',
            fetchOnChainBalances: true,
            ...config.sor,
        };
    }
    static getSorNetworkConfig(network) {
        var _a;
        return {
            ...network,
            vault: network.addresses.contracts.vault,
            weth: network.addresses.tokens.wrappedNativeAsset,
            lbpRaisingTokens: (_a = network.addresses.tokens) === null || _a === void 0 ? void 0 : _a.lbpRaisingTokens,
            wETHwstETH: network.pools.wETHwstETH,
        };
    }
    static getPoolDataService(network, sorConfig, provider, subgraphClient) {
        return typeof sorConfig.poolDataService === 'object'
            ? sorConfig.poolDataService
            : new SubgraphPoolDataService(subgraphClient, provider, network, sorConfig);
    }
    static getTokenPriceService(network, sorConfig, subgraphClient) {
        if (typeof sorConfig.tokenPriceService === 'object') {
            return sorConfig.tokenPriceService;
        }
        else if (sorConfig.tokenPriceService === 'subgraph') {
            new SubgraphTokenPriceService(subgraphClient, network.addresses.tokens.wrappedNativeAsset);
        }
        return new CoingeckoTokenPriceService(network.chainId);
    }
}

function checkSimpleFlashSwapParams(params) {
    if (params.poolIds.length > 2) {
        throw new Error('Simple flash swap only supports a maximum of two pools');
    }
    if (params.assets.length > 2) {
        throw new Error('Simple flash swap only supports a maximum of to two assets (tokens)');
    }
}
function createSwaps(poolIds, amount) {
    return [
        {
            poolId: poolIds[0],
            assetInIndex: 0,
            assetOutIndex: 1,
            amount,
            userData: '0x',
        },
        {
            poolId: poolIds[1],
            assetInIndex: 1,
            assetOutIndex: 0,
            amount: '0',
            userData: '0x',
        },
    ];
}
function convertSimpleFlashSwapToBatchSwapParameters({ poolIds, assets, flashLoanAmount, walletAddress, }) {
    checkSimpleFlashSwapParams({ poolIds, assets });
    const swaps = createSwaps(poolIds, flashLoanAmount);
    const funds = {
        sender: walletAddress,
        fromInternalBalance: false,
        recipient: walletAddress,
        toInternalBalance: false,
    };
    const limits = ['0', '0'];
    const deadline = '999999999999999999';
    return {
        kind: SwapType.SwapExactIn,
        swaps,
        assets,
        funds,
        limits,
        deadline,
    };
}
function deltaToExpectedProfit(delta) {
    return Number(delta) * -1;
}
function calcProfit(profits) {
    return sum(profits);
}
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
 * @param {Contract}                    params.vaultContract - the ethersjs contract for the Balancer Vault.
 * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
 * @param {string[]}                    params.poolIds - array of Balancer pool ids
 * @param {string[]}                    params.assets - array of token addresses
 * @returns {Promise<QuerySimpleFlashSwapResponse}>}       Returns an ethersjs transaction response
 */
async function querySimpleFlashSwap(params) {
    checkSimpleFlashSwapParams(params);
    const [tokenAddress0, tokenAddress1] = params.assets;
    try {
        const deltas = await queryBatchSwap(params.vaultContract, SwapType.SwapExactIn, createSwaps(params.poolIds, params.flashLoanAmount), params.assets);
        const profits = {
            [tokenAddress0]: deltaToExpectedProfit(deltas[0]).toString(),
            [tokenAddress1]: deltaToExpectedProfit(deltas[1]).toString(),
        };
        return {
            profits,
            isProfitable: calcProfit([profits[tokenAddress0], profits[tokenAddress1]]) > 0,
        };
    }
    catch (err) {
        throw `Failed to querySimpleFlashSwap: ${err}`;
    }
}

var relayerLibraryAbi = [
	{
		inputs: [
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "contract IERC20",
				name: "wstETH",
				type: "address"
			},
			{
				internalType: "contract IBalancerMinter",
				name: "minter",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approveVault",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "enum IVault.SwapKind",
				name: "kind",
				type: "uint8"
			},
			{
				components: [
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "uint256",
						name: "assetInIndex",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "assetOutIndex",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IVault.BatchSwapStep[]",
				name: "swaps",
				type: "tuple[]"
			},
			{
				internalType: "contract IAsset[]",
				name: "assets",
				type: "address[]"
			},
			{
				components: [
					{
						internalType: "address",
						name: "sender",
						type: "address"
					},
					{
						internalType: "bool",
						name: "fromInternalBalance",
						type: "bool"
					},
					{
						internalType: "address payable",
						name: "recipient",
						type: "address"
					},
					{
						internalType: "bool",
						name: "toInternalBalance",
						type: "bool"
					}
				],
				internalType: "struct IVault.FundManagement",
				name: "funds",
				type: "tuple"
			},
			{
				internalType: "int256[]",
				name: "limits",
				type: "int256[]"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				components: [
					{
						internalType: "uint256",
						name: "index",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "key",
						type: "uint256"
					}
				],
				internalType: "struct VaultActions.OutputReference[]",
				name: "outputReferences",
				type: "tuple[]"
			}
		],
		name: "batchSwap",
		outputs: [
			{
				internalType: "int256[]",
				name: "",
				type: "int256[]"
			}
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "enum VaultActions.PoolKind",
				name: "kind",
				type: "uint8"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address payable",
				name: "recipient",
				type: "address"
			},
			{
				components: [
					{
						internalType: "contract IAsset[]",
						name: "assets",
						type: "address[]"
					},
					{
						internalType: "uint256[]",
						name: "minAmountsOut",
						type: "uint256[]"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					},
					{
						internalType: "bool",
						name: "toInternalBalance",
						type: "bool"
					}
				],
				internalType: "struct IVault.ExitPoolRequest",
				name: "request",
				type: "tuple"
			},
			{
				components: [
					{
						internalType: "uint256",
						name: "index",
						type: "uint256"
					},
					{
						internalType: "uint256",
						name: "key",
						type: "uint256"
					}
				],
				internalType: "struct VaultActions.OutputReference[]",
				name: "outputReferences",
				type: "tuple[]"
			}
		],
		name: "exitPool",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStakingLiquidityGauge[]",
				name: "gauges",
				type: "address[]"
			}
		],
		name: "gaugeClaimRewards",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStakingLiquidityGauge",
				name: "gauge",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "gaugeDeposit",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address[]",
				name: "gauges",
				type: "address[]"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "gaugeMint",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bool",
				name: "approval",
				type: "bool"
			},
			{
				internalType: "address",
				name: "user",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "gaugeSetMinterApproval",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStakingLiquidityGauge",
				name: "gauge",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "gaugeWithdraw",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getEntrypoint",
		outputs: [
			{
				internalType: "contract IBalancerRelayer",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes32",
				name: "poolId",
				type: "bytes32"
			},
			{
				internalType: "enum VaultActions.PoolKind",
				name: "kind",
				type: "uint8"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				components: [
					{
						internalType: "contract IAsset[]",
						name: "assets",
						type: "address[]"
					},
					{
						internalType: "uint256[]",
						name: "maxAmountsIn",
						type: "uint256[]"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					},
					{
						internalType: "bool",
						name: "fromInternalBalance",
						type: "bool"
					}
				],
				internalType: "struct IVault.JoinPoolRequest",
				name: "request",
				type: "tuple"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "joinPool",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "enum IVault.UserBalanceOpKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IAsset",
						name: "asset",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "address",
						name: "sender",
						type: "address"
					},
					{
						internalType: "address payable",
						name: "recipient",
						type: "address"
					}
				],
				internalType: "struct IVault.UserBalanceOp[]",
				name: "ops",
				type: "tuple[]"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			}
		],
		name: "manageUserBalance",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "relayer",
				type: "address"
			},
			{
				internalType: "bool",
				name: "approved",
				type: "bool"
			},
			{
				internalType: "bytes",
				name: "authorisation",
				type: "bytes"
			}
		],
		name: "setRelayerApproval",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "stakeETH",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "stakeETHAndWrap",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: "bytes32",
						name: "poolId",
						type: "bytes32"
					},
					{
						internalType: "enum IVault.SwapKind",
						name: "kind",
						type: "uint8"
					},
					{
						internalType: "contract IAsset",
						name: "assetIn",
						type: "address"
					},
					{
						internalType: "contract IAsset",
						name: "assetOut",
						type: "address"
					},
					{
						internalType: "uint256",
						name: "amount",
						type: "uint256"
					},
					{
						internalType: "bytes",
						name: "userData",
						type: "bytes"
					}
				],
				internalType: "struct IVault.SingleSwap",
				name: "singleSwap",
				type: "tuple"
			},
			{
				components: [
					{
						internalType: "address",
						name: "sender",
						type: "address"
					},
					{
						internalType: "bool",
						name: "fromInternalBalance",
						type: "bool"
					},
					{
						internalType: "address payable",
						name: "recipient",
						type: "address"
					},
					{
						internalType: "bool",
						name: "toInternalBalance",
						type: "bool"
					}
				],
				internalType: "struct IVault.FundManagement",
				name: "funds",
				type: "tuple"
			},
			{
				internalType: "uint256",
				name: "limit",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "swap",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStaticATokenLM",
				name: "staticToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "toUnderlying",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "unwrapAaveStaticToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC4626",
				name: "wrappedToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "unwrapERC4626",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IUnbuttonToken",
				name: "wrapperToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "unwrapUnbuttonToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "unwrapWstETH",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20Permit",
				name: "token",
				type: "address"
			},
			{
				internalType: "address",
				name: "owner",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "value",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "deadline",
				type: "uint256"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "vaultPermit",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC20PermitDAI",
				name: "token",
				type: "address"
			},
			{
				internalType: "address",
				name: "holder",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "nonce",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "expiry",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "allowed",
				type: "bool"
			},
			{
				internalType: "uint8",
				name: "v",
				type: "uint8"
			},
			{
				internalType: "bytes32",
				name: "r",
				type: "bytes32"
			},
			{
				internalType: "bytes32",
				name: "s",
				type: "bytes32"
			}
		],
		name: "vaultPermitDAI",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStaticATokenLM",
				name: "staticToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "fromUnderlying",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "wrapAaveDynamicToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IERC4626",
				name: "wrappedToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "wrapERC4626",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "wrapStETH",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IUnbuttonToken",
				name: "wrapperToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "uAmount",
				type: "uint256"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "wrapUnbuttonToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	}
];

const underlyingToWrappedMap = {
    // stETH => wstETH
    '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    // AMPL => WAMPL
    '0xd46ba6d942050d489dbd938a2c909a5d5039a161': '0xedb171c18ce90b633db442f2a6f72874093b49ef',
    // aAMPL -> ubAAMPL
    '0x1e6bb68acec8fefbd87d192be09bb274170a0548': '0xF03387d8d0FF326ab586A58E0ab4121d106147DF',
};
/**
 * Vault swaps are operating on wrapped tokens. When user is sending an unwrapped token, it's wrapped in a relayer.
 * SOR is returning an array of tokens already wrapped.
 * Converts tokenIn to match tokenIn used in a swap.
 *
 * TODO: add tokenIn and tokenOut addressed used for swap in the SOR results as tokenInForSwap, tokenOutForSwap
 *
 * @param token token address
 * @returns wrapped token address
 */
function tokenForSwaps(token) {
    let wrapped = token;
    // eslint-disable-next-line no-prototype-builtins
    if (underlyingToWrappedMap.hasOwnProperty(token)) {
        wrapped = underlyingToWrappedMap[token];
    }
    return wrapped;
}
var Relayers;
(function (Relayers) {
    Relayers[Relayers["vault"] = 1] = "vault";
    Relayers[Relayers["lido"] = 2] = "lido";
})(Relayers || (Relayers = {}));
/**
 * Resolves a contract address for sending swap transaction to.
 * Balancer is using relayers to automatically wrap / unwrap tokens not compatibile with ERC20.
 */
function relayerResolver(assetIn, assetOut, chainId) {
    const { tokens, contracts } = networkAddresses(chainId);
    let to = {
        id: Relayers.vault,
        address: contracts.vault,
    };
    if (tokens.stETH && contracts.lidoRelayer)
        if ([assetIn, assetOut].includes(tokens.stETH))
            to = {
                id: Relayers.lido,
                address: contracts.lidoRelayer,
            };
    return to;
}
function swapFragment(relayer) {
    let source = Vault__factory.abi;
    if (relayer.id === Relayers.lido)
        source = relayerLibraryAbi;
    const signatures = source.filter((fn) => fn.name && ['swap', 'batchSwap'].includes(fn.name));
    return signatures;
}

/** Applies slippage to a number */
function amountForLimit(amount) {
    return {
        amount,
        max: (maxSlippage) => {
            return amount.mul(1e3 + maxSlippage).div(1e3);
        },
        min: (maxSlippage) => {
            return amount.mul(1e3 - maxSlippage).div(1e3);
        },
    };
}
function decorateSorSwapInfo(swapInfo, swapType) {
    const amountIn = swapType === SwapType.SwapExactIn
        ? swapInfo.swapAmount
        : swapInfo.returnAmount;
    const amountOut = swapType === SwapType.SwapExactIn
        ? swapInfo.returnAmount
        : swapInfo.swapAmount;
    const amountInForLimits = swapType === SwapType.SwapExactIn
        ? swapInfo.swapAmountForSwaps || swapInfo.swapAmount
        : swapInfo.returnAmountFromSwaps || swapInfo.returnAmount;
    const amountOutForLimits = swapType === SwapType.SwapExactIn
        ? swapInfo.returnAmountFromSwaps || swapInfo.returnAmount
        : swapInfo.swapAmountForSwaps || swapInfo.swapAmount;
    const tokenInForSwaps = tokenForSwaps(swapInfo.tokenIn);
    const tokenOutFromSwaps = tokenForSwaps(swapInfo.tokenOut);
    return {
        ...swapInfo,
        amountIn,
        amountOut,
        amountInForLimits: amountForLimit(amountInForLimits),
        amountOutForLimits: amountForLimit(amountOutForLimits),
        tokenInForSwaps,
        tokenOutFromSwaps,
    };
}

class SingleSwapBuilder {
    /**
     * Building swap transaction data
     *
     * @param swapInfo SOR result
     * @param kind
     * @param chainId used to resolve relayer addresses
     */
    constructor(swapInfo, kind, chainId) {
        this.kind = kind;
        this.chainId = chainId;
        this.functionName = 'swap';
        this.swapInfo = decorateSorSwapInfo(swapInfo, kind);
        this.relayer = relayerResolver(this.swapInfo.tokenIn, this.swapInfo.tokenOut, this.chainId);
    }
    setFunds(sender, recipient) {
        this.funds = {
            sender,
            recipient: recipient || sender,
            fromInternalBalance: false,
            toInternalBalance: false,
        };
    }
    /**
     * @param deadline block timestamp
     */
    setDeadline(deadline) {
        this.deadline = deadline.toString();
    }
    get amount() {
        return this.kind === SwapType.SwapExactOut
            ? this.swapInfo.amountOutForLimits.amount
            : this.swapInfo.amountInForLimits.amount;
    }
    /**
     * Calculates the limit for token amount.
     * https://dev.balancer.fi/guides/swaps/single-swaps
     * https://dev.balancer.fi/resources/swaps/single-swap
     *
     * For swap:
     * The meaning of limit depends on the value of kind
     *    GIVEN_IN: The minimum amount of tokens we would accept to receive from the swap.
     *    GIVEN_OUT: The maximum amount of tokens we would be sending to swap.
     *
     * @param maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
     */
    setLimits(maxSlippage) {
        this.limit =
            this.kind === SwapType.SwapExactIn
                ? this.swapInfo.amountOutForLimits.min(maxSlippage).toString()
                : this.swapInfo.amountInForLimits.max(maxSlippage).toString();
    }
    get singleSwap() {
        const poolId = this.swapInfo.swaps[0].poolId;
        const kind = this.kind;
        const assetIn = this.swapInfo.tokenInForSwaps;
        const assetOut = this.swapInfo.tokenOutFromSwaps;
        const amount = this.amount.toString();
        const userData = '0x';
        return {
            poolId,
            kind,
            assetIn,
            assetOut,
            amount,
            userData,
        };
    }
    attributes() {
        var _a;
        if (!this.funds || !this.limit || !this.deadline) {
            throw new Error('Uninitialized arguments');
        }
        // TODO: Raise errors when some parameters are missing
        let attrs = {
            request: this.singleSwap,
            funds: this.funds,
            limit: this.limit,
            deadline: this.deadline,
        };
        // TODO: Call this logic from a relayer module maybe? Do we actually need to do that?
        // additional parameters on a contract:
        // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/standalone-utils/contracts/relayer/VaultActions.sol#L44
        const fragment = this.fragment();
        if (fragment[0].inputs && ((_a = fragment[0].inputs) === null || _a === void 0 ? void 0 : _a.length) > 4) {
            attrs = {
                ...attrs,
                value: '0',
                outputReference: '0',
            };
        }
        return attrs;
    }
    data() {
        const contractInterface = new Interface(this.fragment());
        return contractInterface.encodeFunctionData('swap', Object.values(this.attributes()));
    }
    value(maxSlippage) {
        let amount = BigNumber.from(0);
        if (this.swapInfo.tokenIn === AddressZero)
            amount =
                this.kind === SwapType.SwapExactIn
                    ? this.swapInfo.amountIn
                    : this.swapInfo.amountInForLimits.max(maxSlippage);
        return amount;
    }
    to() {
        return this.relayer.address;
    }
    fragment() {
        return swapFragment(this.relayer).filter((f) => f.name === this.functionName);
    }
}

class BatchSwapBuilder {
    /**
     * Building swap transaction data
     *
     * @param swapInfo SOR result
     * @param kind
     */
    constructor(swapInfo, kind, chainId) {
        this.kind = kind;
        this.chainId = chainId;
        this.functionName = 'batchSwap';
        this.swapInfo = decorateSorSwapInfo(swapInfo, kind);
        this.relayer = relayerResolver(this.swapInfo.tokenIn, this.swapInfo.tokenOut, this.chainId);
    }
    setFunds(sender, recipient) {
        this.funds = {
            sender,
            recipient: recipient || sender,
            fromInternalBalance: false,
            toInternalBalance: false,
        };
    }
    /**
     * @param deadline block timestamp
     */
    setDeadline(deadline) {
        this.deadline = deadline;
    }
    /**
     * Given IN it's the minimum amount we are willing to accept.
     * Given OUT it's the fixed amount defined as output.
     */
    minAmountOut(maxSlippage) {
        return this.kind === SwapType.SwapExactIn
            ? this.swapInfo.amountOutForLimits.min(maxSlippage)
            : this.swapInfo.amountOutForLimits.amount;
    }
    /**
     * Given IN it's the fixed amount we define as input.
     * Given OUT it's the maximum amount we are willing to pay for the request.
     */
    maxAmountIn(maxSlippage) {
        return this.kind === SwapType.SwapExactOut
            ? this.swapInfo.amountInForLimits.max(maxSlippage)
            : this.swapInfo.amountInForLimits.amount;
    }
    /**
     * Calculates limits for token amount.
     * Maximum number of tokens to send is a positive number
     * Minimum amount of tokens to receive is a negative number
     * https://dev.balancer.fi/guides/swaps/batch-swaps
     * https://dev.balancer.fi/resources/swaps/batch-swaps#multi-hop-examples
     *
     * For batchSwap:
     * An array of of the maximum net amounts of each asset which can be taken to perform the swap.
     * Should the total trade require more than limits[i] tokens to be taken from sender for any i
     * then the transaction shall fail.
     *
     * @param maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
     */
    setLimits(maxSlippage) {
        // TODO: This implementation handles only a single input. We might want to extend it for multiple token inputs
        this.limits = this.swapInfo.tokenAddresses
            .map((token) => {
            let amount = BigNumber.from(0);
            if (token === this.swapInfo.tokenInForSwaps) {
                amount = this.maxAmountIn(maxSlippage);
            }
            if (token === this.swapInfo.tokenOutFromSwaps) {
                amount = this.minAmountOut(maxSlippage).mul(-1);
            }
            return amount;
        })
            .map((limit) => limit.toString().split('.')[0]);
    }
    attributes() {
        var _a;
        // TODO: Raise errors when some parameters are missing
        if (!this.funds || !this.limits || !this.deadline) {
            throw new Error('Uninitialized arguments');
        }
        let attrs = {
            kind: this.kind,
            swaps: this.swapInfo.swaps,
            assets: this.swapInfo.tokenAddresses,
            funds: this.funds,
            limits: this.limits,
            deadline: this.deadline,
        };
        const fragment = this.fragment();
        // TODO: Call this logic from a relayer module maybe? Do we actually need to do that?
        // additional parameters on a contract:
        // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/standalone-utils/contracts/relayer/VaultActions.sol#L67
        if (fragment[0].inputs && ((_a = fragment[0].inputs) === null || _a === void 0 ? void 0 : _a.length) > 6) {
            attrs = {
                ...attrs,
                value: '0',
                outputReferences: [],
            };
        }
        return attrs;
    }
    data() {
        const contractInterface = new Interface(this.fragment());
        return contractInterface.encodeFunctionData('batchSwap', Object.values(this.attributes()));
    }
    value(maxSlippage) {
        let amount = BigNumber.from(0);
        if (this.swapInfo.tokenIn === AddressZero)
            amount = this.maxAmountIn(maxSlippage);
        return amount;
    }
    to() {
        return this.relayer.address;
    }
    fragment() {
        return swapFragment(this.relayer).filter((f) => f.name === this.functionName);
    }
}

class Swaps {
    // TODO: sorOrConfig - let's make it more predictable and always pass configuration explicitly
    constructor(sorOrConfig) {
        if (sorOrConfig instanceof SOR$1) {
            this.sor = sorOrConfig;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.chainId = this.sor.provider['_network']['chainId'];
        }
        else {
            this.sor = new Sor(sorOrConfig);
            this.chainId = sorOrConfig.network;
        }
        this.vaultContract = Vault__factory.connect(balancerVault, this.sor.provider);
    }
    static getLimitsForSlippage(tokensIn, tokensOut, swapType, deltas, assets, slippage) {
        // TO DO - Check best way to do this?
        const limits = getLimitsForSlippage(tokensIn, tokensOut, swapType, deltas, assets, slippage);
        return limits.map((l) => l.toString());
    }
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
    async findRouteGivenIn({ tokenIn, tokenOut, amount, gasPrice, maxPools = 4, }) {
        return this.sor.getSwaps(tokenIn, tokenOut, SwapTypes.SwapExactIn, amount, {
            gasPrice,
            maxPools,
        });
    }
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
    async findRouteGivenOut({ tokenIn, tokenOut, amount, gasPrice, maxPools, }) {
        return this.sor.getSwaps(tokenIn, tokenOut, SwapTypes.SwapExactOut, amount, {
            gasPrice,
            maxPools,
        });
    }
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
    buildSwap({ userAddress, recipient, swapInfo, kind, deadline, maxSlippage, }) {
        if (!this.chainId)
            throw 'Missing network configuration';
        // one vs batch (gas cost optimisation when using single swap)
        const builder = swapInfo.swaps.length > 1
            ? new BatchSwapBuilder(swapInfo, kind, this.chainId)
            : new SingleSwapBuilder(swapInfo, kind, this.chainId);
        builder.setFunds(userAddress, recipient);
        builder.setDeadline(deadline);
        builder.setLimits(maxSlippage);
        const to = builder.to();
        const { functionName } = builder;
        const attributes = builder.attributes();
        const data = builder.data();
        const value = builder.value(maxSlippage);
        return { to, functionName, attributes, data, value };
    }
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
    static encodeBatchSwap(batchSwap) {
        const vaultInterface = Vault__factory.createInterface();
        return vaultInterface.encodeFunctionData('batchSwap', [
            batchSwap.kind,
            batchSwap.swaps,
            batchSwap.assets,
            batchSwap.funds,
            batchSwap.limits,
            batchSwap.deadline,
        ]);
    }
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
    static encodeSimpleFlashSwap(params) {
        return this.encodeBatchSwap(convertSimpleFlashSwapToBatchSwapParameters(params));
    }
    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools() {
        return this.sor.fetchPools();
    }
    getPools() {
        return this.sor.getPools();
    }
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
    async queryBatchSwap(batchSwap) {
        return await queryBatchSwap(this.vaultContract, batchSwap.kind, batchSwap.swaps, batchSwap.assets);
    }
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
    async queryBatchSwapWithSor(queryWithSor) {
        return await queryBatchSwapWithSor(this.sor, this.vaultContract, queryWithSor);
    }
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
    async querySimpleFlashSwap(params) {
        return await querySimpleFlashSwap({
            ...params,
            vaultContract: this.vaultContract,
        });
    }
    /**
     * Use SOR to get swapInfo for tokenIn<>tokenOut.
     * @param {SwapInput} swapInput - Swap information used for querying using SOR.
     * @param {string} swapInput.tokenIn - Addresse of asset in.
     * @param {string} swapInput.tokenOut - Addresse of asset out.
     * @param {SwapType} swapInput.swapType - Type of Swap, ExactIn/Out.
     * @param {string} swapInput.amount - Amount used in swap.
     * @returns {Promise<SwapInfo>} SOR swap info.
     */
    async getSorSwap(swapInput) {
        return await getSorSwapInfo(swapInput.tokenIn, swapInput.tokenOut, swapInput.swapType, swapInput.amount, this.sor);
    }
}

var aaveWrappingAbi = [
	{
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "approveVault",
		outputs: [
		],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStaticATokenLM",
				name: "staticToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "toUnderlying",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "unwrapAaveStaticToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "contract IStaticATokenLM",
				name: "staticToken",
				type: "address"
			},
			{
				internalType: "address",
				name: "sender",
				type: "address"
			},
			{
				internalType: "address",
				name: "recipient",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			},
			{
				internalType: "bool",
				name: "fromUnderlying",
				type: "bool"
			},
			{
				internalType: "uint256",
				name: "outputReference",
				type: "uint256"
			}
		],
		name: "wrapAaveDynamicToken",
		outputs: [
		],
		stateMutability: "payable",
		type: "function"
	}
];

const relayerLibrary = new Interface(relayerLibraryAbi);
class Relayer {
    constructor(swapsOrConfig) {
        if (swapsOrConfig instanceof Swaps) {
            this.swaps = swapsOrConfig;
        }
        else {
            this.swaps = new Swaps(swapsOrConfig);
        }
    }
    static encodeApproveVault(tokenAddress, maxAmount) {
        return relayerLibrary.encodeFunctionData('approveVault', [
            tokenAddress,
            maxAmount,
        ]);
    }
    static encodeSetRelayerApproval(relayerAdress, approved, authorisation) {
        return relayerLibrary.encodeFunctionData('setRelayerApproval', [
            relayerAdress,
            approved,
            authorisation,
        ]);
    }
    static encodeGaugeWithdraw(gaugeAddress, sender, recipient, amount) {
        return relayerLibrary.encodeFunctionData('gaugeWithdraw', [
            gaugeAddress,
            sender,
            recipient,
            amount,
        ]);
    }
    static encodeGaugeDeposit(gaugeAddress, sender, recipient, amount) {
        return relayerLibrary.encodeFunctionData('gaugeDeposit', [
            gaugeAddress,
            sender,
            recipient,
            amount,
        ]);
    }
    static encodeBatchSwap(params) {
        return relayerLibrary.encodeFunctionData('batchSwap', [
            params.swapType,
            params.swaps,
            params.assets,
            params.funds,
            params.limits,
            params.deadline,
            params.value,
            params.outputReferences,
        ]);
    }
    static encodeExitPool(params) {
        return relayerLibrary.encodeFunctionData('exitPool', [
            params.poolId,
            params.poolKind,
            params.sender,
            params.recipient,
            params.exitPoolRequest,
            params.outputReferences,
        ]);
    }
    static encodeUnwrapAaveStaticToken(params) {
        const aaveWrappingLibrary = new Interface(aaveWrappingAbi);
        return aaveWrappingLibrary.encodeFunctionData('unwrapAaveStaticToken', [
            params.staticToken,
            params.sender,
            params.recipient,
            params.amount,
            params.toUnderlying,
            params.outputReferences,
        ]);
    }
    static toChainedReference(key) {
        // The full padded prefix is 66 characters long, with 64 hex characters and the 0x prefix.
        const paddedPrefix = `0x${Relayer.CHAINED_REFERENCE_PREFIX}${'0'.repeat(64 - Relayer.CHAINED_REFERENCE_PREFIX.length)}`;
        return BigNumber.from(paddedPrefix).add(key);
    }
    static constructExitCall(params) {
        const { assets, minAmountsOut, userData, toInternalBalance, poolId, poolKind, sender, recipient, outputReferences, } = params;
        const exitPoolRequest = {
            assets,
            minAmountsOut,
            userData,
            toInternalBalance,
        };
        const exitPoolInput = {
            poolId,
            poolKind,
            sender,
            recipient,
            outputReferences,
            exitPoolRequest,
        };
        const exitEncoded = Relayer.encodeExitPool(exitPoolInput);
        return exitEncoded;
    }
    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools() {
        return this.swaps.fetchPools();
    }
    getPools() {
        return this.swaps.getPools();
    }
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
    async exitPoolAndBatchSwap(params) {
        const slippageAmountNegative = WeiPerEther.sub(BigNumber.from(params.slippage));
        // Set min amounts out of exit pool based on slippage
        const minAmountsOut = params.expectedAmountsOut.map((amt) => BigNumber.from(amt)
            .mul(slippageAmountNegative)
            .div(WeiPerEther)
            .toString());
        // Output of exit is used as input to swaps
        const outputReferences = [];
        params.exitTokens.forEach((asset, i) => {
            const key = Relayer.toChainedReference(i);
            outputReferences.push({
                index: i,
                key: key,
            });
        });
        const exitCall = Relayer.constructExitCall({
            assets: params.exitTokens,
            minAmountsOut,
            userData: params.userData,
            toInternalBalance: true,
            poolId: params.poolId,
            poolKind: 0,
            sender: params.exiter,
            recipient: params.exiter,
            outputReferences: outputReferences,
            exitPoolRequest: {},
        });
        // Use swapsService to get swap info for exitTokens>finalTokens
        // This will give batchSwap swap paths
        // Amounts out will be worst case amounts
        const queryResult = await this.swaps.queryBatchSwapWithSor({
            tokensIn: params.exitTokens,
            tokensOut: params.finalTokensOut,
            swapType: SwapType.SwapExactIn,
            amounts: minAmountsOut,
            fetchPools: params.fetchPools,
        });
        // This is a safety check to avoid issues when a swap path exists with 0 value
        if (queryResult.returnAmounts.includes('0'))
            throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);
        // Update swap amounts with ref outputs from exitPool
        queryResult.swaps.forEach((swap) => {
            const token = queryResult.assets[swap.assetInIndex];
            const index = params.exitTokens.indexOf(token);
            if (index !== -1)
                swap.amount = outputReferences[index].key.toString();
        });
        // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug
        // Replace tokenIn delta for swaps with amount + slippage.
        // This gives tolerance for limit incase amount out of exitPool is larger min,
        const slippageAmountPositive = WeiPerEther.add(params.slippage);
        params.exitTokens.forEach((exitToken, i) => {
            const index = queryResult.assets
                .map((elem) => elem.toLowerCase())
                .indexOf(exitToken.toLowerCase());
            if (index !== -1) {
                queryResult.deltas[index] = BigNumber.from(params.expectedAmountsOut[i])
                    .mul(slippageAmountPositive)
                    .div(WeiPerEther)
                    .toString();
            }
        });
        // Creates limit array.
        // Slippage set to 0. Already accounted for as swap used amounts out of pool with worst case slippage.
        const limits = Swaps.getLimitsForSlippage(params.exitTokens, // tokensIn
        params.finalTokensOut, // tokensOut
        SwapType.SwapExactIn, queryResult.deltas, // tempDeltas // Useful for debug
        queryResult.assets, '0');
        // Creates fund management using internal balance as source of tokens
        const funds = {
            sender: params.exiter,
            recipient: params.swapRecipient,
            fromInternalBalance: true,
            toInternalBalance: false,
        };
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps: queryResult.swaps,
            assets: queryResult.assets,
            funds: funds,
            limits: limits.map((l) => l.toString()),
            deadline: MaxUint256,
            value: '0',
            outputReferences: [],
        });
        // Return amounts from swap
        const calls = [exitCall, encodedBatchSwap];
        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsOut: queryResult.returnAmounts,
            },
        };
    }
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
    async swapUnwrapAaveStaticExactIn(tokensIn, aaveStaticTokens, amountsIn, rates, funds, slippage, fetchPools = {
        fetchPools: true,
        fetchOnChain: false,
    }) {
        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swaps.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactIn,
            amounts: amountsIn,
            fetchPools,
        });
        // This is a safety check to avoid issues when a swap path exists with 0 value
        if (queryResult.returnAmounts.includes('0'))
            throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);
        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = Swaps.getLimitsForSlippage(tokensIn, // tokensIn
        aaveStaticTokens, // tokensOut
        SwapType.SwapExactIn, queryResult.deltas, queryResult.assets, slippage);
        const calls = this.encodeSwapUnwrap(aaveStaticTokens, SwapType.SwapExactIn, queryResult.swaps, queryResult.assets, funds, limits);
        const amountsUnwrapped = queryResult.returnAmounts.map((amountWrapped, i) => {
            const amountUnwrapped = BigNumber.from(amountWrapped)
                .abs()
                .mul(rates[i])
                .div(WeiPerEther);
            // This is a safety check to avoid issues when a swap path exists with 0 value
            if (!amountUnwrapped.gt(Zero))
                throw new BalancerError(BalancerErrorCode.UNWRAP_ZERO_AMOUNT);
            return amountUnwrapped.toString();
        });
        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsOut: amountsUnwrapped,
            },
        };
    }
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
    async swapUnwrapAaveStaticExactOut(tokensIn, aaveStaticTokens, amountsUnwrapped, rates, funds, slippage, fetchPools = {
        fetchPools: true,
        fetchOnChain: false,
    }) {
        const amountsWrapped = amountsUnwrapped.map((amountInwrapped, i) => {
            const amountWrapped = BigNumber.from(amountInwrapped)
                .mul(WeiPerEther)
                .div(rates[i]);
            // This is a safety check to avoid issues when a swap path exists with 0 value
            if (!amountWrapped.gt(Zero))
                throw new BalancerError(BalancerErrorCode.WRAP_ZERO_AMOUNT);
            return amountWrapped.toString();
        });
        // Use swapsService to get swap info for tokensIn>wrappedTokens
        const queryResult = await this.swaps.queryBatchSwapWithSor({
            tokensIn,
            tokensOut: aaveStaticTokens,
            swapType: SwapType.SwapExactOut,
            amounts: amountsWrapped,
            fetchPools,
        });
        // This is a safety check to avoid issues when a swap path exists with 0 value
        if (queryResult.returnAmounts.includes('0'))
            throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);
        // Gets limits array for tokensIn>wrappedTokens based on input slippage
        const limits = Swaps.getLimitsForSlippage(tokensIn, // tokensIn
        aaveStaticTokens, // tokensOut
        SwapType.SwapExactOut, queryResult.deltas, queryResult.assets, slippage);
        const calls = this.encodeSwapUnwrap(aaveStaticTokens, SwapType.SwapExactOut, queryResult.swaps, queryResult.assets, funds, limits);
        return {
            function: 'multicall',
            params: calls,
            outputs: {
                amountsIn: queryResult.returnAmounts.map((amount) => amount.toString()),
            },
        };
    }
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
    encodeSwapUnwrap(wrappedTokens, swapType, swaps, assets, funds, limits) {
        // Output of swaps (wrappedTokens) is used as input to unwrap
        // Need indices of output tokens and outputReferences need to be made with those as key
        const outputReferences = [];
        const unwrapCalls = [];
        wrappedTokens.forEach((wrappedToken, i) => {
            // Find index of wrappedToken in asset array. This is used as ref in Relayer.
            const index = assets.findIndex((token) => token.toLowerCase() === wrappedToken.toLowerCase());
            // There may be cases where swap isn't possible for wrappedToken
            if (index === -1)
                return;
            const key = Relayer.toChainedReference(i);
            outputReferences.push({
                index: index,
                key: key,
            });
            // console.log(`Unwrapping ${wrappedToken} with amt: ${key.toHexString()}`);
            const encodedUnwrap = Relayer.encodeUnwrapAaveStaticToken({
                staticToken: wrappedToken,
                sender: funds.recipient,
                recipient: funds.sender,
                amount: key,
                toUnderlying: true,
                outputReferences: 0,
            });
            unwrapCalls.push(encodedUnwrap);
        });
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: swapType,
            swaps: swaps,
            assets: assets,
            funds: funds,
            limits: limits.map((l) => l.toString()),
            deadline: MaxUint256,
            value: '0',
            outputReferences: outputReferences,
        });
        return [encodedBatchSwap, ...unwrapCalls];
    }
}
Relayer.CHAINED_REFERENCE_PREFIX = 'ba10';

class Subgraph {
    constructor(config) {
        this.url = getNetworkConfig(config).urls.subgraph;
        this.client = this.initClient();
    }
    initClient() {
        const client = new GraphQLClient(this.url);
        return getSdk$1(client);
    }
}

class Pricing {
    constructor(config, swaps) {
        if (swaps) {
            this.swaps = swaps;
        }
        else {
            this.swaps = new Swaps(config);
        }
    }
    /**
     * Retrieves pools using poolDataService.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools() {
        return this.swaps.fetchPools();
    }
    /**
     * Get currently saved pools list (fetched using fetchPools()).
     * @returns {SubgraphPoolBase[]} pools list.
     */
    getPools() {
        return this.swaps.getPools();
    }
    /**
     * Calculates Spot Price for a token pair - finds most liquid path and uses this as reference SP.
     * @param { string } tokenIn Token in address.
     * @param { string } tokenOut Token out address.
     * @param { SubgraphPoolBase[] } pools Optional - Pool data. Will be fetched via dataProvider if not supplied.
     * @returns  { string } Spot price.
     */
    async getSpotPrice(tokenIn, tokenOut, pools = []) {
        // If pools list isn't supplied fetch it from swaps data provider
        if (pools.length === 0) {
            await this.fetchPools();
            pools = this.getPools();
        }
        // We find the path for the pair with the highest liquidity and use this as the ref SP
        const poolsDict = parseToPoolsDict(pools, 0);
        // This creates all paths for tokenIn>Out ordered by liquidity
        const paths = this.swaps.sor.routeProposer.getCandidatePathsFromDict(tokenIn, tokenOut, 0, poolsDict, 4);
        if (paths.length === 0)
            throw new BalancerError(BalancerErrorCode.UNSUPPORTED_PAIR);
        return getSpotPriceAfterSwapForPath(paths[0], 0, ZERO).toString();
    }
}

var abi = [
	{
		constant: true,
		inputs: [
		],
		name: "name",
		outputs: [
			{
				name: "",
				type: "string"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		constant: false,
		inputs: [
			{
				name: "_spender",
				type: "address"
			},
			{
				name: "_value",
				type: "uint256"
			}
		],
		name: "approve",
		outputs: [
			{
				name: "",
				type: "bool"
			}
		],
		payable: false,
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		constant: true,
		inputs: [
		],
		name: "totalSupply",
		outputs: [
			{
				name: "",
				type: "uint256"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		constant: false,
		inputs: [
			{
				name: "_from",
				type: "address"
			},
			{
				name: "_to",
				type: "address"
			},
			{
				name: "_value",
				type: "uint256"
			}
		],
		name: "transferFrom",
		outputs: [
			{
				name: "",
				type: "bool"
			}
		],
		payable: false,
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		constant: true,
		inputs: [
		],
		name: "decimals",
		outputs: [
			{
				name: "",
				type: "uint8"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		constant: true,
		inputs: [
			{
				name: "_owner",
				type: "address"
			}
		],
		name: "balanceOf",
		outputs: [
			{
				name: "balance",
				type: "uint256"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		constant: true,
		inputs: [
		],
		name: "symbol",
		outputs: [
			{
				name: "",
				type: "string"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		constant: false,
		inputs: [
			{
				name: "_to",
				type: "address"
			},
			{
				name: "_value",
				type: "uint256"
			}
		],
		name: "transfer",
		outputs: [
			{
				name: "",
				type: "bool"
			}
		],
		payable: false,
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		constant: true,
		inputs: [
			{
				name: "_owner",
				type: "address"
			},
			{
				name: "_spender",
				type: "address"
			}
		],
		name: "allowance",
		outputs: [
			{
				name: "",
				type: "uint256"
			}
		],
		payable: false,
		stateMutability: "view",
		type: "function"
	},
	{
		payable: true,
		stateMutability: "payable",
		type: "fallback"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				name: "owner",
				type: "address"
			},
			{
				indexed: true,
				name: "spender",
				type: "address"
			},
			{
				indexed: false,
				name: "value",
				type: "uint256"
			}
		],
		name: "Approval",
		type: "event"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				name: "from",
				type: "address"
			},
			{
				indexed: true,
				name: "to",
				type: "address"
			},
			{
				indexed: false,
				name: "value",
				type: "uint256"
			}
		],
		name: "Transfer",
		type: "event"
	}
];

const ERC20 = (address, provider) => new Contract(address, abi, provider);

class Contracts {
    /**
     * Create instances of Balancer contracts connected to passed provider.
     * @param { Network | ContractAddresses } networkOrAddresses
     * @param { Provider } provider
     */
    constructor(networkOrAddresses, provider) {
        // Access addresses using passed network if available
        if (typeof networkOrAddresses === 'number') {
            this.contractAddresses =
                BALANCER_NETWORK_CONFIG[networkOrAddresses].addresses.contracts;
        }
        else {
            this.contractAddresses = networkOrAddresses;
        }
        this.vault = Vault__factory.connect(this.contractAddresses.vault, provider);
        if (this.contractAddresses.lidoRelayer)
            this.lidoRelayer = LidoRelayer__factory.connect(this.contractAddresses.lidoRelayer, provider);
        // These contracts aren't included in Balancer Typechain but are still useful.
        // TO DO - Possibly create via Typechain but seems unnecessary?
        this.multicall = Multicall(this.contractAddresses.multicall, provider);
    }
    /**
     * Expose contract instances.
     */
    get contracts() {
        return {
            vault: this.vault,
            lidoRelayer: this.lidoRelayer,
            multicall: this.multicall,
            ERC20: this.getErc20,
        };
    }
    /**
     * Helper to create ERC20 contract.
     * @param { string } address ERC20 address.
     * @param { Provider} provider Provider.
     * @returns Contract.
     */
    getErc20(address, provider) {
        return ERC20(address, provider);
    }
}

const ADDRESSES = {
    1: {
        relayer: '0x886A3Ec7bcC508B8795990B60Fa21f85F9dB7948',
        staBal3: {
            id: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
            address: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
            gauge: '0x34f33cdaed8ba0e1ceece80e5f4a73bcf234cfac',
            assetOrder: ['DAI', 'USDC', 'USDT'],
        },
        bbausd1: {
            id: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
            address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
            gauge: '0x68d019f64a7aa97e2d4e7363aee42251d08124fb',
            assetOrder: ['bb-a-USDT', 'bb-a-DAI', 'bb-a-USDC'],
        },
        bbausd2: {
            id: '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
            address: '0xa13a9247ea42d743238089903570127dda72fe44',
            gauge: '0xa6325e799d266632d347e41265a69af111b05403',
        },
        linearUsdc1: {
            id: '0x9210f1204b5a24742eba12f710636d76240df3d00000000000000000000000fc',
            address: '0x9210F1204b5a24742Eba12f710636D76240dF3d0',
        },
        linearDai1: {
            id: '0x804cdb9116a10bb78768d3252355a1b18067bf8f0000000000000000000000fb',
            address: '0x804CdB9116a10bB78768D3252355a1b18067bF8f',
        },
        linearUsdt1: {
            id: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c0000000000000000000000fd',
            address: '0x2BBf681cC4eb09218BEe85EA2a5d3D13Fa40fC0C',
        },
        linearUsdc2: {
            id: '0x82698AECC9E28E9BB27608BD52CF57F704BD1B83000000000000000000000336',
            address: '0x82698aeCc9E28e9Bb27608Bd52cF57f704BD1B83',
        },
        linearDai2: {
            id: '0xAE37D54AE477268B9997D4161B96B8200755935C000000000000000000000337',
            address: '0xae37D54Ae477268B9997d4161B96b8200755935c',
        },
        linearUsdt2: {
            id: '0x2F4EB100552EF93840D5ADC30560E5513DFFFACB000000000000000000000334',
            address: '0x2F4eb100552ef93840d5aDC30560E5513DFfFACb',
        },
        maiusd: {
            id: '',
            address: '',
            gauge: '',
            assetOrder: ['USDT', 'miMATIC', 'DAI', 'USDC'],
        },
        maibbausd: {
            id: '',
            address: '',
            gauge: '',
            assetOrder: ['bb-a-USD', 'miMATIC'],
        },
        DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
        USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        waDAI: '0x02d60b84491589974263d922d9cc7a3152618ef6',
        waUSDC: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
        waUSDT: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
        miMATIC: '',
    },
    5: {
        relayer: '0x7b9B6f094DC2Bd1c12024b0D9CC63d6993Be1888',
        staBal3: {
            id: '0xdcdd4a3d36dec8d57594e89763d069a7e9b223e2000000000000000000000062',
            address: '0xdcdd4a3d36dec8d57594e89763d069a7e9b223e2',
            gauge: '0xfd364cda96bb7db06b65706182c448a73f0a5f9a',
            assetOrder: ['USDT', 'DAI', 'USDC'],
        },
        staBal3_2: {
            id: '0xff9d677474d4344379924e10b68c8fea67e03294000000000000000000000072',
            address: '0xff9d677474d4344379924e10b68c8fea67e03294',
            gauge: '0x4e4ebf2aa90e41174d716a5168895357762d68af',
            assetOrder: ['USDT', 'DAI', 'USDC'],
        },
        staBal3_3: {
            id: '0x3bfc8a0509f1a68aefd446f6c19bf37b3c75a8fc0000000000000000000000a5',
            address: '0x3bfc8a0509f1a68aefd446f6c19bf37b3c75a8fc',
            gauge: '0x7776e1008d7c20ab54aa57a7c44fc7de602de29a',
            assetOrder: ['USDT', 'DAI', 'USDC'],
        },
        bbausd1: {
            id: '0x13acd41c585d7ebb4a9460f7c8f50be60dc080cd00000000000000000000005f',
            address: '0x13acd41c585d7ebb4a9460f7c8f50be60dc080cd',
            gauge: '0xa2d0ea81a47d68598922cd54c59249ff58c2a3ff',
            assetOrder: ['bb-a-USDC', 'bb-a-DAI', 'bb-a-USDT'],
        },
        bbausd2: {
            id: '0x13acd41c585d7ebb4a9460f7c8f50be60dc080cd00000000000000000000005f',
            address: '0x13acd41c585d7ebb4a9460f7c8f50be60dc080cd',
            gauge: '0xa2d0ea81a47d68598922cd54c59249ff58c2a3ff',
        },
        linearUsdc1: {
            id: '0x0595d1df64279ddb51f1bdc405fe2d0b4cc8668100000000000000000000005c',
            address: '0x0595d1df64279ddb51f1bdc405fe2d0b4cc86681',
        },
        linearDai1: {
            id: '0x5cea6a84ed13590ed14903925fa1a73c36297d9900000000000000000000005d',
            address: '0x5cea6a84ed13590ed14903925fa1a73c36297d99',
        },
        linearUsdt1: {
            id: '0xefd681a82970ac5d980b9b2d40499735e7bf3f1f00000000000000000000005e',
            address: '0xefd681a82970ac5d980b9b2d40499735e7bf3f1f',
        },
        linearUsdc2: {
            id: '0x0595d1df64279ddb51f1bdc405fe2d0b4cc8668100000000000000000000005c',
            address: '0x0595d1df64279ddb51f1bdc405fe2d0b4cc86681',
        },
        linearDai2: {
            id: '0x5cea6a84ed13590ed14903925fa1a73c36297d9900000000000000000000005d',
            address: '0x5cea6a84ed13590ed14903925fa1a73c36297d99',
        },
        linearUsdt2: {
            id: '0xefd681a82970ac5d980b9b2d40499735e7bf3f1f00000000000000000000005e',
            address: '0xefd681a82970ac5d980b9b2d40499735e7bf3f1f',
        },
        maiusd: {
            id: '0x6a8f9ab364b85725973d2a33cb9aae2dac43b5e30000000000000000000000a6',
            address: '0x6a8f9ab364b85725973d2a33cb9aae2dac43b5e3',
            gauge: '0x58141bdcecb7fbae006964f4131cf6f65c948357',
            assetOrder: ['USDT', 'miMATIC', 'DAI', 'USDC'],
        },
        maibbausd: {
            id: '0xb04b03b78cf79788a1931545bd2744161029648f0000000000000000000000a8',
            address: '0xb04b03b78cf79788a1931545bd2744161029648f',
            gauge: '0xdc3f6fc8898830e53c777543fe252b14f22680d4',
            assetOrder: ['bb-a-USD', 'miMATIC', 'MAI BSP'],
        },
        USDT: '0x1f1f156e0317167c11aa412e3d1435ea29dc3cce',
        DAI: '0x8c9e6c40d3402480ace624730524facc5482798c',
        USDC: '0xe0c9275e44ea80ef17579d33c55136b7da269aeb',
        waDAI: '0x89534a24450081aa267c79b07411e9617d984052',
        waUSDC: '0x811151066392fd641fe74a9b55a712670572d161',
        waUSDT: '0x4cb1892fddf14f772b2e39e299f44b2e5da90d04',
        miMATIC: '0x398106564948feeb1fedea0709ae7d969d62a391',
    },
    137: {
        relayer: '0xcf6a66E32dCa0e26AcC3426b851FD8aCbF12Dac7',
        staBal3: {
            id: '',
            address: '',
            gauge: '',
            assetOrder: ['USDT', 'DAI', 'USDC'],
        },
        bbausd1: {
            id: '',
            address: '',
            gauge: '',
            assetOrder: ['bb-a-USDC', 'bb-a-DAI', 'bb-a-USDT'],
        },
        bbausd2: {
            id: '0x48e6b98ef6329f8f0a30ebb8c7c960330d64808500000000000000000000075b',
            address: '0x48e6b98ef6329f8f0a30ebb8c7c960330d648085',
            gauge: '',
        },
        linearUsdc1: {
            id: '',
            address: '',
        },
        linearDai1: {
            id: '',
            address: '',
        },
        linearUsdt1: {
            id: '',
            address: '',
        },
        linearUsdc2: {
            id: '0xf93579002dbe8046c43fefe86ec78b1112247bb8000000000000000000000759',
            address: '0xf93579002dbe8046c43fefe86ec78b1112247bb8',
        },
        linearDai2: {
            id: '0x178e029173417b1f9c8bc16dcec6f697bc323746000000000000000000000758',
            address: '0x178e029173417b1f9c8bc16dcec6f697bc323746',
        },
        linearUsdt2: {
            id: '0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea600000000000000000000075a',
            address: '0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea6',
        },
        maiusd: {
            id: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000012',
            address: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
            gauge: '0x72843281394e68de5d55bcf7072bb9b2ebc24150',
            assetOrder: ['USDC', 'DAI', 'miMATIC', 'USDT'],
        },
        maibbausd: {
            id: '0xb54b2125b711cd183edd3dd09433439d5396165200000000000000000000075e',
            address: '0xb54b2125b711cd183edd3dd09433439d53961652',
            gauge: '0x9a105ef22a59484aa2731c357049f6a13d0891f5',
            assetOrder: ['bb-a-USD', 'miMATIC'],
        },
        USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        DAI: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
        USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        waDAI: '0xEE029120c72b0607344f35B17cdD90025e647B00',
        waUSDC: '0x221836a597948Dce8F3568E044fF123108aCc42A',
        waUSDT: '0x19C60a251e525fa88Cd6f3768416a8024e98fC19',
        miMATIC: '0xa3fa99a148fa48d14ed51d610c367c61876997f1',
    },
};

var balancerRelayerAbi = [
	{
		inputs: [
			{
				internalType: "contract IVault",
				name: "vault",
				type: "address"
			},
			{
				internalType: "address",
				name: "libraryAddress",
				type: "address"
			}
		],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		inputs: [
		],
		name: "getLibrary",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
		],
		name: "getVault",
		outputs: [
			{
				internalType: "contract IVault",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "bytes[]",
				name: "data",
				type: "bytes[]"
			}
		],
		name: "multicall",
		outputs: [
			{
				internalType: "bytes[]",
				name: "results",
				type: "bytes[]"
			}
		],
		stateMutability: "payable",
		type: "function"
	},
	{
		stateMutability: "payable",
		type: "receive"
	}
];

const balancerRelayerInterface$3 = new Interface(balancerRelayerAbi);
const EXIT_DAI$1 = Relayer.toChainedReference('21');
const EXIT_USDC$1 = Relayer.toChainedReference('22');
const EXIT_USDT$1 = Relayer.toChainedReference('23');
const SWAP_RESULT_BBAUSD$1 = Relayer.toChainedReference('24');
class StaBal3Builder {
    constructor(networkId) {
        this.addresses = ADDRESSES[networkId];
    }
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
    calldata(userAddress, staBal3Amount, minBbausd2Out, staked, authorisation) {
        if (BigNumber.from(staBal3Amount).lte(0))
            throw new BalancerError(BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED);
        const relayer = this.addresses.relayer;
        let calls = [];
        if (authorisation) {
            calls = [this.buildSetRelayerApproval(authorisation)];
        }
        if (staked) {
            calls = [
                ...calls,
                this.buildWithdraw(userAddress, staBal3Amount),
                this.buildExit(relayer, staBal3Amount),
                this.buildSwap(minBbausd2Out, relayer),
                this.buildDeposit(userAddress),
            ];
        }
        else {
            calls = [
                ...calls,
                this.buildExit(userAddress, staBal3Amount),
                this.buildSwap(minBbausd2Out, userAddress),
            ];
        }
        const callData = balancerRelayerInterface$3.encodeFunctionData('multicall', [
            calls,
        ]);
        return {
            to: relayer,
            data: callData,
        };
    }
    /**
     * Encodes exitPool callData.
     * Exit staBal3 pool proportionally to underlying stables. Exits to relayer.
     * Outputreferences are used to store exit amounts for next transaction.
     *
     * @param sender Sender address.
     * @param amount Amount of staBal3 BPT to exit with.
     * @returns Encoded exitPool call. Output references.
     */
    buildExit(sender, amount) {
        // Goerli and Mainnet has different assets ordering
        const { assetOrder } = this.addresses.staBal3;
        const assets = assetOrder.map((key) => this.addresses[key]);
        // Assume gaugeWithdraw returns same amount value
        const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);
        // const userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(
        //   amount,
        //   assetOrder.indexOf('DAI')
        // );
        // Ask to store exit outputs for batchSwap of exit is used as input to swaps
        const outputReferences = [
            { index: assetOrder.indexOf('DAI'), key: EXIT_DAI$1 },
            { index: assetOrder.indexOf('USDC'), key: EXIT_USDC$1 },
            { index: assetOrder.indexOf('USDT'), key: EXIT_USDT$1 },
        ];
        const callData = Relayer.constructExitCall({
            assets,
            minAmountsOut: ['0', '0', '0'],
            userData,
            toInternalBalance: true,
            poolId: this.addresses.staBal3.id,
            poolKind: 0,
            sender,
            recipient: this.addresses.relayer,
            outputReferences,
            exitPoolRequest: {},
        });
        return callData;
    }
    /**
     * Creates encoded batchSwap function with following swaps: stables -> linear pools -> boosted pool
     * outputreferences should contain the amount of resulting BPT.
     *
     * @param expectedBptReturn BPT amount expected out of the swap.
     * @param recipient Recipient address.
     * @returns Encoded batchSwap call. Output references.
     */
    buildSwap(expectedBptReturn, recipient) {
        const assets = [
            this.addresses.bbausd2.address,
            this.addresses.DAI,
            this.addresses.linearDai2.address,
            this.addresses.USDC,
            this.addresses.linearUsdc2.address,
            this.addresses.USDT,
            this.addresses.linearUsdt2.address,
        ];
        const outputReferences = [{ index: 0, key: SWAP_RESULT_BBAUSD$1 }];
        // for each linear pool swap -
        // linear1Bpt[linear1]stable[linear2]linear2bpt[bbausd2]bbausd2 Uses chainedReference from previous action for amount.
        // TO DO - Will swap order matter here? John to ask Fernando.
        const swaps = [
            {
                poolId: this.addresses.linearDai2.id,
                assetInIndex: 1,
                assetOutIndex: 2,
                amount: EXIT_DAI$1.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 2,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdc2.id,
                assetInIndex: 3,
                assetOutIndex: 4,
                amount: EXIT_USDC$1.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 4,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdt2.id,
                assetInIndex: 5,
                assetOutIndex: 6,
                amount: EXIT_USDT$1.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 6,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
        ];
        // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
        const limits = [
            BigNumber.from(expectedBptReturn).mul(-1).toString(),
            MaxInt256.toString(),
            '0',
            MaxInt256.toString(),
            '0',
            MaxInt256.toString(),
            '0',
        ];
        // Swap to/from Relayer
        const funds = {
            sender: this.addresses.relayer,
            recipient,
            fromInternalBalance: true,
            toInternalBalance: false,
        };
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps,
            assets,
            funds,
            limits,
            deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600),
            value: '0',
            outputReferences,
        });
        return encodedBatchSwap;
    }
    /**
     * Uses relayer to withdraw staked BPT from gauge and send to relayer
     *
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @returns withdraw call
     */
    buildWithdraw(sender, amount) {
        return Relayer.encodeGaugeWithdraw(this.addresses.staBal3.gauge, sender, this.addresses.relayer, amount);
    }
    /**
     * Uses relayer to deposit user's BPT to gauge and sends to recipient
     *
     * @param recipient Recipient address.
     * @returns deposit call
     */
    buildDeposit(recipient) {
        return Relayer.encodeGaugeDeposit(this.addresses.bbausd2.gauge, this.addresses.relayer, recipient, SWAP_RESULT_BBAUSD$1.toString());
    }
    /**
     * Uses relayer to approve itself to act in behalf of the user
     *
     * @param authorisation Encoded authorisation call.
     * @returns relayer approval call
     */
    buildSetRelayerApproval(authorisation) {
        return Relayer.encodeSetRelayerApproval(this.addresses.relayer, true, authorisation);
    }
}

const balancerRelayerInterface$2 = new Interface(balancerRelayerAbi);
const SWAP_RESULT_BBAUSD = Relayer.toChainedReference('24');
class BbaUsd1Builder {
    constructor(networkId) {
        this.addresses = ADDRESSES[networkId];
    }
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
    calldata(userAddress, bbausd1Amount, minBbausd2Out, staked, tokenBalances, authorisation) {
        if (BigNumber.from(bbausd1Amount).lte(0))
            throw new BalancerError(BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED);
        const relayer = this.addresses.relayer;
        let calls = [];
        if (authorisation) {
            calls = [this.buildSetRelayerApproval(authorisation)];
        }
        if (staked) {
            calls = [
                ...calls,
                this.buildWithdraw(userAddress, bbausd1Amount),
                this.buildSwap(bbausd1Amount, minBbausd2Out, relayer, relayer, tokenBalances),
                this.buildDeposit(userAddress),
            ];
        }
        else {
            calls = [
                ...calls,
                this.buildSwap(bbausd1Amount, minBbausd2Out, userAddress, userAddress, tokenBalances),
            ];
        }
        const callData = balancerRelayerInterface$2.encodeFunctionData('multicall', [
            calls,
        ]);
        return {
            to: this.addresses.relayer,
            data: callData,
        };
    }
    /**
     * Creates encoded batchSwap function with following swaps: boosted -> linears -> stables -> linears -> boosted
     * outputreferences should contain the amount of resulting BPT.
     *
     * @param bbausd1Amount Amount of BPT tokens to migrate.
     * @param minBbausd2Out Minimum of expected BPT out ot the migration flow.
     * @param sender Sender address.
     * @param recipient Recipient address.
     * @param tokenBalances Token balances in EVM scale.
     * @returns Encoded batchSwap call. Output references.
     */
    buildSwap(bbausd1Amount, minBbausd2Out, sender, recipient, tokenBalances) {
        const assets = [
            this.addresses.bbausd2.address,
            this.addresses.waDAI,
            this.addresses.linearDai1.address,
            this.addresses.linearDai2.address,
            this.addresses.waUSDC,
            this.addresses.linearUsdc1.address,
            this.addresses.linearUsdc2.address,
            this.addresses.waUSDT,
            this.addresses.linearUsdt1.address,
            this.addresses.linearUsdt2.address,
            this.addresses.bbausd1.address,
        ];
        const outputReferences = [{ index: 0, key: SWAP_RESULT_BBAUSD }];
        // Calculate proportional token amounts
        // Assuming 1:1 exchange rates between tokens
        // TODO: Fetch current prices, or use price or priceRate from subgraph?
        const totalLiquidity = tokenBalances.reduce((sum, tokenBalance) => sum.add(BigNumber.from(tokenBalance)), Zero);
        // bbausd1[bbausd1]blinear1[linear1]stable[linear2]blinear2[bbausd2]bbausd2 and then do that proportionally for each underlying stable.
        // Split BPT amount proportionally:
        const { assetOrder } = this.addresses.bbausd1;
        const usdcBptAmt = BigNumber.from(bbausd1Amount)
            .mul(tokenBalances[assetOrder.indexOf('bb-a-USDC')])
            .div(totalLiquidity)
            .toString();
        const daiBptAmt = BigNumber.from(bbausd1Amount)
            .mul(tokenBalances[assetOrder.indexOf('bb-a-DAI')])
            .div(totalLiquidity)
            .toString();
        const usdtBptAmt = BigNumber.from(bbausd1Amount)
            .sub(usdcBptAmt)
            .sub(daiBptAmt)
            .toString();
        const swaps = [
            {
                poolId: this.addresses.bbausd1.id,
                assetInIndex: 10,
                assetOutIndex: 2,
                amount: daiBptAmt,
                userData: '0x',
            },
            {
                poolId: this.addresses.linearDai1.id,
                assetInIndex: 2,
                assetOutIndex: 1,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearDai2.id,
                assetInIndex: 1,
                assetOutIndex: 3,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 3,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd1.id,
                assetInIndex: 10,
                assetOutIndex: 5,
                amount: usdcBptAmt,
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdc1.id,
                assetInIndex: 5,
                assetOutIndex: 4,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdc2.id,
                assetInIndex: 4,
                assetOutIndex: 6,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 6,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd1.id,
                assetInIndex: 10,
                assetOutIndex: 8,
                amount: usdtBptAmt,
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdt1.id,
                assetInIndex: 8,
                assetOutIndex: 7,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdt2.id,
                assetInIndex: 7,
                assetOutIndex: 9,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 9,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
        ];
        // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
        const limits = [
            BigNumber.from(minBbausd2Out).mul(-1).toString(),
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            bbausd1Amount, // Max in should be bbausd1 amount
        ];
        // Swap to/from Relayer
        const funds = {
            sender,
            recipient,
            fromInternalBalance: false,
            toInternalBalance: false,
        };
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps,
            assets,
            funds,
            limits,
            deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600),
            value: '0',
            outputReferences,
        });
        return encodedBatchSwap;
    }
    /**
     * Uses relayer to withdraw staked BPT from gauge and send to relayer
     *
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @returns withdraw call
     */
    buildWithdraw(sender, amount) {
        return Relayer.encodeGaugeWithdraw(this.addresses.bbausd1.gauge, sender, this.addresses.relayer, amount);
    }
    /**
     * Uses relayer to deposit user's BPT to gauge and sends to recipient
     *
     * @param recipient Recipient address.
     * @returns deposit call
     */
    buildDeposit(recipient) {
        return Relayer.encodeGaugeDeposit(this.addresses.bbausd2.gauge, this.addresses.relayer, recipient, SWAP_RESULT_BBAUSD.toString());
    }
    /**
     * Uses relayer to approve itself to act in behalf of the user
     *
     * @param authorisation Encoded authorisation call.
     * @returns relayer approval call
     */
    buildSetRelayerApproval(authorisation) {
        return Relayer.encodeSetRelayerApproval(this.addresses.relayer, true, authorisation);
    }
}

const balancerRelayerInterface$1 = new Interface(balancerRelayerAbi);
const SWAP_RESULT$1 = Relayer.toChainedReference('0');
const EXIT_RESULTS = [];
class StablesBuilder {
    constructor(networkId) {
        this.addresses = ADDRESSES[networkId];
    }
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
     * @param underlyingTokens Underlying token addresses. Array must have the same length and order as underlying tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    calldata(userAddress, from, to, bptIn, minBptOut, staked, underlyingTokens, authorisation) {
        if (staked && (from.gauge == undefined || to.gauge == undefined))
            throw new Error('Staked flow migration requires gauge addresses to be provided');
        const relayer = this.addresses.relayer;
        let calls = [];
        if (authorisation) {
            calls = [this.buildSetRelayerApproval(authorisation)];
        }
        if (staked) {
            calls = [
                ...calls,
                this.buildWithdraw(userAddress, bptIn, from.gauge),
                this.buildExit(from.id, relayer, bptIn, underlyingTokens),
                this.buildSwap(minBptOut, relayer, to.id, to.address, underlyingTokens),
                this.buildDeposit(userAddress, to.gauge),
            ];
        }
        else {
            calls = [
                ...calls,
                this.buildExit(from.id, userAddress, bptIn, underlyingTokens),
                this.buildSwap(minBptOut, userAddress, to.id, to.address, underlyingTokens),
            ];
        }
        const callData = balancerRelayerInterface$1.encodeFunctionData('multicall', [
            calls,
        ]);
        return {
            to: this.addresses.relayer,
            data: callData,
        };
    }
    /**
     * Encodes exitPool call data.
     * Exit stable pool proportionally to underlying stables. Exits to relayer.
     * Outputreferences are used to store exit amounts for next transaction.
     *
     * @param poolId Pool id.
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @param underlyingTokens Token addresses to exit to.
     * @returns Encoded exitPool call. Output references.
     */
    buildExit(poolId, sender, amount, underlyingTokens) {
        // Assume gaugeWithdraw returns same amount value
        const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);
        // Store exit outputs to be used as swaps inputs
        const outputReferences = [];
        for (let i = 0; i < underlyingTokens.length; i++) {
            outputReferences[i] = {
                index: i,
                key: Relayer.toChainedReference(`${i + 1}`), // index 0 will be used by swap result
            };
            EXIT_RESULTS.push(outputReferences[i].key);
        }
        const minAmountsOut = Array(underlyingTokens.length).fill('0');
        const callData = Relayer.constructExitCall({
            assets: underlyingTokens,
            minAmountsOut,
            userData,
            toInternalBalance: true,
            poolId,
            poolKind: 0,
            sender,
            recipient: this.addresses.relayer,
            outputReferences,
            exitPoolRequest: {},
        });
        return callData;
    }
    /**
     * Creates encoded batchSwap function to swap stables to new phantom stable pool BPT.
     * outputreferences should contain the amount of resulting BPT.
     *
     * @param expectedBptReturn BPT amount expected out of the swap.
     * @param recipient Recipient address.
     * @param poolId Pool id
     * @param poolAddress Pool address
     * @param tokens Token addresses to swap from.
     * @returns BatchSwap call.
     */
    buildSwap(expectedBptReturn, recipient, poolId, poolAddress, tokens) {
        const assets = [poolAddress, ...tokens];
        const outputReferences = [{ index: 0, key: SWAP_RESULT$1 }];
        const swaps = [];
        // Add a swap flow for each token provided
        for (let i = 0; i < tokens.length; i++) {
            swaps.push({
                poolId,
                assetInIndex: i + 1,
                assetOutIndex: 0,
                amount: EXIT_RESULTS[i].toString(),
                userData: '0x',
            });
        }
        // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
        const limits = [BigNumber.from(expectedBptReturn).mul(-1).toString()];
        for (let i = 0; i < tokens.length; i++) {
            limits.push(MaxInt256.toString());
        }
        // Swap to/from Relayer
        const funds = {
            sender: this.addresses.relayer,
            recipient,
            fromInternalBalance: true,
            toInternalBalance: false,
        };
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps,
            assets,
            funds,
            limits,
            deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600),
            value: '0',
            outputReferences,
        });
        return encodedBatchSwap;
    }
    /**
     * Uses relayer to withdraw staked BPT from gauge and send to relayer
     *
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @param gaugeAddress Gauge address.
     * @returns withdraw call
     */
    buildWithdraw(sender, amount, gaugeAddress) {
        return Relayer.encodeGaugeWithdraw(gaugeAddress, sender, this.addresses.relayer, amount);
    }
    /**
     * Uses relayer to deposit user's BPT to gauge and sends to recipient
     *
     * @param recipient Recipient address.
     * @param gaugeAddress Gauge address.
     * @returns deposit call
     */
    buildDeposit(recipient, gaugeAddress) {
        return Relayer.encodeGaugeDeposit(gaugeAddress, this.addresses.relayer, recipient, SWAP_RESULT$1.toString());
    }
    /**
     * Uses relayer to approve itself to act in behalf of the user
     *
     * @param authorisation Encoded authorisation call.
     * @returns relayer approval call
     */
    buildSetRelayerApproval(authorisation) {
        return Relayer.encodeSetRelayerApproval(this.addresses.relayer, true, authorisation);
    }
}

const balancerRelayerInterface = new Interface(balancerRelayerAbi);
const EXIT_MIMATIC = Relayer.toChainedReference('20');
const EXIT_DAI = Relayer.toChainedReference('21');
const EXIT_USDC = Relayer.toChainedReference('22');
const EXIT_USDT = Relayer.toChainedReference('23');
const SWAP_RESULT = Relayer.toChainedReference('24');
class MaiusdBuilder {
    constructor(networkId) {
        this.addresses = ADDRESSES[networkId];
    }
    /**
     * Builds migration call data.
     * Migrates tokens from maiusd to maibbausd pool.
     * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
     *
     * @param userAddress User address.
     * @param bptIn Amount of BPT tokens to migrate.
     * @param minBptOut Minimum of expected BPT out ot the migration flow.
     * @param staked Indicates whether tokens are initially staked or not.
     * @param authorisation Encoded authorisation call.
     * @returns Migration transaction request ready to send with signer.sendTransaction
     */
    calldata(userAddress, bptIn, minBptOut, staked, authorisation) {
        if (BigNumber.from(bptIn).lte(0))
            throw new BalancerError(BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED);
        const relayer = this.addresses.relayer;
        let calls = [];
        if (authorisation) {
            calls = [this.buildSetRelayerApproval(authorisation)];
        }
        if (staked) {
            calls = [
                ...calls,
                this.buildWithdraw(userAddress, bptIn),
                this.buildExit(relayer, bptIn),
                this.buildSwap(relayer, minBptOut),
                this.buildDeposit(userAddress),
            ];
        }
        else {
            calls = [
                ...calls,
                this.buildExit(userAddress, bptIn),
                this.buildSwap(userAddress, minBptOut),
            ];
        }
        const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
            calls,
        ]);
        return {
            to: relayer,
            data: callData,
        };
    }
    /**
     * Encodes exitPool callData.
     * Exit maiusd pool proportionally to underlying stables. Exits to relayer.
     * Outputreferences are used to store exit amounts for next transaction.
     *
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @returns Encoded exitPool call. Output references.
     */
    buildExit(sender, amount) {
        const { assetOrder } = this.addresses.maiusd;
        const assets = assetOrder.map((key) => this.addresses[key]);
        // Assume gaugeWithdraw returns same amount value
        const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);
        // Store exit outputs to be used as swaps inputs
        const outputReferences = [
            { index: assetOrder.indexOf('miMATIC'), key: EXIT_MIMATIC },
            { index: assetOrder.indexOf('DAI'), key: EXIT_DAI },
            { index: assetOrder.indexOf('USDC'), key: EXIT_USDC },
            { index: assetOrder.indexOf('USDT'), key: EXIT_USDT },
        ];
        const minAmountsOut = Array(assets.length).fill('0');
        const callData = Relayer.constructExitCall({
            assets,
            minAmountsOut,
            userData,
            toInternalBalance: true,
            poolId: this.addresses.maiusd.id,
            poolKind: 0,
            sender,
            recipient: this.addresses.relayer,
            outputReferences,
            exitPoolRequest: {},
        });
        return callData;
    }
    /**
     * Creates encoded batchSwap function with following swaps: stables -> linear pools -> boosted pool
     * outputreferences should contain the amount of resulting BPT.
     *
     * @param recipient Sender address.
     * @param minBptOut Minimum BPT out expected from the join transaction.
     * @returns Encoded batchSwap call. Output references.
     */
    buildSwap(recipient, minBptOut) {
        const assets = [
            this.addresses.bbausd2.address,
            this.addresses.DAI,
            this.addresses.linearDai2.address,
            this.addresses.USDC,
            this.addresses.linearUsdc2.address,
            this.addresses.USDT,
            this.addresses.linearUsdt2.address,
            this.addresses.miMATIC,
            this.addresses.maibbausd.address,
        ];
        const outputReferences = [{ index: 8, key: SWAP_RESULT }];
        const swaps = [
            {
                poolId: this.addresses.linearDai2.id,
                assetInIndex: 1,
                assetOutIndex: 2,
                amount: EXIT_DAI.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 2,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.maibbausd.id,
                assetInIndex: 0,
                assetOutIndex: 8,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdc2.id,
                assetInIndex: 3,
                assetOutIndex: 4,
                amount: EXIT_USDC.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 4,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.maibbausd.id,
                assetInIndex: 0,
                assetOutIndex: 8,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.linearUsdt2.id,
                assetInIndex: 5,
                assetOutIndex: 6,
                amount: EXIT_USDT.toString(),
                userData: '0x',
            },
            {
                poolId: this.addresses.bbausd2.id,
                assetInIndex: 6,
                assetOutIndex: 0,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.maibbausd.id,
                assetInIndex: 0,
                assetOutIndex: 8,
                amount: '0',
                userData: '0x',
            },
            {
                poolId: this.addresses.maibbausd.id,
                assetInIndex: 7,
                assetOutIndex: 8,
                amount: EXIT_MIMATIC.toString(),
                userData: '0x',
            },
        ];
        // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
        const limits = [
            '0',
            MaxInt256.toString(),
            '0',
            MaxInt256.toString(),
            '0',
            MaxInt256.toString(),
            '0',
            MaxInt256.toString(),
            BigNumber.from(minBptOut).mul(-1).toString(),
        ];
        // Swap to/from Relayer
        const funds = {
            sender: this.addresses.relayer,
            recipient,
            fromInternalBalance: true,
            toInternalBalance: false,
        };
        const encodedBatchSwap = Relayer.encodeBatchSwap({
            swapType: SwapType.SwapExactIn,
            swaps,
            assets,
            funds,
            limits,
            deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600),
            value: '0',
            outputReferences,
        });
        return encodedBatchSwap;
    }
    /**
     * Uses relayer to withdraw staked BPT from gauge and send to relayer
     *
     * @param sender Sender address.
     * @param amount Amount of BPT to exit with.
     * @returns withdraw call
     */
    buildWithdraw(sender, amount) {
        return Relayer.encodeGaugeWithdraw(this.addresses.maiusd.gauge, sender, this.addresses.relayer, amount);
    }
    /**
     * Uses relayer to deposit user's BPT to gauge and sends to recipient
     *
     * @param recipient Recipient address.
     * @returns deposit call
     */
    buildDeposit(recipient) {
        return Relayer.encodeGaugeDeposit(this.addresses.maibbausd.gauge, this.addresses.relayer, recipient, SWAP_RESULT.toString());
    }
    /**
     * Uses relayer to approve itself to act in behalf of the user
     *
     * @param authorisation Encoded authorisation call.
     * @returns relayer approval call
     */
    buildSetRelayerApproval(authorisation) {
        return Relayer.encodeSetRelayerApproval(this.addresses.relayer, true, authorisation);
    }
}

class Migrations {
    constructor(network) {
        this.network = network;
    }
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
    stabal3(userAddress, staBal3Amount, minBbausd2Out, staked, authorisation) {
        const builder = new StaBal3Builder(this.network);
        const request = builder.calldata(userAddress, staBal3Amount, minBbausd2Out, staked, authorisation);
        return {
            to: request.to,
            data: request.data,
            decode: (output, staked) => {
                let swapIndex = staked ? 2 : 1;
                if (authorisation)
                    swapIndex += 1;
                const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
                const swapDeltas = defaultAbiCoder.decode(['int256[]'], multicallResult[0][swapIndex]);
                // bbausd2AmountOut
                return swapDeltas[0][0].abs().toString();
            },
        };
    }
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
    bbaUsd(userAddress, bbausd1Amount, minBbausd2Out, staked, tokenBalances, authorisation) {
        const builder = new BbaUsd1Builder(this.network);
        const request = builder.calldata(userAddress, bbausd1Amount, minBbausd2Out, staked, tokenBalances, authorisation);
        return {
            to: request.to,
            data: request.data,
            decode: (output, staked) => {
                let swapIndex = staked ? 1 : 0;
                if (authorisation)
                    swapIndex += 1;
                const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
                const swapDeltas = defaultAbiCoder.decode(['int256[]'], multicallResult[0][swapIndex]);
                return swapDeltas[0][0].abs().toString(); // bptOut
            },
        };
    }
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
    stables(userAddress, from, to, bptIn, minBptOut, staked, underlyingTokens, authorisation) {
        const builder = new StablesBuilder(this.network);
        const request = builder.calldata(userAddress, from, to, bptIn, minBptOut, staked, underlyingTokens, authorisation);
        return {
            to: request.to,
            data: request.data,
            decode: (output, staked) => {
                let swapIndex = staked ? 2 : 1;
                if (authorisation)
                    swapIndex += 1;
                const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
                const swapDeltas = defaultAbiCoder.decode(['int256[]'], multicallResult[0][swapIndex]);
                // bbausd2AmountOut
                return swapDeltas[0][0].abs().toString();
            },
        };
    }
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
    maiusd(userAddress, bptIn, minBptOut, staked, authorisation) {
        const builder = new MaiusdBuilder(this.network);
        const request = builder.calldata(userAddress, bptIn, minBptOut, staked, authorisation);
        return {
            to: request.to,
            data: request.data,
            decode: (output, staked) => {
                let swapIndex = staked ? 2 : 1;
                if (authorisation)
                    swapIndex += 1;
                const multicallResult = defaultAbiCoder.decode(['bytes[]'], output);
                const swapDeltas = defaultAbiCoder.decode(['int256[]'], multicallResult[0][swapIndex]);
                const bptOut = swapDeltas[0][8].abs().toString();
                return bptOut;
            },
        };
    }
}

class Zaps {
    constructor(network) {
        this.network = network;
        this.migrations = new Migrations(network);
    }
}

const version$1 = "logger/5.7.0";

let _permanentCensorErrors = false;
let _censorErrors = false;
const LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
let _logLevel = LogLevels["default"];
let _globalLogger = null;
function _checkNormalize() {
    try {
        const missing = [];
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
            try {
                if ("test".normalize(form) !== "test") {
                    throw new Error("bad normalize");
                }
                ;
            }
            catch (error) {
                missing.push(form);
            }
        });
        if (missing.length) {
            throw new Error("missing " + missing.join(", "));
        }
        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error("broken implementation");
        }
    }
    catch (error) {
        return error.message;
    }
    return null;
}
const _normalizeError = _checkNormalize();
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["OFF"] = "OFF";
})(LogLevel || (LogLevel = {}));
var ErrorCode;
(function (ErrorCode) {
    ///////////////////
    // Generic Errors
    // Unknown Error
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    // Not Implemented
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    // Unsupported Operation
    //   - operation
    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Some sort of bad response from the server
    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    // Timeout
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ///////////////////
    // Operational  Errors
    // Buffer Overrun
    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
    // Numeric Fault
    //   - operation: the operation being executed
    //   - fault: the reason this faulted
    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
    ///////////////////
    // Argument Errors
    // Missing new operator to an object
    //  - name: The name of the class
    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
    // Invalid argument (e.g. value is incompatible with type) to a function:
    //   - argument: The argument name that was invalid
    //   - value: The value of the argument
    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    // Missing argument to a function:
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
    // Too many arguments
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
    ///////////////////
    // Blockchain Errors
    // Call exception
    //  - transaction: the transaction
    //  - address?: the contract address
    //  - args?: The arguments passed into the function
    //  - method?: The Solidity method signature
    //  - errorSignature?: The EIP848 error signature
    //  - errorArgs?: The EIP848 error parameters
    //  - reason: The reason (only for EIP848 "Error(string)")
    ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION";
    // Insufficient funds (< value + gasLimit * gasPrice)
    //   - transaction: the transaction attempted
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    // Nonce has already been used
    //   - transaction: the transaction attempted
    ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED";
    // The replacement fee for the transaction is too low
    //   - transaction: the transaction attempted
    ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
    // The gas limit could not be estimated
    //   - transaction: the transaction passed to estimateGas
    ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
    // The transaction was replaced by one with a higher gas price
    //   - reason: "cancelled", "replaced" or "repriced"
    //   - cancelled: true if reason == "cancelled" or reason == "replaced")
    //   - hash: original transaction hash
    //   - replacement: the full TransactionsResponse for the replacement
    //   - receipt: the receipt of the replacement
    ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
    ///////////////////
    // Interaction Errors
    // The user rejected the action, such as signing a message or sending
    // a transaction
    ErrorCode["ACTION_REJECTED"] = "ACTION_REJECTED";
})(ErrorCode || (ErrorCode = {}));
const HEX = "0123456789abcdef";
class Logger {
    constructor(version) {
        Object.defineProperty(this, "version", {
            enumerable: true,
            value: version,
            writable: false
        });
    }
    _log(logLevel, args) {
        const level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
            this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }
        if (_logLevel > LogLevels[level]) {
            return;
        }
        console.log.apply(console, args);
    }
    debug(...args) {
        this._log(Logger.levels.DEBUG, args);
    }
    info(...args) {
        this._log(Logger.levels.INFO, args);
    }
    warn(...args) {
        this._log(Logger.levels.WARNING, args);
    }
    makeError(message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
            return this.makeError("censored error", code, {});
        }
        if (!code) {
            code = Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
            params = {};
        }
        const messageDetails = [];
        Object.keys(params).forEach((key) => {
            const value = params[key];
            try {
                if (value instanceof Uint8Array) {
                    let hex = "";
                    for (let i = 0; i < value.length; i++) {
                        hex += HEX[value[i] >> 4];
                        hex += HEX[value[i] & 0x0f];
                    }
                    messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
                }
                else {
                    messageDetails.push(key + "=" + JSON.stringify(value));
                }
            }
            catch (error) {
                messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
            }
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        let url = "";
        switch (code) {
            case ErrorCode.NUMERIC_FAULT: {
                url = "NUMERIC_FAULT";
                const fault = message;
                switch (fault) {
                    case "overflow":
                    case "underflow":
                    case "division-by-zero":
                        url += "-" + fault;
                        break;
                    case "negative-power":
                    case "negative-width":
                        url += "-unsupported";
                        break;
                    case "unbound-bitwise-result":
                        url += "-unbound-result";
                        break;
                }
                break;
            }
            case ErrorCode.CALL_EXCEPTION:
            case ErrorCode.INSUFFICIENT_FUNDS:
            case ErrorCode.MISSING_NEW:
            case ErrorCode.NONCE_EXPIRED:
            case ErrorCode.REPLACEMENT_UNDERPRICED:
            case ErrorCode.TRANSACTION_REPLACED:
            case ErrorCode.UNPREDICTABLE_GAS_LIMIT:
                url = code;
                break;
        }
        if (url) {
            message += " [ See: https:/\/links.ethers.org/v5-errors-" + url + " ]";
        }
        if (messageDetails.length) {
            message += " (" + messageDetails.join(", ") + ")";
        }
        // @TODO: Any??
        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function (key) {
            error[key] = params[key];
        });
        return error;
    }
    throwError(message, code, params) {
        throw this.makeError(message, code, params);
    }
    throwArgumentError(message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
            argument: name,
            value: value
        });
    }
    assert(condition, message, code, params) {
        if (!!condition) {
            return;
        }
        this.throwError(message, code, params);
    }
    assertArgument(condition, message, name, value) {
        if (!!condition) {
            return;
        }
        this.throwArgumentError(message, name, value);
    }
    checkNormalize(message) {
        if (_normalizeError) {
            this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "String.prototype.normalize", form: _normalizeError
            });
        }
    }
    checkSafeUint53(value, message) {
        if (typeof (value) !== "number") {
            return;
        }
        if (message == null) {
            message = "value not safe";
        }
        if (value < 0 || value >= 0x1fffffffffffff) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "out-of-safe-range",
                value: value
            });
        }
        if (value % 1) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "non-integer",
                value: value
            });
        }
    }
    checkArgumentCount(count, expectedCount, message) {
        if (message) {
            message = ": " + message;
        }
        else {
            message = "";
        }
        if (count < expectedCount) {
            this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
        if (count > expectedCount) {
            this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
    }
    checkNew(target, kind) {
        if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    checkAbstract(target, kind) {
        if (target === kind) {
            this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
        }
        else if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    static globalLogger() {
        if (!_globalLogger) {
            _globalLogger = new Logger(version$1);
        }
        return _globalLogger;
    }
    static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
            this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        if (_permanentCensorErrors) {
            if (!censorship) {
                return;
            }
            this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
    }
    static setLogLevel(logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
            Logger.globalLogger().warn("invalid log level - " + logLevel);
            return;
        }
        _logLevel = level;
    }
    static from(version) {
        return new Logger(version);
    }
}
Logger.errors = ErrorCode;
Logger.levels = LogLevel;

const version = "units/5.7.0";

new Logger(version);
const names = [
    "wei",
    "kwei",
    "mwei",
    "gwei",
    "szabo",
    "finney",
    "ether",
];
function formatUnits(value, unitName) {
    if (typeof (unitName) === "string") {
        const index = names.indexOf(unitName);
        if (index !== -1) {
            unitName = 3 * index;
        }
    }
    return formatFixed$1(value, (unitName != null) ? unitName : 18);
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
const INITIAL_RATE = 145000;
const START_EPOCH_TIME = 1648465251;
const RATE_REDUCTION_TIME = 365 * 86400;
const RATE_REDUCTION_COEFFICIENT = 2 ** (1 / 4);
/**
 * Weekly BAL emissions
 *
 * @param currentTimestamp used to get the epoch
 * @returns BAL emitted in a week
 */
const weekly = (currentTimestamp = Math.round(new Date().getTime() / 1000)) => {
    const miningEpoch = Math.floor((currentTimestamp - START_EPOCH_TIME) / RATE_REDUCTION_TIME);
    const rate = INITIAL_RATE * RATE_REDUCTION_COEFFICIENT ** -miningEpoch;
    return rate;
};
/**
 * Total BAL emitted in epoch (1 year)
 *
 * @param epoch starting from 0 for the first year of emissions
 * @returns BAL emitted in epoch
 */
const total = (epoch) => {
    const weeklyRate = INITIAL_RATE * RATE_REDUCTION_COEFFICIENT ** -epoch;
    const dailyRate = weeklyRate / 7;
    return dailyRate * 365;
};
/**
 * Total BAL emitted between two timestamps
 *
 * @param start starting timestamp
 * @param end ending timestamp
 * @returns BAL emitted in period
 */
const between = (start, end) => {
    if (start < START_EPOCH_TIME) {
        throw 'start timestamp before emission schedule deployment';
    }
    if (end < start) {
        throw 'cannot finish before starting';
    }
    let totalEmissions = 0;
    const startingEpoch = Math.floor((start - START_EPOCH_TIME) / RATE_REDUCTION_TIME);
    const endingEpoch = Math.floor((end - START_EPOCH_TIME) / RATE_REDUCTION_TIME);
    for (let currentEpoch = startingEpoch; currentEpoch <= endingEpoch; currentEpoch++) {
        totalEmissions += total(currentEpoch);
    }
    // Subtract what isn't emmited within the time range
    const startingEpochEnd = START_EPOCH_TIME + RATE_REDUCTION_TIME * (startingEpoch + 1);
    const endingEpochStart = START_EPOCH_TIME + RATE_REDUCTION_TIME * endingEpoch;
    const secondsInStartingEpoch = startingEpochEnd - start;
    const secondsInEndingEpoch = end - endingEpochStart;
    totalEmissions -=
        (total(startingEpoch) * (RATE_REDUCTION_TIME - secondsInStartingEpoch)) /
            RATE_REDUCTION_TIME;
    totalEmissions -=
        (total(endingEpoch) * (RATE_REDUCTION_TIME - secondsInEndingEpoch)) /
            RATE_REDUCTION_TIME;
    return totalEmissions;
};

var emissions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    INITIAL_RATE: INITIAL_RATE,
    START_EPOCH_TIME: START_EPOCH_TIME,
    weekly: weekly,
    total: total,
    between: between
});

class ProtocolRevenue {
    constructor(repository, tokenPrices) {
        this.repository = repository;
        this.tokenPrices = tokenPrices;
    }
    async data(now = Date.now()) {
        const data = await this.repository.multicallData(now);
        const balPrice = await this.tokenPrices.find(data.balAddress);
        if (!balPrice || !balPrice.usd) {
            throw `No BAL USD price found`;
        }
        return {
            lastWeekBalRevenue: data.balAmount * parseFloat(balPrice.usd),
            lastWeekBBAUsdRevenue: data.bbAUsdAmount * data.bbAUsdPrice,
            veBalSupply: data.veBalSupply,
        };
    }
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
class PoolApr {
    constructor(pools, tokenPrices, tokenMeta, tokenYields, feeCollector, yesterdaysPools, liquidityGauges, feeDistributor) {
        this.pools = pools;
        this.tokenPrices = tokenPrices;
        this.tokenMeta = tokenMeta;
        this.tokenYields = tokenYields;
        this.feeCollector = feeCollector;
        this.yesterdaysPools = yesterdaysPools;
        this.liquidityGauges = liquidityGauges;
        this.feeDistributor = feeDistributor;
    }
    /**
     * Pool revenue via swap fees.
     * Fees and liquidity are takes from subgraph as USD floats.
     *
     * @returns APR [bsp] from fees accumulated over last 24h
     */
    async swapFees(pool) {
        // 365 * dailyFees * (1 - protocolFees) / totalLiquidity
        const last24hFees = await this.last24hFees(pool);
        const totalLiquidity = await this.totalLiquidity(pool);
        // TODO: what to do when we are missing last24hFees or totalLiquidity?
        // eg: stable phantom returns 0
        if (!last24hFees || !totalLiquidity) {
            return 0;
        }
        const dailyFees = last24hFees * (1 - (await this.protocolSwapFeePercentage()));
        const feesDailyBsp = 10000 * (dailyFees / parseFloat(totalLiquidity));
        return Math.round(365 * feesDailyBsp);
    }
    /**
     * Pool revenue from holding yield-bearing wrapped tokens.
     *
     * @param pool
     * @returns APR [bsp] from tokens contained in the pool
     */
    async tokenAprs(pool) {
        if (!pool.tokens) {
            return 0;
        }
        const totalLiquidity = await this.totalLiquidity(pool);
        // Filter out BPT: token with the same address as the pool
        // TODO: move this to data layer
        const bptFreeTokens = pool.tokens.filter((token) => {
            return token.address !== pool.address;
        });
        // Get each token APRs
        const aprs = bptFreeTokens.map(async (token) => {
            let apr = 0;
            const tokenYield = await this.tokenYields.find(token.address);
            if (tokenYield) {
                apr = tokenYield;
            }
            else {
                // Handle subpool APRs with recursive call to get the subPool APR
                const subPool = await this.pools.findBy('address', token.address);
                if (subPool) {
                    // INFO: Liquidity mining APR can't cascade to other pools
                    const subSwapFees = await this.swapFees(subPool);
                    const subtokenAprs = await this.tokenAprs(subPool);
                    apr = subSwapFees + subtokenAprs;
                }
            }
            return apr;
        });
        // Get token weights normalised by usd price
        const weights = bptFreeTokens.map(async (token) => {
            var _a, _b;
            if (token.weight) {
                return parseFloat(token.weight);
            }
            else {
                let tokenPrice = ((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd) || ((_b = (await this.tokenPrices.find(token.address))) === null || _b === void 0 ? void 0 : _b.usd);
                if (!tokenPrice) {
                    const poolToken = await this.pools.findBy('address', token.address);
                    if (poolToken) {
                        tokenPrice = (await this.bptPrice(poolToken)).toString();
                    }
                    else {
                        throw `No price for ${token.address}`;
                    }
                }
                // using floats assuming frontend purposes with low precision needs
                const tokenValue = parseFloat(token.balance) * parseFloat(tokenPrice);
                return tokenValue / parseFloat(totalLiquidity);
            }
        });
        // Normalise tokenAPRs according to weights
        const weightedAprs = await Promise.all(aprs.map(async (apr, idx) => {
            const [a, w] = await Promise.all([apr, weights[idx]]);
            return Math.round(a * w);
        }));
        // sum them up to get pool APRs
        const apr = weightedAprs.reduce((sum, apr) => sum + apr, 0);
        return apr;
    }
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
    async stakingApr(pool, boost = 1) {
        // For L2s BAL is emmited as a reward token
        if (!this.liquidityGauges || pool.chainId != 1) {
            return 0;
        }
        // Data resolving
        const gauge = await this.liquidityGauges.findBy('poolId', pool.id);
        if (!gauge) {
            return 0;
        }
        const [balPrice, bptPriceUsd] = await Promise.all([
            this.tokenPrices.find('0xba100000625a3754423978a60c9317c58a424e3d'),
            this.bptPrice(pool),
        ]);
        const balPriceUsd = parseFloat((balPrice === null || balPrice === void 0 ? void 0 : balPrice.usd) || '0');
        const now = Math.round(new Date().getTime() / 1000);
        const totalBalEmissions = between(now, now + 365 * 86400);
        const gaugeBalEmissions = totalBalEmissions * gauge.relativeWeight;
        const gaugeBalEmissionsUsd = gaugeBalEmissions * balPriceUsd;
        const gaugeSupply = (gauge.workingSupply + 0.4) / 0.4; // Only 40% of LP token staked accrue emissions, totalSupply = workingSupply * 2.5
        const gaugeSupplyUsd = gaugeSupply * bptPriceUsd;
        const gaugeBalAprBps = Math.round((boost * 10000 * gaugeBalEmissionsUsd) / gaugeSupplyUsd);
        return gaugeBalAprBps;
    }
    /**
     * Some gauges are holding tokens distributed as rewards to LPs.
     *
     * @param pool
     * @returns APR [bsp] from token rewards.
     */
    async rewardAprs(pool) {
        if (!this.liquidityGauges) {
            return { total: 0, breakdown: {} };
        }
        // Data resolving
        const gauge = await this.liquidityGauges.findBy('poolId', pool.id);
        if (!gauge ||
            !gauge.rewardTokens ||
            Object.keys(gauge.rewardTokens).length < 1) {
            return { total: 0, breakdown: {} };
        }
        const rewardTokenAddresses = Object.keys(gauge.rewardTokens);
        // Gets each tokens rate, extrapolate to a year and convert to USD
        const rewards = rewardTokenAddresses.map(async (tAddress) => {
            /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
            const data = gauge.rewardTokens[tAddress];
            return this.rewardTokenApr(tAddress, data);
        });
        // Get the gauge totalSupplyUsd
        const bptPriceUsd = await this.bptPrice(pool);
        const totalSupplyUsd = gauge.totalSupply * bptPriceUsd;
        if (totalSupplyUsd == 0) {
            return { total: 0, breakdown: {} };
        }
        const rewardTokensBreakdown = {};
        let total = 0;
        for await (const reward of Object.values(rewards)) {
            const rewardValue = reward.value / totalSupplyUsd;
            total += rewardValue;
            rewardTokensBreakdown[reward.address] = reward.value;
        }
        return {
            total: Math.round(10000 * total),
            breakdown: rewardTokensBreakdown,
        };
    }
    /**
     * 80BAL-20WETH pool is accruing protocol revenue.
     *
     * @param pool
     * @returns accrued protocol revenue as APR [bsp]
     */
    async protocolApr(pool) {
        const veBalPoolId = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';
        if (pool.id != veBalPoolId || !this.feeDistributor) {
            return 0;
        }
        const revenue = new ProtocolRevenue(this.feeDistributor, this.tokenPrices);
        const { lastWeekBalRevenue, lastWeekBBAUsdRevenue, veBalSupply } = await revenue.data();
        const bptPrice = await this.bptPrice(pool);
        if (!bptPrice) {
            throw 'bptPrice for veBal pool missing';
        }
        const dailyRevenue = (lastWeekBalRevenue + lastWeekBBAUsdRevenue) / 7;
        const apr = Math.round((10000 * (365 * dailyRevenue)) / (bptPrice * veBalSupply));
        return apr;
    }
    /**
     * Composes all sources for total pool APR.
     *
     * @returns pool APR split [bsp]
     */
    async apr(pool) {
        console.time(`APR for ${pool.id}`);
        const [swapFees, tokenAprs, minStakingApr, maxStakingApr, rewardAprs, protocolApr,] = await Promise.all([
            this.swapFees(pool),
            this.tokenAprs(pool),
            this.stakingApr(pool),
            this.stakingApr(pool, 2.5),
            this.rewardAprs(pool),
            this.protocolApr(pool),
        ]);
        console.timeEnd(`APR for ${pool.id}`);
        return {
            swapFees,
            tokenAprs,
            stakingApr: {
                min: minStakingApr,
                max: maxStakingApr,
            },
            rewardAprs,
            protocolApr,
            min: swapFees + tokenAprs + rewardAprs.total + minStakingApr,
            max: swapFees + tokenAprs + rewardAprs.total + protocolApr + maxStakingApr,
        };
    }
    // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
    // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
    async last24hFees(pool) {
        let yesterdaysPool;
        if (this.yesterdaysPools) {
            yesterdaysPool = await this.yesterdaysPools.find(pool.id);
        }
        if (!pool.totalSwapFee) {
            return 0;
        }
        if (!yesterdaysPool || !yesterdaysPool.totalSwapFee) {
            return parseFloat(pool.totalSwapFee);
        }
        return (parseFloat(pool.totalSwapFee) - parseFloat(yesterdaysPool.totalSwapFee));
    }
    /**
     * Total Liquidity based on USD token prices taken from external price feed, eg: coingecko.
     *
     * @param pool
     * @returns Pool liquidity in USD
     */
    async totalLiquidity(pool) {
        const liquidityService = new Liquidity(this.pools, this.tokenPrices);
        const liquidity = await liquidityService.getLiquidity(pool);
        return liquidity;
    }
    /**
     * BPT price as pool totalLiquidity / pool total Shares
     * Total Liquidity is calculated based on USD token prices taken from external price feed, eg: coingecko.
     *
     * @param pool
     * @returns BPT price in USD
     */
    async bptPrice(pool) {
        return (parseFloat(await this.totalLiquidity(pool)) / parseFloat(pool.totalShares));
    }
    async protocolSwapFeePercentage() {
        const fee = await this.feeCollector.find('');
        return fee ? fee : 0;
    }
    async rewardTokenApr(tokenAddress, rewardData) {
        if (rewardData.period_finish.toNumber() < Date.now() / 1000) {
            return {
                address: tokenAddress,
                value: 0,
            };
        }
        else {
            const yearlyReward = rewardData.rate.mul(86400).mul(365);
            const price = await this.tokenPrices.find(tokenAddress);
            if (price && price.usd) {
                const meta = await this.tokenMeta.find(tokenAddress);
                const decimals = (meta === null || meta === void 0 ? void 0 : meta.decimals) || 18;
                const yearlyRewardUsd = parseFloat(formatUnits(yearlyReward, decimals)) *
                    parseFloat(price.usd);
                return {
                    address: tokenAddress,
                    value: yearlyRewardUsd,
                };
            }
            else {
                throw `No USD price for ${tokenAddress}`;
            }
        }
    }
}

/**
 * Controller / use-case layer for interacting with pools data.
 */
class Pools {
    constructor(networkConfig, repositories) {
        this.networkConfig = networkConfig;
        this.repositories = repositories;
        this.aprService = new PoolApr(this.repositories.pools, this.repositories.tokenPrices, this.repositories.tokenMeta, this.repositories.tokenYields, this.repositories.feeCollector, this.repositories.yesterdaysPools, this.repositories.liquidityGauges, this.repositories.feeDistributor);
        this.liquidityService = new Liquidity(repositories.pools, repositories.tokenPrices);
    }
    dataSource() {
        // TODO: Add API data repository to data and use liveModelProvider as fallback
        return this.repositories.pools;
    }
    /**
     * Calculates APR on any pool data
     *
     * @param pool
     * @returns
     */
    async apr(pool) {
        return this.aprService.apr(pool);
    }
    /**
     * Calculates total liquidity of the pool
     *
     * @param pool
     * @returns
     */
    async liquidity(pool) {
        return this.liquidityService.getLiquidity(pool);
    }
    static wrap(pool, networkConfig) {
        const methods = PoolTypeConcerns.from(pool.poolType);
        const wrappedNativeAsset = networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase();
        return {
            ...pool,
            buildJoin: (joiner, tokensIn, amountsIn, slippage) => {
                return methods.join.buildJoin({
                    joiner,
                    pool,
                    tokensIn,
                    amountsIn,
                    slippage,
                    wrappedNativeAsset,
                });
            },
            calcPriceImpact: async (amountsIn, minBPTOut) => methods.priceImpactCalculator.calcPriceImpact(pool, amountsIn, minBPTOut),
            buildExitExactBPTIn: (exiter, bptIn, slippage, shouldUnwrapNativeAsset = false, singleTokenMaxOut) => {
                if (methods.exit.buildExitExactBPTIn) {
                    return methods.exit.buildExitExactBPTIn({
                        exiter,
                        pool,
                        bptIn,
                        slippage,
                        shouldUnwrapNativeAsset,
                        wrappedNativeAsset,
                        singleTokenMaxOut,
                    });
                }
                else {
                    throw 'ExitExactBPTIn not supported';
                }
            },
            buildExitExactTokensOut: (exiter, tokensOut, amountsOut, slippage) => methods.exit.buildExitExactTokensOut({
                exiter,
                pool,
                tokensOut,
                amountsOut,
                slippage,
                wrappedNativeAsset,
            }),
            // TODO: spotPrice fails, because it needs a subgraphType,
            // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
            // spotPrice: async (tokenIn: string, tokenOut: string) =>
            //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
            calcSpotPrice: (tokenIn, tokenOut) => methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, pool),
        };
    }
    async find(id) {
        const data = await this.dataSource().find(id);
        if (!data)
            return;
        return Pools.wrap(data, this.networkConfig);
    }
    async findBy(param, value) {
        if (param == 'id') {
            return this.find(value);
        }
        else if (param == 'address') {
            const data = await this.dataSource().findBy('address', value);
            if (!data)
                return;
            return Pools.wrap(data, this.networkConfig);
        }
        else {
            throw `search by ${param} not implemented`;
        }
    }
    async all() {
        const list = await this.dataSource().all();
        if (!list)
            return [];
        return list.map((data) => Pools.wrap(data, this.networkConfig));
    }
    async where(filter) {
        const list = await this.dataSource().where(filter);
        if (!list)
            return [];
        return list.map((data) => Pools.wrap(data, this.networkConfig));
    }
}

const gaugeControllerInterface = new Interface([
    'function gauge_relative_weight(address gauge, uint timestamp) view returns (uint)',
]);
class GaugeControllerMulticallRepository {
    constructor(multicallAddress, gaugeControllerAddress, provider) {
        this.gaugeControllerAddress = gaugeControllerAddress;
        this.multicall = Multicall(multicallAddress, provider);
    }
    async getRelativeWeights(gaugeAddresses, timestamp) {
        const payload = gaugeAddresses.map((gaugeAddress) => [
            this.gaugeControllerAddress,
            gaugeControllerInterface.encodeFunctionData('gauge_relative_weight', [
                getAddress(gaugeAddress),
                timestamp || Math.floor(Date.now() / 1000),
            ]),
        ]);
        const [, res] = await this.multicall.aggregate(payload);
        const weights = gaugeAddresses.reduce((p, a, i) => {
            p[a] || (p[a] = parseFloat(formatUnits(res[i], 18)));
            return p;
        }, {});
        return weights;
    }
}

const liquidityGaugeV5Interface = new Interface([
    'function totalSupply() view returns (uint)',
    'function working_supply() view returns (uint)',
    'function reward_count() view returns (uint)',
    'function reward_tokens(uint rewardIndex) view returns (address)',
    'function reward_data(address rewardToken) view returns (tuple(address token, address distributor, uint period_finish, uint rate, uint last_update, uint integral) data)',
]);
/**
 * A lot of code to get liquidity gauge state via RPC multicall.
 * TODO: reseach helper contracts or extend subgraph
 */
class LiquidityGaugesMulticallRepository {
    constructor(multicallAddress, chainId, provider) {
        this.chainId = chainId;
        this.multicall = Multicall(multicallAddress, provider);
    }
    async getTotalSupplies(gaugeAddresses) {
        const payload = gaugeAddresses.map((gaugeAddress) => [
            gaugeAddress,
            liquidityGaugeV5Interface.encodeFunctionData('totalSupply', []),
        ]);
        const [, res] = await this.multicall.aggregate(payload);
        // Handle 0x
        const res0x = res.map((r) => (r == '0x' ? '0x0' : r));
        const totalSupplies = gaugeAddresses.reduce((p, a, i) => {
            p[a] || (p[a] = parseFloat(formatUnits(res0x[i], 18)));
            return p;
        }, {});
        return totalSupplies;
    }
    async getWorkingSupplies(gaugeAddresses) {
        const payload = gaugeAddresses.map((gaugeAddress) => [
            gaugeAddress,
            liquidityGaugeV5Interface.encodeFunctionData('working_supply', []),
        ]);
        const [, res] = await this.multicall.aggregate(payload);
        // Handle 0x
        const res0x = res.map((r) => (r == '0x' ? '0x0' : r));
        const workingSupplies = gaugeAddresses.reduce((p, a, i) => {
            p[a] || (p[a] = parseFloat(formatUnits(res0x[i], 18)));
            return p;
        }, {});
        return workingSupplies;
    }
    async getRewardCounts(gaugeAddresses) {
        let rewardCounts;
        if (this.chainId == 1) {
            const payload = gaugeAddresses.map((gaugeAddress) => [
                gaugeAddress,
                liquidityGaugeV5Interface.encodeFunctionData('reward_count', []),
            ]);
            const [, res] = await this.multicall.aggregate(payload);
            // Handle 0x return values
            const res0x = res.map((r) => (r == '0x' ? '0x0' : r));
            rewardCounts = gaugeAddresses.reduce((p, a, i) => {
                p[a] || (p[a] = parseInt(res0x[i]));
                return p;
            }, {});
        }
        else {
            rewardCounts = gaugeAddresses.reduce((p, a) => {
                p[a] || (p[a] = 1);
                return p;
            }, {});
        }
        return rewardCounts;
    }
    async getRewardTokens(gaugeAddresses, passingRewardCounts) {
        const rewardCounts = passingRewardCounts || (await this.getRewardCounts(gaugeAddresses));
        const gaugesWithRewards = gaugeAddresses.filter((gaugeAddress) => rewardCounts[gaugeAddress] > 0);
        const startIndexes = [0];
        const payload = gaugesWithRewards
            .map((gaugeAddress, gaugeIndex) => {
            const calls = [];
            for (let i = 0; i < rewardCounts[gaugeAddress]; i++) {
                calls.push([
                    gaugeAddress,
                    liquidityGaugeV5Interface.encodeFunctionData('reward_tokens', [i]),
                ]);
            }
            startIndexes[gaugeIndex + 1] =
                startIndexes[gaugeIndex] + rewardCounts[gaugeAddress];
            return calls;
        })
            .flat();
        const [, res] = await this.multicall.aggregate(payload);
        const rewardTokens = gaugesWithRewards.reduce((p, a, i) => {
            const start = startIndexes[i];
            const end = startIndexes[i + 1];
            const tokens = [];
            for (let i = start; i < end; i++) {
                tokens.push(liquidityGaugeV5Interface.decodeFunctionResult('reward_tokens', res[i])[0]);
            }
            p[a] || (p[a] = tokens);
            return p;
        }, {});
        return rewardTokens;
    }
    async getRewardData(gaugeAddresses, passingRewardTokens) {
        const rewardTokens = passingRewardTokens || (await this.getRewardTokens(gaugeAddresses));
        const startIndexes = [0];
        const payload = Object.keys(rewardTokens)
            .map((gaugeAddress, gaugeIndex) => {
            const calls = [];
            for (let i = 0; i < rewardTokens[gaugeAddress].length; i++) {
                calls.push([
                    gaugeAddress,
                    liquidityGaugeV5Interface.encodeFunctionData('reward_data', [
                        rewardTokens[gaugeAddress][i],
                    ]),
                ]);
            }
            startIndexes[gaugeIndex + 1] =
                startIndexes[gaugeIndex] + rewardTokens[gaugeAddress].length;
            return calls;
        })
            .flat();
        const [, res] = (await this.multicall.aggregate(payload));
        const decoded = res.map((r) => liquidityGaugeV5Interface.decodeFunctionResult('reward_data', r)[0]);
        const rewardData = Object.keys(rewardTokens).reduce((p, a, i) => {
            const start = startIndexes[i];
            const data = rewardTokens[a].reduce((d, t, x) => {
                d[t] || (d[t] = decoded[start + x]);
                return d;
            }, {});
            p[a] || (p[a] = data);
            return p;
        }, {});
        return rewardData;
    }
}

/**
 * Access liquidity gauges indexed by subgraph.
 * Because we have ~100 gauges to save on repeated http calls we cache all results as `gauges` on an instance.
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges
 */
class LiquidityGaugesSubgraphRepository {
    constructor(url) {
        this.gauges = [];
        this.client = createGaugesClient(url);
    }
    async fetch() {
        const queryResult = await this.client.Pools({
            where: {
                preferentialGauge_not: null,
            },
        });
        const qauges = queryResult.pools.map((pool) => pool.preferentialGauge);
        // TODO: optionally convert subgraph type to sdk internal type
        this.gauges = qauges;
        return this.gauges;
    }
    async find(id) {
        if (this.gauges.length == 0) {
            await this.fetch();
        }
        return this.gauges.find((gauge) => gauge.id == id);
    }
    async findBy(param, value) {
        if (this.gauges.length == 0) {
            await this.fetch();
        }
        if (param == 'id') {
            return this.find(value);
        }
        else if (param == 'poolId') {
            return this.gauges.find((gauge) => gauge.poolId == value);
        }
        else if (param == 'poolAddress') {
            return this.gauges.find((gauge) => gauge.poolAddress == value);
        }
        else {
            throw `search by ${param} not implemented`;
        }
    }
}

class LiquidityGaugeSubgraphRPCProvider {
    constructor(subgraphUrl, multicallAddress, gaugeControllerAddress, chainId, provider) {
        this.chainId = chainId;
        this.workingSupplies = {};
        this.relativeWeights = {};
        this.rewardData = {};
        if (gaugeControllerAddress) {
            this.gaugeController = new GaugeControllerMulticallRepository(multicallAddress, gaugeControllerAddress, provider);
        }
        this.multicall = new LiquidityGaugesMulticallRepository(multicallAddress, chainId, provider);
        this.subgraph = new LiquidityGaugesSubgraphRepository(subgraphUrl);
    }
    async fetch() {
        console.time('fetching liquidity gauges');
        const gauges = await this.subgraph.fetch();
        const gaugeAddresses = gauges.map((g) => g.id);
        if (this.chainId == 1) {
            this.workingSupplies = await this.multicall.getWorkingSupplies(gaugeAddresses);
        }
        if (this.gaugeController) {
            this.relativeWeights = await this.gaugeController.getRelativeWeights(gaugeAddresses);
        }
        // TODO: Switch to getting rewards tokens from subgraph when indexer on polygon is fixed
        // const rewardTokens = gauges.reduce((r: { [key: string]: string[] }, g) => {
        //   r[g.id] ||= g.tokens ? g.tokens.map((t) => t.id.split('-')[0]) : [];
        //   return r;
        // }, {});
        this.rewardData = await this.multicall.getRewardData(gaugeAddresses //,
        // rewardTokens
        );
        console.timeEnd('fetching liquidity gauges');
        return gauges.map(this.compose.bind(this));
    }
    async find(id) {
        if (!this.gauges) {
            this.gauges = this.fetch();
        }
        return (await this.gauges).find((g) => g.id == id);
    }
    async findBy(attribute, value) {
        if (!this.gauges) {
            this.gauges = this.fetch();
        }
        let gauge;
        if (attribute == 'id') {
            return this.find(value);
        }
        else if (attribute == 'address') {
            return this.find(value);
        }
        else if (attribute == 'poolId') {
            gauge = (await this.gauges).find((g) => g.poolId == value);
        }
        else if (attribute == 'poolAddress') {
            gauge = (await this.gauges).find((g) => g.poolAddress == value);
        }
        else {
            throw `search by ${attribute} not implemented`;
        }
        return gauge;
    }
    compose(subgraphGauge) {
        return {
            id: subgraphGauge.id,
            address: subgraphGauge.id,
            name: subgraphGauge.symbol,
            poolId: subgraphGauge.poolId,
            poolAddress: subgraphGauge.poolAddress,
            totalSupply: parseFloat(subgraphGauge.totalSupply),
            workingSupply: this.workingSupplies[subgraphGauge.id],
            relativeWeight: this.relativeWeights[subgraphGauge.id],
            rewardTokens: this.rewardData[subgraphGauge.id],
        };
    }
}

/**
 * The fallback provider takes multiple PoolRepository's in an array and uses them in order
 * falling back to the next one if a request times out.
 *
 * This is useful for using the Balancer API while being able to fall back to the graph if it is down
 * to ensure Balancer is maximally decentralized.
 **/
class FallbackPoolRepository {
    constructor(providers, timeout = 10000) {
        this.providers = providers;
        this.timeout = timeout;
        this.currentProviderIdx = 0;
    }
    async find(id) {
        if (this.currentProviderIdx >= this.providers.length) {
            throw new Error('No working providers found');
        }
        let pool;
        try {
            pool = await Promise.race([
                this.providers[this.currentProviderIdx].find(id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), this.timeout)),
            ]);
        }
        catch (e) {
            console.error('Provider ' +
                this.currentProviderIdx +
                ' failed, falling back to next provider');
            this.currentProviderIdx++;
            pool = await this.find(id);
        }
        return pool;
    }
    async findBy(attribute, value) {
        if (this.currentProviderIdx >= this.providers.length) {
            throw new Error('No working providers found');
        }
        let pool;
        try {
            pool = await Promise.race([
                this.providers[this.currentProviderIdx].findBy(attribute, value),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), this.timeout)),
            ]);
        }
        catch (e) {
            console.error('Provider ' +
                this.currentProviderIdx +
                ' failed, falling back to next provider');
            this.currentProviderIdx++;
            pool = await this.findBy(attribute, value);
        }
        return pool;
    }
}

class StaticPoolRepository {
    constructor(pools) {
        this.pools = pools;
    }
    async find(id) {
        return this.pools.find((pool) => {
            return pool.id.toLowerCase() === id.toLowerCase();
        });
    }
    async findBy(attribute, value) {
        return this.pools.find((pool) => {
            return pool[attribute] === value;
        });
    }
    async all() {
        return this.pools;
    }
    async where(filter) {
        return (await this.all()).filter(filter);
    }
}

/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
class PoolsSubgraphRepository {
    /**
     * Repository with optional lazy loaded blockHeight
     *
     * @param url subgraph URL
     * @param chainId current network, needed for L2s logic
     * @param blockHeight lazy loading blockHeigh resolver
     */
    constructor(url, chainId, blockHeight) {
        this.chainId = chainId;
        this.blockHeight = blockHeight;
        this.client = createSubgraphClient(url);
    }
    async fetch() {
        console.time('fetching pools');
        const { pool0, pool1000 } = await this.client.Pools({
            where: { swapEnabled: true, totalShares_gt: '0' },
            orderBy: Pool_OrderBy$1.TotalLiquidity,
            orderDirection: OrderDirection$1.Desc,
            block: this.blockHeight
                ? { number: await this.blockHeight() }
                : undefined,
        });
        console.timeEnd('fetching pools');
        // TODO: how to best convert subgraph type to sdk internal type?
        return [...pool0, ...pool1000].map(this.mapType.bind(this));
    }
    async find(id) {
        return await this.findBy('id', id);
    }
    async findBy(param, value) {
        if (!this.pools) {
            this.pools = this.fetch();
        }
        return (await this.pools).find((pool) => pool[param] == value);
    }
    async all() {
        if (!this.pools) {
            this.pools = this.fetch();
        }
        return this.pools;
    }
    async where(filter) {
        if (!this.pools) {
            this.pools = this.fetch();
        }
        return (await this.pools).filter(filter);
    }
    mapType(subgraphPool) {
        return {
            id: subgraphPool.id,
            name: subgraphPool.name || '',
            address: subgraphPool.address,
            chainId: this.chainId,
            poolType: subgraphPool.poolType,
            swapFee: subgraphPool.swapFee,
            swapEnabled: subgraphPool.swapEnabled,
            amp: subgraphPool.amp || undefined,
            // owner: subgraphPool.owner,
            // factory: subgraphPool.factory,
            tokens: subgraphPool.tokens || [],
            tokensList: subgraphPool.tokensList,
            tokenAddresses: (subgraphPool.tokens || []).map((t) => t.address),
            totalLiquidity: subgraphPool.totalLiquidity,
            totalShares: subgraphPool.totalShares,
            totalSwapFee: subgraphPool.totalSwapFee,
            totalSwapVolume: subgraphPool.totalSwapVolume,
            // onchain: subgraphPool.onchain,
            createTime: subgraphPool.createTime,
            // mainTokens: subgraphPool.mainTokens,
            // wrappedTokens: subgraphPool.wrappedTokens,
            // unwrappedTokens: subgraphPool.unwrappedTokens,
            // isNew: subgraphPool.isNew,
            // volumeSnapshot: subgraphPool.volumeSnapshot,
            // feesSnapshot: subgraphPool.???, // Approximated last 24h fees
            // boost: subgraphPool.boost,
            totalWeight: subgraphPool.totalWeight || '1',
        };
    }
}

class StaticTokenProvider {
    constructor(tokens) {
        this.tokens = tokens;
    }
    async find(address) {
        return this.tokens.find((token) => {
            return token.address.toLowerCase() === address.toLowerCase();
        });
    }
    async findBy(attribute, value) {
        return this.tokens.find((token) => {
            return token[attribute] === value;
        });
    }
}

const SCALING_FACTOR = 18;
class StaticTokenPriceProvider {
    constructor(tokenPrices) {
        this.tokenPrices = tokenPrices;
        this.calculateUSDPrices();
    }
    /**
     * Iterates through all tokens and calculates USD prices
     * based on data the tokens already have.
     */
    calculateUSDPrices() {
        const USDAssets = [
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            '0xdac17f958d2ee523a2206206994597c13d831ec7',
            '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        ];
        let assetsAvailable = 0;
        let assetValueSum = BigNumber.from(0);
        USDAssets.forEach((address) => {
            const tokenPrice = this.tokenPrices[address];
            if (tokenPrice === null || tokenPrice === void 0 ? void 0 : tokenPrice.eth) {
                const scaledPrice = parseFixed(tokenPrice === null || tokenPrice === void 0 ? void 0 : tokenPrice.eth, SCALING_FACTOR);
                assetValueSum = assetValueSum.add(scaledPrice);
                assetsAvailable++;
            }
        });
        if (assetsAvailable === 0)
            return;
        const NativeAssetUSDPrice = assetValueSum.div(assetsAvailable);
        for (const token in this.tokenPrices) {
            const price = this.tokenPrices[token];
            if (price.eth && !price.usd) {
                const usdPrice = parseFixed('1', SCALING_FACTOR)
                    .mul(parseFixed(price.eth, SCALING_FACTOR))
                    .div(NativeAssetUSDPrice)
                    .toString();
                price.usd = formatFixed$1(usdPrice, SCALING_FACTOR);
            }
        }
    }
    async find(address) {
        const price = this.tokenPrices[address];
        if (!price)
            return;
        return price;
    }
    async findBy(attribute, value) {
        if (attribute != 'address') {
            return undefined;
        }
        return this.find(value);
    }
}

// can be fetched from subgraph
// aave-js: supplyAPR = graph.liquidityRate = core.getReserveCurrentLiquidityRate(_reserve)
// or directly from RPC:
// wrappedAaveToken.LENDING_POOL.getReserveCurrentLiquidityRate(mainTokenAddress)
const yieldTokens$2 = {
    waUSDT: '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58',
    waUSDC: '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de',
    waDAI: '0x02d60b84491589974263d922d9cc7a3152618ef6',
};
const wrappedTokensMap = {
    // USDT
    [yieldTokens$2.waUSDT]: {
        aToken: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
        underlying: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // USDC
    [yieldTokens$2.waUSDC]: {
        aToken: '0xbcca60bb61934080951369a648fb03df4f96263c',
        underlying: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    // DAI
    [yieldTokens$2.waDAI]: {
        aToken: '0x028171bca77440897b824ca71d1c56cac55b68a3',
        underlying: '0x6b175474e89094c44da98b954eedeac495271d0f',
    },
};
const aTokens = Object.values(wrappedTokensMap).map((t) => t.aToken);
const underlyingAssets = Object.values(wrappedTokensMap).map((t) => t.underlying);
const underlyingToWrapped = Object.fromEntries(Object.keys(wrappedTokensMap).map((wrapped) => [
    wrappedTokensMap[wrapped].underlying,
    wrapped,
]));
// Subgraph
// liquidityRate, depositors APR (in rays - 27 digits)
const endpoint = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2';
const query$1 = `
  query getReserves($aTokens: [String!], $underlyingAssets: [Bytes!]) {
    reserves(
      where: {
        aToken_in: $aTokens
        underlyingAsset_in: $underlyingAssets
        isActive: true
      }
    ) {
      underlyingAsset
      liquidityRate
    }
  }
`;
/**
 * Fetching and parsing aave APRs from a subgraph
 *
 * @returns APRs for aave tokens
 */
const aave = async () => {
    try {
        const graphqlQuery = {
            operationName: 'getReserves',
            query: query$1,
            variables: { aTokens, underlyingAssets },
        };
        const response = await axios.post(endpoint, graphqlQuery);
        const { data: { reserves }, } = response.data;
        const aprEntries = reserves.map((r) => [
            underlyingToWrapped[r.underlyingAsset],
            // Note: our assumption is frontend usage, this service is not a good source where more accuracy is needed.
            // Converting from aave ray number (27 digits) to bsp
            // essentially same as here:
            // https://github.com/aave/aave-utilities/blob/master/packages/math-utils/src/formatters/reserve/index.ts#L231
            Math.round(parseFloat(formatUnits(BigNumber.from(r.liquidityRate), 27)) * 10000),
        ]);
        return Object.fromEntries(aprEntries);
    }
    catch (error) {
        console.log(error);
        return Object.fromEntries(Object.keys(wrappedTokensMap).map((key) => [key, 0]));
    }
};
// TODO: RPC multicall
// always upto date
// const lendingPoolAddress = '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9';

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
class CoingeckoPriceRepository {
    constructor(tokenAddresses, chainId = 1) {
        this.prices = {};
        this.fetching = {};
        this.baseTokenAddresses = tokenAddresses.map((a) => a.toLowerCase());
        this.urlBase = `https://api.coingecko.com/api/v3/simple/token_price/${this.platform(chainId)}?vs_currencies=usd,eth`;
    }
    fetch(address) {
        console.time(`fetching coingecko ${address}`);
        const addresses = this.addresses(address);
        const prices = axios
            .get(this.url(addresses))
            .then(({ data }) => {
            addresses.forEach((address) => {
                delete this.fetching[address];
            });
            this.prices = {
                ...this.prices,
                ...(Object.keys(data).length == 0 ? { [address]: {} } : data),
            };
            return this.prices;
        })
            .catch((error) => {
            console.error(error);
            return this.prices;
        });
        console.timeEnd(`fetching coingecko ${address}`);
        return Object.fromEntries(addresses.map((a) => [a, prices]));
    }
    async find(address) {
        const lowercaseAddress = address.toLowerCase();
        const unwrapped = unwrapToken(lowercaseAddress);
        if (Object.keys(this.fetching).includes(unwrapped)) {
            await this.fetching[unwrapped];
        }
        else if (!Object.keys(this.prices).includes(unwrapped)) {
            this.fetching = {
                ...this.fetching,
                ...this.fetch(unwrapped),
            };
            await this.fetching[unwrapped];
        }
        return this.prices[unwrapped];
    }
    async findBy(attribute, value) {
        if (attribute != 'address') {
            return undefined;
        }
        return this.find(value);
    }
    platform(chainId) {
        switch (chainId) {
            case 1:
            case 42:
            case 31337:
                return 'ethereum';
            case 137:
                return 'polygon-pos';
            case 42161:
                return 'arbitrum-one';
        }
        return '2';
    }
    url(addresses) {
        return `${this.urlBase}&contract_addresses=${addresses.join(',')}`;
    }
    addresses(address) {
        if (this.baseTokenAddresses.includes(address)) {
            return this.baseTokenAddresses;
        }
        else {
            return [address];
        }
    }
}
const unwrapToken = (wrappedAddress) => {
    const lowercase = wrappedAddress.toLocaleLowerCase();
    if (Object.keys(wrappedTokensMap).includes(lowercase)) {
        return wrappedTokensMap[lowercase].aToken;
    }
    else {
        return lowercase;
    }
};

const feeDistributorInterface = new Interface([
    'function getTokensDistributedInWeek(address token, uint timestamp) view returns (uint)',
]);
const veBalInterface = new Interface([
    'function totalSupply() view returns (uint)',
]);
const bbAUsdInterface = new Interface([
    'function getRate() view returns (uint)',
]);
class FeeDistributorRepository {
    constructor(multicallAddress, feeDistributorAddress, balAddress, veBalAddress, bbAUsdAddress, provider) {
        this.feeDistributorAddress = feeDistributorAddress;
        this.balAddress = balAddress;
        this.veBalAddress = veBalAddress;
        this.bbAUsdAddress = bbAUsdAddress;
        this.multicall = Multicall(multicallAddress, provider);
    }
    async fetch(timestamp) {
        const previousWeek = this.getPreviousWeek(timestamp);
        const payload = [
            [
                this.feeDistributorAddress,
                feeDistributorInterface.encodeFunctionData('getTokensDistributedInWeek', [getAddress(this.balAddress), previousWeek]),
            ],
            [
                this.feeDistributorAddress,
                feeDistributorInterface.encodeFunctionData('getTokensDistributedInWeek', [getAddress(this.bbAUsdAddress), previousWeek]),
            ],
            [this.veBalAddress, veBalInterface.encodeFunctionData('totalSupply', [])],
            [this.bbAUsdAddress, bbAUsdInterface.encodeFunctionData('getRate', [])],
        ];
        const [, res] = await this.multicall.aggregate(payload);
        const data = {
            balAmount: parseFloat(formatUnits(res[0], 18)),
            bbAUsdAmount: parseFloat(formatUnits(res[1], 18)),
            veBalSupply: parseFloat(formatUnits(res[2], 18)),
            bbAUsdPrice: parseFloat(formatUnits(res[3], 18)),
            balAddress: this.balAddress,
        };
        return data;
    }
    async multicallData(timestamp) {
        if (!this.data) {
            this.data = await this.fetch(timestamp);
        }
        return this.data;
    }
    getPreviousWeek(fromTimestamp) {
        const weeksToGoBack = 1;
        const midnight = new Date(fromTimestamp);
        midnight.setUTCHours(0);
        midnight.setUTCMinutes(0);
        midnight.setUTCSeconds(0);
        midnight.setUTCMilliseconds(0);
        let daysSinceThursday = midnight.getUTCDay() - 4;
        if (daysSinceThursday < 0)
            daysSinceThursday += 7;
        daysSinceThursday = daysSinceThursday + weeksToGoBack * 7;
        return Math.floor(midnight.getTime() / 1000) - daysSinceThursday * 86400;
    }
}

const vaultInterface = new Interface([
    'function getProtocolFeesCollector() view returns (address)',
]);
const protocolFeesCollectorInterface = new Interface([
    'function getSwapFeePercentage() view returns (uint)',
]);
// Using singleton here, so subsequent calls will return the same promise
let swapFeePercentagePromise;
class FeeCollectorRepository {
    constructor(vaultAddress, provider) {
        this.provider = provider;
        this.vault = new Contract(vaultAddress, vaultInterface, this.provider);
    }
    async fetch() {
        const address = (await this.vault.getProtocolFeesCollector());
        const collector = new Contract(address, protocolFeesCollectorInterface, this.provider);
        const fees = (await collector.getSwapFeePercentage());
        return parseFloat(formatUnits(fees, 18));
    }
    async find() {
        if (!swapFeePercentagePromise) {
            swapFeePercentagePromise = this.fetch();
        }
        this.swapFeePercentage = await swapFeePercentagePromise;
        return this.swapFeePercentage;
    }
    async findBy() {
        return this.find();
    }
}

const yieldTokens$1 = {
    stETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
};
/**
 * Lido APR fetching
 *
 * @returns lido APR for stETH
 */
const lido = async () => {
    let apr = 0;
    try {
        const response = await axios.get('https://stake.lido.fi/api/apr');
        const { data: aprs } = response.data;
        apr = Math.round(parseFloat(aprs.steth) * 100);
    }
    catch (error) {
        console.error('Failed to fetch stETH APR:', error);
    }
    return {
        [yieldTokens$1.stETH]: apr,
    };
};

const yieldTokens = {
    usdcUSDplus: '0x1aafc31091d93c3ff003cff5d2d8f7ba2e728425',
    usdcUSDplus2: '0x6933ec1ca55c06a894107860c92acdfd2dd8512f',
};
/**
 * Overnight token APR fetching
 *
 * @returns cached APR for USD+
 */
const overnight = async () => {
    let bsp = 0;
    try {
        const { data: rate } = await axios.get('https://app.overnight.fi/api/balancer/week/apr');
        bsp = Math.round((parseFloat(rate) * 10000) / 100);
    }
    catch (error) {
        console.error('Failed to fetch USD+ APR:', error);
    }
    return Object.fromEntries(Object.values(yieldTokens).map((address) => [address, bsp]));
};

const yieldSourceMap = Object.fromEntries([
    ...Object.values(yieldTokens$1).map((k) => [k, lido]),
    ...Object.values(yieldTokens$2).map((k) => [k, aave]),
    ...Object.values(yieldTokens).map((k) => [k, overnight]),
]);
class TokenYieldsRepository {
    constructor(sources = yieldSourceMap) {
        this.sources = sources;
        this.yields = {};
    }
    async fetch(address) {
        const tokenYields = await this.sources[address]();
        this.yields = {
            ...this.yields,
            ...tokenYields,
        };
    }
    async find(address) {
        const lowercase = address.toLocaleLowerCase();
        if (Object.keys(this.sources).includes(lowercase) &&
            !Object.keys(this.yields).includes(lowercase)) {
            await this.fetch(address);
        }
        return this.yields[lowercase];
    }
    async findBy(attribute, value) {
        if (attribute != 'address') {
            return undefined;
        }
        return this.find(value);
    }
}

const query = (timestamp) => `{
  blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: { timestamp_gt: ${timestamp} }) {
    number
  }
}`;
const fetchBlockByTime = async (endpoint, timestamp) => {
    console.time(`fetching blocks ${timestamp}`);
    const payload = {
        query: query(timestamp),
    };
    const response = await axios.post(endpoint, payload);
    console.timeEnd(`fetching blocks ${timestamp}`);
    const { data: { blocks }, } = response.data;
    return parseInt(blocks[0].number);
};
class BlockNumberRepository {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.blocks = {};
    }
    async find(from) {
        if (from == 'dayAgo') {
            const dayAgo = `${Math.floor(Date.now() / 1000) - 86400}`;
            if (!this.blocks[dayAgo]) {
                this.blocks = {
                    ...this.blocks,
                    [dayAgo]: fetchBlockByTime(this.endpoint, dayAgo),
                };
            }
            return this.blocks[dayAgo];
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findBy(attribute = '', value = '') {
        return;
    }
}

var initialCoingeckoList = [
	{
		chainId: 1,
		address: "0x8888801af4d980682e47f1a9036e589479e835c5",
		symbol: "mph"
	},
	{
		chainId: 1,
		address: "0x27054b13b1b798b345b591a4d22e6562d47ea75a",
		symbol: "ast"
	},
	{
		chainId: 1,
		address: "0x3301ee63fb29f863f2333bd4466acb46cd8323e6",
		symbol: "akita"
	},
	{
		chainId: 1,
		address: "0x616e8bfa43f920657b3497dbf40d6b1a02d4608d",
		symbol: "aurabal"
	},
	{
		chainId: 1,
		address: "0xc0c293ce456ff0ed870add98a0828dd4d2903dbf",
		symbol: "aura"
	},
	{
		chainId: 1,
		address: "0x3472a5a71965499acd81997a54bba8d852c6e53d",
		symbol: "badger"
	},
	{
		chainId: 1,
		address: "0xba100000625a3754423978a60c9317c58a424e3d",
		symbol: "bal"
	},
	{
		chainId: 1,
		address: "0x804cdb9116a10bb78768d3252355a1b18067bf8f",
		symbol: "bb-a-dai"
	},
	{
		chainId: 1,
		address: "0x9210f1204b5a24742eba12f710636d76240df3d0",
		symbol: "bb-a-usdc"
	},
	{
		chainId: 1,
		address: "0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c",
		symbol: "bb-a-usdt"
	},
	{
		chainId: 1,
		address: "0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2",
		symbol: "bb-a-usd"
	},
	{
		chainId: 1,
		address: "0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198",
		symbol: "bank"
	},
	{
		chainId: 1,
		address: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
		symbol: "bat"
	},
	{
		chainId: 1,
		address: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
		symbol: "bico"
	},
	{
		chainId: 1,
		address: "0x799ebfabe77a6e34311eeee9825190b9ece32824",
		symbol: "btrst"
	},
	{
		chainId: 1,
		address: "0x514910771af9ca656af840dff83e8264ecf986ca",
		symbol: "link"
	},
	{
		chainId: 1,
		address: "0x3506424f91fd33084466f402d5d97f05f8e3b4af",
		symbol: "chz"
	},
	{
		chainId: 1,
		address: "0x41e5560054824ea6b0732e656e3ad64e20e94e45",
		symbol: "cvc"
	},
	{
		chainId: 1,
		address: "0xc00e94cb662c3520282e6f5717214004a7f26888",
		symbol: "comp"
	},
	{
		chainId: 1,
		address: "0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab",
		symbol: "cow"
	},
	{
		chainId: 1,
		address: "0xd533a949740bb3306d119cc777fa900ba034cd52",
		symbol: "crv"
	},
	{
		chainId: 1,
		address: "0x6b175474e89094c44da98b954eedeac495271d0f",
		symbol: "dai"
	},
	{
		chainId: 1,
		address: "0xf2051511b9b121394fa75b8f7d4e7424337af687",
		symbol: "haus"
	},
	{
		chainId: 1,
		address: "0x888888435fde8e7d4c54cab67f206e4199454c60",
		symbol: "dfx"
	},
	{
		chainId: 1,
		address: "0x798d1be841a82a273720ce31c822c61a67a601c3",
		symbol: "digg"
	},
	{
		chainId: 1,
		address: "0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c",
		symbol: "enj"
	},
	{
		chainId: 1,
		address: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72",
		symbol: "ens"
	},
	{
		chainId: 1,
		address: "0x4e15361fd6b4bb609fa63c81a2be19d873717870",
		symbol: "ftm"
	},
	{
		chainId: 1,
		address: "0x956f47f50a910163d8bf957cf5846d573e7f87ca",
		symbol: "fei"
	},
	{
		chainId: 1,
		address: "0xed1480d12be41d92f36f5f7bdd88212e381a3677",
		symbol: "fdt"
	},
	{
		chainId: 1,
		address: "0x586aa273f262909eef8fa02d90ab65f5015e0516",
		symbol: "fiat"
	},
	{
		chainId: 1,
		address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f",
		symbol: "gtc"
	},
	{
		chainId: 1,
		address: "0x900db999074d9277c5da2a43f252d74366230da0",
		symbol: "giv"
	},
	{
		chainId: 1,
		address: "0x6810e776880c02933d47db1b9fc05908e5386b96",
		symbol: "gno"
	},
	{
		chainId: 1,
		address: "0xba485b556399123261a5f9c95d413b4f93107407",
		symbol: "graviaura"
	},
	{
		chainId: 1,
		address: "0x3ec8798b81485a254928b70cda1cf0a2bb0b74d7",
		symbol: "gro"
	},
	{
		chainId: 1,
		address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
		symbol: "snx"
	},
	{
		chainId: 1,
		address: "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
		symbol: "ldo"
	},
	{
		chainId: 1,
		address: "0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d",
		symbol: "lqty"
	},
	{
		chainId: 1,
		address: "0x5f98805a4e8be255a32880fdec7f6728c6568ba0",
		symbol: "lusd"
	},
	{
		chainId: 1,
		address: "0x965d79f1a1016b574a62986e13ca8ab04dfdd15c",
		symbol: "m2"
	},
	{
		chainId: 1,
		address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
		symbol: "mkr"
	},
	{
		chainId: 1,
		address: "0xd084944d3c05cd115c09d072b9f44ba3e0e45921",
		symbol: "fold"
	},
	{
		chainId: 1,
		address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
		symbol: "matic"
	},
	{
		chainId: 1,
		address: "0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2",
		symbol: "mta"
	},
	{
		chainId: 1,
		address: "0x4b13006980acb09645131b91d259eaa111eaf5ba",
		symbol: "myc"
	},
	{
		chainId: 1,
		address: "0x333a4823466879eef910a04d473505da62142069",
		symbol: "nation"
	},
	{
		chainId: 1,
		address: "0xcfeaead4947f0705a14ec42ac3d44129e1ef3ed5",
		symbol: "note"
	},
	{
		chainId: 1,
		address: "0x967da4048cd07ab37855c090aaf366e4ce1b9f48",
		symbol: "ocean"
	},
	{
		chainId: 1,
		address: "0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5",
		symbol: "ohm"
	},
	{
		chainId: 1,
		address: "0xab846fb6c81370327e784ae7cbb6d6a6af6ff4bf",
		symbol: "pal"
	},
	{
		chainId: 1,
		address: "0xcafe001067cdef266afb7eb5a286dcfd277f3de5",
		symbol: "psp"
	},
	{
		chainId: 1,
		address: "0x68037790a0229e9ce6eaa8a99ea92964106c4703",
		symbol: "par"
	},
	{
		chainId: 1,
		address: "0x45804880de22913dafe09f4980848ece6ecbaf78",
		symbol: "paxg"
	},
	{
		chainId: 1,
		address: "0x89ab32156e46f46d02ade3fecbe5fc4243b9aaed",
		symbol: "pnt"
	},
	{
		chainId: 1,
		address: "0x9992ec3cf6a55b00978cddf2b27bc6882d88d1ec",
		symbol: "poly"
	},
	{
		chainId: 1,
		address: "0x43d4a3cd90ddd2f8f4f693170c9c8098163502ad",
		symbol: "d2d"
	},
	{
		chainId: 1,
		address: "0xeb4c2781e4eba804ce9a9803c67d0893436bb27d",
		symbol: "renbtc"
	},
	{
		chainId: 1,
		address: "0x408e41876cccdc0f92210600ef50372656052a38",
		symbol: "ren"
	},
	{
		chainId: 1,
		address: "0xfb5453340c03db5ade474b27e68b6a9c6b2823eb",
		symbol: "robot"
	},
	{
		chainId: 1,
		address: "0xd33526068d116ce69f19a9ee46f0bd304f21a51f",
		symbol: "rpl"
	},
	{
		chainId: 1,
		address: "0xae78736cd615f374d3085123a210448e74fc6393",
		symbol: "reth"
	},
	{
		chainId: 1,
		address: "0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6",
		symbol: "sbtc"
	},
	{
		chainId: 1,
		address: "0x476c5e26a75bd202a9683ffd34359c0cc15be0ff",
		symbol: "srm"
	},
	{
		chainId: 1,
		address: "0x35e78b3982e87ecfd5b3f3265b601c046cdbe232",
		symbol: "xai"
	},
	{
		chainId: 1,
		address: "0x3affcca64c2a6f4e3b6bd9c64cd2c969efd1ecbe",
		symbol: "dsla"
	},
	{
		chainId: 1,
		address: "0xf24d8651578a55b0c119b9910759a351a3458895",
		symbol: "sdbal"
	},
	{
		chainId: 1,
		address: "0x11c1a6b3ed6bb362954b29d3183cfa97a0c806aa",
		symbol: "str"
	},
	{
		chainId: 1,
		address: "0x8f693ca8d21b157107184d29d398a8d082b38b76",
		symbol: "data"
	},
	{
		chainId: 1,
		address: "0x470ebf5f030ed85fc1ed4c2d36b9dd02e77cf1b7",
		symbol: "temple"
	},
	{
		chainId: 1,
		address: "0xa36fdbbae3c9d55a1d67ee5821d53b50b63a1ab9",
		symbol: "temp"
	},
	{
		chainId: 1,
		address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
		symbol: "usdt"
	},
	{
		chainId: 1,
		address: "0x9c4a4204b79dd291d6b6571c5be8bbcd0622f050",
		symbol: "tcr"
	},
	{
		chainId: 1,
		address: "0x226f7b842e0f0120b7e194d05432b3fd14773a9d",
		symbol: "unn"
	},
	{
		chainId: 1,
		address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
		symbol: "uni"
	},
	{
		chainId: 1,
		address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		symbol: "usdc"
	},
	{
		chainId: 1,
		address: "0x81f8f0bb1cb2a06649e51913a151f0e7ef6fa321",
		symbol: "vita"
	},
	{
		chainId: 1,
		address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
		symbol: "weth"
	},
	{
		chainId: 1,
		address: "0xedb171c18ce90b633db442f2a6f72874093b49ef",
		symbol: "wampl"
	},
	{
		chainId: 1,
		address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
		symbol: "wbtc"
	},
	{
		chainId: 1,
		address: "0xf203ca1769ca8e9e8fe1da9d147db68b6c919817",
		symbol: "wncg"
	},
	{
		chainId: 1,
		address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
		symbol: "wsteth"
	},
	{
		chainId: 1,
		address: "0x79c71d3436f39ce382d0f58f1b011d88100b9d91",
		symbol: "xns"
	},
	{
		chainId: 1,
		address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
		symbol: "yfi"
	},
	{
		chainId: 1,
		address: "0xbcca60bb61934080951369a648fb03df4f96263c",
		symbol: "ausdc"
	},
	{
		chainId: 1,
		address: "0x028171bca77440897b824ca71d1c56cac55b68a3",
		symbol: "adai"
	},
	{
		chainId: 1,
		address: "0x3ed3b47dd13ec9a98b44e6204a523e766b225811",
		symbol: "ausdt"
	},
	{
		chainId: 137,
		address: "0x9c2c5fd7b07e95ee044ddeba0e97a665f142394f",
		symbol: "1inch"
	},
	{
		chainId: 137,
		address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
		symbol: "aave"
	},
	{
		chainId: 137,
		address: "0xc3fdbadc7c795ef1d6ba111e06ff8f16a20ea539",
		symbol: "addy"
	},
	{
		chainId: 137,
		address: "0xf84bd51eab957c2e7b7d646a3427c5a50848281d",
		symbol: "agar"
	},
	{
		chainId: 137,
		address: "0x033d942a6b495c4071083f4cde1f17e986fe856c",
		symbol: "aga"
	},
	{
		chainId: 137,
		address: "0x0e9b89007eee9c958c0eda24ef70723c2c93dd58",
		symbol: "amaticc"
	},
	{
		chainId: 137,
		address: "0x034b2090b579228482520c589dbd397c53fc51cc",
		symbol: "vision"
	},
	{
		chainId: 137,
		address: "0x2c89bbc92bd86f8075d1decc58c7f4e0107f286b",
		symbol: "avax"
	},
	{
		chainId: 137,
		address: "0x49690541e3f6e933a9aa3cffee6010a7bb5b72d7",
		symbol: "axiav3"
	},
	{
		chainId: 137,
		address: "0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3",
		symbol: "bal"
	},
	{
		chainId: 137,
		address: "0xdb7cb471dd0b49b29cab4a1c14d070f27216a0ab",
		symbol: "bank"
	},
	{
		chainId: 137,
		address: "0xfbdd194376de19a88118e84e279b977f165d01b8",
		symbol: "bifi"
	},
	{
		chainId: 137,
		address: "0xd6ca869a4ec9ed2c7e618062cdc45306d8dbbc14",
		symbol: "btc2x-fli-p"
	},
	{
		chainId: 137,
		address: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
		symbol: "link"
	},
	{
		chainId: 137,
		address: "0x172370d5cd63279efa6d502dab29171933a610af",
		symbol: "crv"
	},
	{
		chainId: 137,
		address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
		symbol: "dai"
	},
	{
		chainId: 137,
		address: "0x1d607faa0a51518a7728580c238d912747e71f7a",
		symbol: "data"
	},
	{
		chainId: 137,
		address: "0x85955046df4668e1dd369d2de9f3aeb98dd2a369",
		symbol: "dpi"
	},
	{
		chainId: 137,
		address: "0xe7804d91dfcde7f776c90043e03eaa6df87e6395",
		symbol: "dfx"
	},
	{
		chainId: 137,
		address: "0xf28164a485b0b2c90639e47b0f377b4a438a16b1",
		symbol: "dquick"
	},
	{
		chainId: 137,
		address: "0x45c32fa6df82ead1e2ef74d17b76547eddfaff89",
		symbol: "frax"
	},
	{
		chainId: 137,
		address: "0x50b728d8d964fd00c2d0aad81718b71311fef68a",
		symbol: "snx"
	},
	{
		chainId: 137,
		address: "0x72928d5436ff65e57f72d5566dcd3baedc649a88",
		symbol: "hdao"
	},
	{
		chainId: 137,
		address: "0x3ad707da309f3845cd602059901e39c4dcd66473",
		symbol: "eth2x-fli-p"
	},
	{
		chainId: 137,
		address: "0x4f025829c4b13df652f38abd2ab901185ff1e609",
		symbol: "ieth-fli-p"
	},
	{
		chainId: 137,
		address: "0x340f412860da7b7823df372a2b59ff78b7ae6abc",
		symbol: "imatic-fli-p"
	},
	{
		chainId: 137,
		address: "0xf287d97b6345bad3d88856b26fb7c0ab3f2c7976",
		symbol: "matic2x-fli-p"
	},
	{
		chainId: 137,
		address: "0x130ce4e4f76c2265f94a961d70618562de0bb8d2",
		symbol: "ibtc-fli-p"
	},
	{
		chainId: 137,
		address: "0x596ebe76e2db4470966ea395b0d063ac6197a8c5",
		symbol: "jrt"
	},
	{
		chainId: 137,
		address: "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4",
		symbol: "stmatic"
	},
	{
		chainId: 137,
		address: "0xf501dd45a1198c2e1b5aef5314a68b9006d842e0",
		symbol: "mta"
	},
	{
		chainId: 137,
		address: "0xeaecc18198a475c921b24b8a6c1c1f0f5f3f7ea0",
		symbol: "seed"
	},
	{
		chainId: 137,
		address: "0xfe712251173a2cd5f5be2b46bb528328ea3565e1",
		symbol: "mvi"
	},
	{
		chainId: 137,
		address: "0xa3fa99a148fa48d14ed51d610c367c61876997f1",
		symbol: "mimatic"
	},
	{
		chainId: 137,
		address: "0xa486c6bc102f409180ccb8a94ba045d39f8fc7cb",
		symbol: "nex"
	},
	{
		chainId: 137,
		address: "0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128",
		symbol: "par"
	},
	{
		chainId: 137,
		address: "0x580a84c73811e1839f75d86d75d88cca0c241ff4",
		symbol: "qi"
	},
	{
		chainId: 137,
		address: "0x831753dd7087cac61ab5644b308642cc1c33dc13",
		symbol: "quick"
	},
	{
		chainId: 137,
		address: "0xb5c064f955d8e7f38fe0460c556a72987494ee17",
		symbol: "quick"
	},
	{
		chainId: 137,
		address: "0x00e5646f60ac6fb446f621d146b6e1886f002905",
		symbol: "rai"
	},
	{
		chainId: 137,
		address: "0x431cd3c9ac9fc73644bf68bf5691f4b83f9e104f",
		symbol: "rbw"
	},
	{
		chainId: 137,
		address: "0xdbf31df14b66535af65aac99c32e9ea844e14501",
		symbol: "renbtc"
	},
	{
		chainId: 137,
		address: "0x501ace9c35e60f03a2af4d484f49f9b1efde9f40",
		symbol: "solace"
	},
	{
		chainId: 137,
		address: "0xfa68fb4628dff1028cfec22b4162fccd0d45efb6",
		symbol: "maticx"
	},
	{
		chainId: 137,
		address: "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a",
		symbol: "sushi"
	},
	{
		chainId: 137,
		address: "0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32",
		symbol: "tel"
	},
	{
		chainId: 137,
		address: "0xe6469ba6d2fd6130788e0ea9c0a0515900563b59",
		symbol: "ust"
	},
	{
		chainId: 137,
		address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
		symbol: "usdt"
	},
	{
		chainId: 137,
		address: "0x5fe2b58c013d7601147dcdd68c143a77499f5531",
		symbol: "grt"
	},
	{
		chainId: 137,
		address: "0xbbba073c31bf03b8acf7c28ef0738decf3695683",
		symbol: "sand"
	},
	{
		chainId: 137,
		address: "0x2934b36ca9a4b31e633c5be670c8c8b28b6aa015",
		symbol: "thx"
	},
	{
		chainId: 137,
		address: "0x2f800db0fdb5223b3c3f354886d907a671414a7f",
		symbol: "bct"
	},
	{
		chainId: 137,
		address: "0x2e1ad108ff1d8c782fcbbb89aad783ac49586756",
		symbol: "tusd"
	},
	{
		chainId: 137,
		address: "0x3809dcdd5dde24b37abe64a5a339784c3323c44f",
		symbol: "swap"
	},
	{
		chainId: 137,
		address: "0x7fbc10850cae055b27039af31bd258430e714c62",
		symbol: "ubt"
	},
	{
		chainId: 137,
		address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
		symbol: "usdc"
	},
	{
		chainId: 137,
		address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
		symbol: "weth"
	},
	{
		chainId: 137,
		address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
		symbol: "wmatic"
	},
	{
		chainId: 137,
		address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
		symbol: "wbtc"
	},
	{
		chainId: 137,
		address: "0x24834bbec7e39ef42f4a75eaf8e5b6486d3f0e57",
		symbol: "lunc"
	},
	{
		chainId: 137,
		address: "0xf153eff70dc0bf3b085134928daeea248d9b30d0",
		symbol: "xmark"
	},
	{
		chainId: 42161,
		address: "0x9f20de1fc9b161b34089cbeae888168b44b03461",
		symbol: "arbis"
	},
	{
		chainId: 42161,
		address: "0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8",
		symbol: "bal"
	},
	{
		chainId: 42161,
		address: "0x031d35296154279dc1984dcd93e392b1f946737b",
		symbol: "cap"
	},
	{
		chainId: 42161,
		address: "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
		symbol: "link"
	},
	{
		chainId: 42161,
		address: "0x354a6da3fcde098f8389cad84b0182725c6c91de",
		symbol: "comp"
	},
	{
		chainId: 42161,
		address: "0xf4d48ce3ee1ac3651998971541badbb9a14d7234",
		symbol: "cream"
	},
	{
		chainId: 42161,
		address: "0x11cdb42b0eb46d95f990bedd4695a6e3fa034978",
		symbol: "crv"
	},
	{
		chainId: 42161,
		address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
		symbol: "dai"
	},
	{
		chainId: 42161,
		address: "0x8038f3c971414fd1fc220ba727f2d4a0fc98cb65",
		symbol: "dht"
	},
	{
		chainId: 42161,
		address: "0xf0b5ceefc89684889e5f7e0a7775bd100fcd3709",
		symbol: "dusd"
	},
	{
		chainId: 42161,
		address: "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
		symbol: "dpx"
	},
	{
		chainId: 42161,
		address: "0x32eb7902d4134bf98a28b963d26de779af92a212",
		symbol: "rdpx"
	},
	{
		chainId: 42161,
		address: "0xc3ae0333f0f34aa734d5493276223d95b8f9cb37",
		symbol: "dxd"
	},
	{
		chainId: 42161,
		address: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
		symbol: "gmx"
	},
	{
		chainId: 42161,
		address: "0xa0b862f60edef4452f25b4160f177db44deb6cf1",
		symbol: "gno"
	},
	{
		chainId: 42161,
		address: "0xb965029343d55189c25a7f3e0c9394dc0f5d41b1",
		symbol: "ndx"
	},
	{
		chainId: 42161,
		address: "0x539bde0d7dbd336b79148aa742883198bbf60342",
		symbol: "magic"
	},
	{
		chainId: 42161,
		address: "0x4e352cf164e64adcbad318c3a1e222e9eba4ce42",
		symbol: "mcb"
	},
	{
		chainId: 42161,
		address: "0x3f56e0c36d275367b8c502090edf38289b3dea0d",
		symbol: "mimatic"
	},
	{
		chainId: 42161,
		address: "0x965772e0e9c84b6f359c8597c891108dcf1c5b1a",
		symbol: "pickle"
	},
	{
		chainId: 42161,
		address: "0x6694340fc020c5e6b96567843da2df01b2ce1eb6",
		symbol: "stg"
	},
	{
		chainId: 42161,
		address: "0xd4d42f0b6def4ce0383636770ef773390d85c61a",
		symbol: "sushi"
	},
	{
		chainId: 42161,
		address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
		symbol: "usdt"
	},
	{
		chainId: 42161,
		address: "0x23a941036ae778ac51ab04cea08ed6e2fe103614",
		symbol: "grt"
	},
	{
		chainId: 42161,
		address: "0xa72159fc390f0e3c6d415e658264c7c4051e9b87",
		symbol: "tcr"
	},
	{
		chainId: 42161,
		address: "0x4d15a3a2286d883af0aa1b3f21367843fac63e07",
		symbol: "tusd"
	},
	{
		chainId: 42161,
		address: "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
		symbol: "uni"
	},
	{
		chainId: 42161,
		address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
		symbol: "usdc"
	},
	{
		chainId: 42161,
		address: "0xa684cd057951541187f288294a1e1c2646aa2d24",
		symbol: "vsta"
	},
	{
		chainId: 42161,
		address: "0x64343594ab9b56e99087bfa6f2335db24c2d1f17",
		symbol: "vst"
	},
	{
		chainId: 42161,
		address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
		symbol: "weth"
	},
	{
		chainId: 42161,
		address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
		symbol: "wbtc"
	},
	{
		chainId: 42161,
		address: "0x82e3a8f066a6989666b031d916c43672085b1582",
		symbol: "yfi"
	}
];

class Data {
    constructor(networkConfig, provider) {
        this.pools = new PoolsSubgraphRepository(networkConfig.urls.subgraph, networkConfig.chainId);
        // 🚨 yesterdaysPools is used to calculate swapFees accumulated over last 24 hours
        // TODO: find a better data source for that, eg: maybe DUNE once API is available
        if (networkConfig.urls.blockNumberSubgraph) {
            this.blockNumbers = new BlockNumberRepository(networkConfig.urls.blockNumberSubgraph);
            const blockDayAgo = async () => {
                if (this.blockNumbers) {
                    return await this.blockNumbers.find('dayAgo');
                }
            };
            this.yesterdaysPools = new PoolsSubgraphRepository(networkConfig.urls.subgraph, networkConfig.chainId, blockDayAgo);
        }
        const tokenAddresses = initialCoingeckoList
            .filter((t) => t.chainId == networkConfig.chainId)
            .map((t) => t.address);
        this.tokenPrices = new CoingeckoPriceRepository(tokenAddresses, networkConfig.chainId);
        this.tokenMeta = new StaticTokenProvider([]);
        if (networkConfig.urls.gaugesSubgraph) {
            this.liquidityGauges = new LiquidityGaugeSubgraphRPCProvider(networkConfig.urls.gaugesSubgraph, networkConfig.addresses.contracts.multicall, networkConfig.addresses.contracts.gaugeController || '', networkConfig.chainId, provider);
        }
        if (networkConfig.addresses.contracts.feeDistributor &&
            networkConfig.addresses.tokens.bal &&
            networkConfig.addresses.tokens.veBal &&
            networkConfig.addresses.tokens.bbaUsd) {
            this.feeDistributor = new FeeDistributorRepository(networkConfig.addresses.contracts.multicall, networkConfig.addresses.contracts.feeDistributor, networkConfig.addresses.tokens.bal, networkConfig.addresses.tokens.veBal, networkConfig.addresses.tokens.bbaUsd, provider);
        }
        this.feeCollector = new FeeCollectorRepository(networkConfig.addresses.contracts.vault, provider);
        this.tokenYields = new TokenYieldsRepository();
    }
}

class BalancerSDK {
    constructor(config, sor = new Sor(config), subgraph = new Subgraph(config)) {
        this.config = config;
        this.sor = sor;
        this.subgraph = subgraph;
        this.networkConfig = getNetworkConfig(config);
        this.data = new Data(this.networkConfig, sor.provider);
        this.swaps = new Swaps(this.config);
        this.relayer = new Relayer(this.swaps);
        this.pricing = new Pricing(config, this.swaps);
        this.pools = new Pools(this.networkConfig, this.data);
        this.balancerContracts = new Contracts(this.networkConfig.addresses.contracts, sor.provider);
        this.zaps = new Zaps(this.networkConfig.chainId);
    }
    get rpcProvider() {
        return this.sor.provider;
    }
    /**
     * Expose balancer contracts, e.g. Vault, LidoRelayer.
     */
    get contracts() {
        return this.balancerContracts.contracts;
    }
}

export { AaveHelpers, AssetHelpers, BalancerError, BalancerErrorCode, BalancerErrors, BalancerMinterAuthorization, BalancerSDK, BlockNumberRepository, CoingeckoPriceRepository, Data, FallbackPoolRepository, FeeCollectorRepository, FeeDistributorRepository, GaugeControllerMulticallRepository, Liquidity, LiquidityGaugeSubgraphRPCProvider, LiquidityGaugesMulticallRepository, LiquidityGaugesSubgraphRepository, ManagedPoolEncoder, Network, PoolBalanceOpKind, PoolSpecialization, PoolType, Pools, PoolsSubgraphRepository, Relayer, RelayerAction, RelayerAuthorization, Sor, StablePhantomPoolJoinKind$1 as StablePhantomPoolJoinKind, StablePoolEncoder, StablePoolExitKind, StablePoolJoinKind, StaticPoolRepository, StaticTokenPriceProvider, StaticTokenProvider, Subgraph, SwapType, Swaps, TokenYieldsRepository, UserBalanceOpKind, WeightedPoolEncoder, WeightedPoolExitKind, WeightedPoolJoinKind, accountToAddress, emissions as balEmissions, getLimitsForSlippage, getPoolAddress, getPoolNonce, getPoolSpecialization, isNormalizedWeights, isSameAddress, parsePoolInfo, signPermit, splitPoolId, toNormalizedWeights, tokensToTokenPrices };
//# sourceMappingURL=index.esm.js.map
