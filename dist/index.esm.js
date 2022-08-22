import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { WeiPerEther, Zero, MaxUint256, AddressZero, MaxInt256 } from '@ethersproject/constants';
import { BigNumber, parseFixed as parseFixed$1, formatFixed } from '@ethersproject/bignumber';
import { getAddress } from '@ethersproject/address';
import { hexZeroPad, hexValue, splitSignature } from '@ethersproject/bytes';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import OldBigNumber from 'bignumber.js';
import require$$0, { GraphQLClient } from 'graphql-request';
import { Vault__factory, LidoRelayer__factory } from '@balancer-labs/typechain';
import { StablePool as StablePool$1, ZERO, WeightedMaths, WeightedPool as WeightedPool$1, MetaStablePool, PhantomStablePool, LinearPool, SwapTypes, PoolFilter, SOR, parseToPoolsDict, getSpotPriceAfterSwapForPath } from '@balancer-labs/sor';
export { PoolFilter, RouteProposer, SOR, SwapTypes, formatSequence, getTokenAddressesForSwap, parseToPoolsDict, phantomStableBPTForTokensZeroPriceImpact, queryBatchSwapTokensIn, queryBatchSwapTokensOut, stableBPTForTokensZeroPriceImpact, weightedBPTForTokensZeroPriceImpact } from '@balancer-labs/sor';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parse } from 'graphql';
import { set, parseInt as parseInt$1, keyBy, sum } from 'lodash';
import axios from 'axios';

var StablePoolJoinKind;
(function (StablePoolJoinKind) {
    StablePoolJoinKind[StablePoolJoinKind["INIT"] = 0] = "INIT";
    StablePoolJoinKind[StablePoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
    StablePoolJoinKind[StablePoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
})(StablePoolJoinKind || (StablePoolJoinKind = {}));
var StablePhantomPoolJoinKind;
(function (StablePhantomPoolJoinKind) {
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["INIT"] = 0] = "INIT";
    StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["COLLECT_PROTOCOL_FEES"] = 1] = "COLLECT_PROTOCOL_FEES";
})(StablePhantomPoolJoinKind || (StablePhantomPoolJoinKind = {}));
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
StablePoolEncoder.joinCollectProtocolFees = () => defaultAbiCoder.encode(['uint256'], [StablePhantomPoolJoinKind.COLLECT_PROTOCOL_FEES]);
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

const AMP_PRECISION = 3; // number of decimals -> precision 1000
/**
 * Parse pool info into EVM amounts
 * @param {Pool}  pool
 * @returns       parsed pool info
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const parsePoolInfo = (pool) => {
    const parsedTokens = pool.tokens.map((token) => token.address);
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
        ? parseFixed$1(pool.amp, AMP_PRECISION).toString() // Solidity maths uses precison method for amp that must be replicated
        : undefined;
    const parsedTotalShares = parseFixed$1(pool.totalShares, 18).toString();
    const parsedSwapFee = parseFixed$1(pool.swapFee, 18).toString();
    return {
        parsedTokens,
        parsedBalances,
        parsedWeights,
        parsedPriceRates,
        parsedAmp,
        parsedTotalShares,
        parsedSwapFee,
    };
};

const isSameAddress = (address1, address2) => getAddress(address1) === getAddress(address2);

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
    PoolType["MetaStable"] = "MetaStable";
    PoolType["StablePhantom"] = "StablePhantom";
    PoolType["LiquidityBootstrapping"] = "LiquidityBootstrapping";
    PoolType["AaveLinear"] = "AaveLinear";
    PoolType["ERC4626Linear"] = "ERC4626Linear";
    PoolType["Element"] = "Element";
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

var Network;
(function (Network) {
    Network[Network["MAINNET"] = 1] = "MAINNET";
    Network[Network["ROPSTEN"] = 3] = "ROPSTEN";
    Network[Network["RINKEBY"] = 4] = "RINKEBY";
    Network[Network["GOERLI"] = 5] = "GOERLI";
    Network[Network["G\u00D6RLI"] = 5] = "G\u00D6RLI";
    Network[Network["KOVAN"] = 42] = "KOVAN";
    Network[Network["POLYGON"] = 137] = "POLYGON";
    Network[Network["ARBITRUM"] = 42161] = "ARBITRUM";
})(Network || (Network = {}));

function parseFixed(value, decimals) {
    const valueWithTrimmedDecimals = new RegExp(`[0-9]+\\.?[0-9]{0,${decimals}}`);
    const result = value.match(valueWithTrimmedDecimals);
    let parsedValue = value;
    if (result) {
        parsedValue = result[0];
    }
    return parseFixed$1(parsedValue, decimals);
}

class StablePoolExit {
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

var src = {};

var stable = {};

var subgraph = {};

Object.defineProperty(subgraph, "__esModule", { value: true });
subgraph.getPool = void 0;
const graphql_request_1 = require$$0;
const getPool = async (poolId, blockNumber, testnet) => {
    const data = `
    id
    address
    poolType
    swapFee
    totalShares
    amp
    tokens {
      id
      address
      symbol
      balance
      decimals
      weight
    }
  `;
    let query;
    if (blockNumber) {
        query = graphql_request_1.gql `
      query getPool($poolId: ID!, $blockNumber: Int!) {
        pools(where: { id: $poolId }, block: { number: $blockNumber }) {
          ${data}
        }
      }
    `;
    }
    else {
        query = graphql_request_1.gql `
      query getPool($poolId: ID!) {
        pools(where: { id: $poolId }) {
          ${data}
        }
      }
    `;
    }
    const result = await graphql_request_1.request(testnet
        ? "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2"
        : "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2", query, { poolId, blockNumber });
    if (result && result.pools && result.pools.length) {
        return result.pools[0];
    }
    return null;
};
subgraph.getPool = getPool;

var bigNumber = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaleAll = exports.scale = exports.bn = void 0;
const bignumber_js_1 = OldBigNumber;
bignumber_js_1.BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: 1,
    DECIMAL_PLACES: 18,
});
exports.default = bignumber_js_1.BigNumber;
const bn = (value) => new bignumber_js_1.BigNumber(value);
exports.bn = bn;
const scale = (value, decimalPlaces) => exports.bn(value).times(exports.bn(10).pow(decimalPlaces));
exports.scale = scale;
const scaleAll = (values, decimalPlaces) => values.map((x) => exports.scale(x, decimalPlaces));
exports.scaleAll = scaleAll;
}(bigNumber));

var common = {};

(function (exports) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.shallowCopyAll = exports.shallowCopy = void 0;
const shallowCopy = (obj) => {
    return Object.assign({}, obj);
};
exports.shallowCopy = shallowCopy;
const shallowCopyAll = (objs) => {
    return objs.map(exports.shallowCopy);
};
exports.shallowCopyAll = shallowCopyAll;
}(common));

var base = {};

var math$5 = {};

(function (exports) {
// Ported from Solidity:
// https://github.com/balancer-labs/balancer-v2-monorepo/blob/ce70f7663e0ac94b25ed60cb86faaa8199fd9e13/pkg/solidity-utils/contracts/math/Math.sol
Object.defineProperty(exports, "__esModule", { value: true });
exports.divUp = exports.divDown = exports.div = exports.mul = exports.min = exports.max = exports.sub = exports.add = exports.TWO = exports.ONE = exports.ZERO = void 0;
const big_number_1 = bigNumber;
exports.ZERO = big_number_1.bn(0);
exports.ONE = big_number_1.bn(1);
exports.TWO = big_number_1.bn(2);
const add = (a, b) => {
    return a.plus(b);
};
exports.add = add;
const sub = (a, b) => {
    if (b.gt(a)) {
        throw new Error("SUB_OVERFLOW");
    }
    return a.minus(b);
};
exports.sub = sub;
const max = (a, b) => {
    return a.gte(b) ? a : b;
};
exports.max = max;
const min = (a, b) => {
    return a.lt(b) ? a : b;
};
exports.min = min;
const mul = (a, b) => {
    return a.times(b);
};
exports.mul = mul;
const div = (a, b, roundUp) => {
    return roundUp ? exports.divUp(a, b) : exports.divDown(a, b);
};
exports.div = div;
const divDown = (a, b) => {
    if (b.isZero()) {
        throw new Error("ZERO_DIVISION");
    }
    return a.idiv(b);
};
exports.divDown = divDown;
const divUp = (a, b) => {
    if (b.isZero()) {
        throw new Error("ZERO_DIVISION");
    }
    return a.isZero() ? exports.ZERO : exports.ONE.plus(a.minus(exports.ONE).idiv(b));
};
exports.divUp = divUp;
}(math$5));

Object.defineProperty(base, "__esModule", { value: true });
const big_number_1$3 = bigNumber;
const math$4 = math$5;
class BasePool {
    // ---------------------- Constructor ----------------------
    constructor(params) {
        this.MIN_SWAP_FEE_PERCENTAGE = big_number_1$3.bn("0.000001"); // 0.0001%
        this.MAX_SWAP_FEE_PERCENTAGE = big_number_1$3.bn("0.1"); // 10%
        this._query = false;
        this._id = params.id;
        this._address = params.address;
        this._bptTotalSupply = params.bptTotalSupply;
        this.setSwapFeePercentage(params.swapFeePercentage);
        if (params.query) {
            this._query = params.query;
        }
    }
    // ---------------------- Getters ----------------------
    get id() {
        return this._id;
    }
    get address() {
        return this._address;
    }
    get bptTotalSupply() {
        return this._bptTotalSupply;
    }
    get swapFeePercentage() {
        return this._swapFeePercentage;
    }
    get query() {
        return this._query;
    }
    // ---------------------- Setters ----------------------
    setSwapFeePercentage(swapFeePercentage) {
        if (big_number_1$3.bn(swapFeePercentage).lt(this.MIN_SWAP_FEE_PERCENTAGE)) {
            throw new Error("MIN_SWAP_FEE_PERCENTAGE");
        }
        if (big_number_1$3.bn(swapFeePercentage).gt(this.MAX_SWAP_FEE_PERCENTAGE)) {
            throw new Error("MAX_SWAP_FEE_PERCENTAGE");
        }
        this._swapFeePercentage = swapFeePercentage;
    }
    setQuery(query) {
        this._query = query;
    }
    // ---------------------- Internal ----------------------
    _upScale(amount, decimals) {
        return math$4.mul(big_number_1$3.scale(amount, decimals), big_number_1$3.bn(10).pow(18 - decimals));
    }
    _downScaleDown(amount, decimals) {
        return big_number_1$3.scale(math$4.divDown(big_number_1$3.bn(amount), big_number_1$3.bn(10).pow(18 - decimals)), -decimals);
    }
    _downScaleUp(amount, decimals) {
        return big_number_1$3.scale(math$4.divUp(big_number_1$3.bn(amount), big_number_1$3.bn(10).pow(18 - decimals)), -decimals);
    }
}
base.default = BasePool;

var math$3 = {};

var fixedPoint = {};

var logExp = {};

(function (exports) {
// Ported from Solidity:
// https://github.com/balancer-labs/balancer-core-v2/blob/70843e6a61ad11208c1cfabf5cfe15be216ca8d3/pkg/solidity-utils/contracts/math/LogExpMath.sol
Object.defineProperty(exports, "__esModule", { value: true });
exports.ln = exports.log = exports.exp = exports.pow = void 0;
const big_number_1 = bigNumber;
// All fixed point multiplications and divisions are inlined
// This means we need to divide by ONE when multiplying two numbers, and multiply by ONE when dividing them
// All arguments and return values are 18 decimal fixed point numbers
const ONE_18 = big_number_1.bn("1000000000000000000"); // 1e18
// Internally, intermediate values are computed with higher precision as 20 decimal fixed point numbers, and in the case of ln36, 36 decimals
const ONE_20 = big_number_1.bn("100000000000000000000"); // 1e20
const ONE_36 = big_number_1.bn("1000000000000000000000000000000000000"); // 1e36
// The domain of natural exponentiation is bound by the word size and number of decimals used
// Because internally the result will be stored using 20 decimals, the largest possible result is
// (2^255 - 1) / 10^20, which makes the largest exponent ln((2^255 - 1) / 10^20) = 130.700829182905140221
// The smallest possible result is 10^(-18), which makes largest negative argument
// ln(10^(-18)) = -41.446531673892822312.
// We use 130.0 and -41.0 to have some safety margin
const MAX_NATURAL_EXPONENT = big_number_1.bn("130000000000000000000"); // 130e18
const MIN_NATURAL_EXPONENT = big_number_1.bn("-41000000000000000000"); // (-41)e18
// Bounds for ln_36's argument
// Both ln(0.9) and ln(1.1) can be represented with 36 decimal places in a fixed point 256 bit integer
const LN_36_LOWER_BOUND = ONE_18.minus(big_number_1.bn("100000000000000000")); // 1e18 - 1e17
const LN_36_UPPER_BOUND = ONE_18.plus(big_number_1.bn("100000000000000000")); // 1e18 + 1e17
const MILD_EXPONENT_BOUND = big_number_1.bn(2).pow(254).idiv(ONE_20);
// 18 decimal constants
const x0 = big_number_1.bn("128000000000000000000"); // 2ˆ7
const a0 = big_number_1.bn("38877084059945950922200000000000000000000000000000000000"); // eˆ(x0) (no decimals)
const x1 = big_number_1.bn("64000000000000000000"); // 2ˆ6
const a1 = big_number_1.bn("6235149080811616882910000000"); // eˆ(x1) (no decimals)
// 20 decimal constants
const x2 = big_number_1.bn("3200000000000000000000"); // 2ˆ5
const a2 = big_number_1.bn("7896296018268069516100000000000000"); // eˆ(x2)
const x3 = big_number_1.bn("1600000000000000000000"); // 2ˆ4
const a3 = big_number_1.bn("888611052050787263676000000"); // eˆ(x3)
const x4 = big_number_1.bn("800000000000000000000"); // 2ˆ3
const a4 = big_number_1.bn("298095798704172827474000"); // eˆ(x4)
const x5 = big_number_1.bn("400000000000000000000"); // 2ˆ2
const a5 = big_number_1.bn("5459815003314423907810"); // eˆ(x5)
const x6 = big_number_1.bn("200000000000000000000"); // 2ˆ1
const a6 = big_number_1.bn("738905609893065022723"); // eˆ(x6)
const x7 = big_number_1.bn("100000000000000000000"); // 2ˆ0
const a7 = big_number_1.bn("271828182845904523536"); // eˆ(x7)
const x8 = big_number_1.bn("50000000000000000000"); // 2ˆ(-1)
const a8 = big_number_1.bn("164872127070012814685"); // eˆ(x8)
const x9 = big_number_1.bn("25000000000000000000"); // 2ˆ(-2)
const a9 = big_number_1.bn("128402541668774148407"); // eˆ(x9)
const x10 = big_number_1.bn("12500000000000000000"); // 2ˆ(-3)
const a10 = big_number_1.bn("113314845306682631683"); // eˆ(x10)
const x11 = big_number_1.bn("6250000000000000000"); // 2ˆ(-4)
const a11 = big_number_1.bn("106449445891785942956"); // eˆ(x11)
const pow = (x, y) => {
    if (y.isZero()) {
        // We solve the 0^0 indetermination by making it equal one.
        return ONE_18;
    }
    if (x.isZero()) {
        return big_number_1.bn(0);
    }
    // Instead of computing x^y directly, we instead rely on the properties of logarithms and exponentiation to
    // arrive at that result. In particular, exp(ln(x)) = x, and ln(x^y) = y * ln(x). This means
    // x^y = exp(y * ln(x)).
    // The ln function takes a signed value, so we need to make sure x fits in the signed 256 bit range.
    if (x.gte(big_number_1.bn(2).pow(255))) {
        throw new Error("X_OUT_OF_BOUNDS");
    }
    // We will compute y * ln(x) in a single step. Depending on the value of x, we can either use ln or ln_36. In
    // both cases, we leave the division by ONE_18 (due to fixed point multiplication) to the end.
    // This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 256 bit range.
    if (y.gte(MILD_EXPONENT_BOUND)) {
        throw new Error("Y_OUT_OF_BOUNDS");
    }
    let logx_times_y;
    if (LN_36_LOWER_BOUND.lt(x) && x.lt(LN_36_UPPER_BOUND)) {
        let ln_36_x = _ln_36(x);
        // ln_36_x has 36 decimal places, so multiplying by y_int256 isn't as straightforward, since we can't just
        // bring y_int256 to 36 decimal places, as it might overflow. Instead, we perform two 18 decimal
        // multiplications and add the results: one with the first 18 decimals of ln_36_x, and one with the
        // (downscaled) last 18 decimals.
        logx_times_y = ln_36_x
            .idiv(ONE_18)
            .times(y)
            .plus(ln_36_x.mod(ONE_18).times(y).idiv(ONE_18));
    }
    else {
        logx_times_y = _ln(x).times(y);
    }
    logx_times_y = logx_times_y.idiv(ONE_18);
    // Finally, we compute exp(y * ln(x)) to arrive at x^y
    if (logx_times_y.lt(MIN_NATURAL_EXPONENT) ||
        logx_times_y.gt(MAX_NATURAL_EXPONENT)) {
        throw new Error("PRODUCT_OUT_OF_BOUNDS");
    }
    return exports.exp(logx_times_y);
};
exports.pow = pow;
const exp = (x) => {
    if (x.lt(MIN_NATURAL_EXPONENT) || x.gt(MAX_NATURAL_EXPONENT)) {
        throw new Error("INVALID_EXPONENT");
    }
    if (x.lt(0)) {
        // We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
        // fits in the signed 256 bit range (as it is larger than MIN_NATURAL_EXPONENT).
        // Fixed point division requires multiplying by ONE_18.
        return ONE_18.times(ONE_18).idiv(exports.exp(x.negated()));
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
    if (x.gte(x0)) {
        x = x.minus(x0);
        firstAN = a0;
    }
    else if (x.gte(x1)) {
        x = x.minus(x1);
        firstAN = a1;
    }
    else {
        firstAN = big_number_1.bn(1); // One with no decimal places
    }
    // We now transform x into a 20 decimal fixed point number, to have enhanced precision when computing the
    // smaller terms.
    x = x.times(100);
    // `product` is the accumulated product of all a_n (except a0 and a1), which starts at 20 decimal fixed point
    // one. Recall that fixed point multiplication requires dividing by ONE_20.
    let product = ONE_20;
    if (x.gte(x2)) {
        x = x.minus(x2);
        product = product.times(a2).idiv(ONE_20);
    }
    if (x.gte(x3)) {
        x = x.minus(x3);
        product = product.times(a3).idiv(ONE_20);
    }
    if (x.gte(x4)) {
        x = x.minus(x4);
        product = product.times(a4).idiv(ONE_20);
    }
    if (x.gte(x5)) {
        x = x.minus(x5);
        product = product.times(a5).idiv(ONE_20);
    }
    if (x.gte(x6)) {
        x = x.minus(x6);
        product = product.times(a6).idiv(ONE_20);
    }
    if (x.gte(x7)) {
        x = x.minus(x7);
        product = product.times(a7).idiv(ONE_20);
    }
    if (x.gte(x8)) {
        x = x.minus(x8);
        product = product.times(a8).idiv(ONE_20);
    }
    if (x.gte(x9)) {
        x = x.minus(x9);
        product = product.times(a9).idiv(ONE_20);
    }
    // x10 and x11 are unnecessary here since we have high enough precision already.
    // Now we need to compute e^x, where x is small (in particular, it is smaller than x9). We use the Taylor series
    // expansion for e^x: 1 + x + (x^2 / 2!) + (x^3 / 3!) + ... + (x^n / n!).
    let seriesSum = ONE_20; // The initial one in the sum, with 20 decimal places.
    let term; // Each term in the sum, where the nth term is (x^n / n!).
    // The first term is simply x.
    term = x;
    seriesSum = seriesSum.plus(term);
    // Each term (x^n / n!) equals the previous one times x, divided by n. Since x is a fixed point number,
    // multiplying by it requires dividing by ONE_20, but dividing by the non-fixed point n values does not.
    term = term.times(x).idiv(ONE_20).idiv(2);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(3);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(4);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(5);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(6);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(7);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(8);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(9);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(10);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(11);
    seriesSum = seriesSum.plus(term);
    term = term.times(x).idiv(ONE_20).idiv(12);
    seriesSum = seriesSum.plus(term);
    // 12 Taylor terms are sufficient for 18 decimal precision.
    // We now have the first a_n (with no decimals), and the product of all other a_n present, and the Taylor
    // approximation of the exponentiation of the remainder (both with 20 decimals). All that remains is to multiply
    // all three (one 20 decimal fixed point multiplication, dividing by ONE_20, and one integer multiplication),
    // and then drop two digits to return an 18 decimal value.
    return product.times(seriesSum).idiv(ONE_20).times(firstAN).idiv(100);
};
exports.exp = exp;
const log = (arg, base) => {
    // This performs a simple base change: log(arg, base) = ln(arg) / ln(base).
    // Both logBase and logArg are computed as 36 decimal fixed point numbers, either by using ln_36, or by
    // upscaling.
    let logBase;
    if (LN_36_LOWER_BOUND.lt(base) && base.lt(LN_36_UPPER_BOUND)) {
        logBase = _ln_36(base);
    }
    else {
        logBase = _ln(base).times(ONE_18);
    }
    let logArg;
    if (LN_36_LOWER_BOUND.lt(arg) && arg.lt(LN_36_UPPER_BOUND)) {
        logArg = _ln_36(arg);
    }
    else {
        logArg = _ln(arg).times(ONE_18);
    }
    // When dividing, we multiply by ONE_18 to arrive at a result with 18 decimal places
    return logArg.times(ONE_18).idiv(logBase);
};
exports.log = log;
const ln = (a) => {
    // The real natural logarithm is not defined for negative numbers or zero.
    if (a.lte(0)) {
        throw new Error("OUT_OF_BOUNDS");
    }
    if (LN_36_LOWER_BOUND.lt(a) && a.lt(LN_36_UPPER_BOUND)) {
        return _ln_36(a).idiv(ONE_18);
    }
    else {
        return _ln(a);
    }
};
exports.ln = ln;
const _ln = (a) => {
    if (a.lt(ONE_18)) {
        // Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a))
        // If a is less than one, 1/a will be greater than one, and this if statement will not be entered in the recursive call
        // Fixed point division requires multiplying by ONE_18
        return _ln(ONE_18.times(ONE_18).idiv(a)).negated();
    }
    // First, we use the fact that ln^(a * b) = ln(a) + ln(b) to decompose ln(a) into a sum of powers of two, which
    // we call x_n, where x_n == 2^(7 - n), which are the natural logarithm of precomputed quantities a_n (that is,
    // ln(a_n) = x_n). We choose the first x_n, x0, to equal 2^7 because the exponential of all larger powers cannot
    // be represented as 18 fixed point decimal numbers in 256 bits, and are therefore larger than a.
    // At the end of this process we will have the sum of all x_n = ln(a_n) that apply, and the remainder of this
    // decomposition, which will be lower than the smallest a_n.
    // ln(a) = k_0 * x_0 + k_1 * x_1 + ... + k_n * x_n + ln(remainder), where each k_n equals either 0 or 1
    // We mutate a by subtracting a_n, making it the remainder of the decomposition
    // For reasons related to how `exp` works, the first two a_n (e^(2^7) and e^(2^6)) are not stored as fixed point
    // numbers with 18 decimals, but instead as plain integers with 0 decimals, so we need to multiply them by
    // ONE_18 to convert them to fixed point.
    // For each a_n, we test if that term is present in the decomposition (if a is larger than it), and if so divide
    // by it and compute the accumulated sum.
    let sum = big_number_1.bn(0);
    if (a.gte(a0.times(ONE_18))) {
        a = a.idiv(a0); // Integer, not fixed point division
        sum = sum.plus(x0);
    }
    if (a.gte(a1.times(ONE_18))) {
        a = a.idiv(a1); // Integer, not fixed point division
        sum = sum.plus(x1);
    }
    // All other a_n and x_n are stored as 20 digit fixed point numbers, so we convert the sum and a to this format.
    sum = sum.times(100);
    a = a.times(100);
    // Because further a_n are  20 digit fixed point numbers, we multiply by ONE_20 when dividing by them.
    if (a.gte(a2)) {
        a = a.times(ONE_20).idiv(a2);
        sum = sum.plus(x2);
    }
    if (a.gte(a3)) {
        a = a.times(ONE_20).idiv(a3);
        sum = sum.plus(x3);
    }
    if (a.gte(a4)) {
        a = a.times(ONE_20).idiv(a4);
        sum = sum.plus(x4);
    }
    if (a.gte(a5)) {
        a = a.times(ONE_20).idiv(a5);
        sum = sum.plus(x5);
    }
    if (a.gte(a6)) {
        a = a.times(ONE_20).idiv(a6);
        sum = sum.plus(x6);
    }
    if (a.gte(a7)) {
        a = a.times(ONE_20).idiv(a7);
        sum = sum.plus(x7);
    }
    if (a.gte(a8)) {
        a = a.times(ONE_20).idiv(a8);
        sum = sum.plus(x8);
    }
    if (a.gte(a9)) {
        a = a.times(ONE_20).idiv(a9);
        sum = sum.plus(x9);
    }
    if (a.gte(a10)) {
        a = a.times(ONE_20).idiv(a10);
        sum = sum.plus(x10);
    }
    if (a.gte(a11)) {
        a = a.times(ONE_20).idiv(a11);
        sum = sum.plus(x11);
    }
    // a is now a small number (smaller than a_11, which roughly equals 1.06). This means we can use a Taylor series
    // that converges rapidly for values of `a` close to one - the same one used in ln_36.
    // Let z = (a - 1) / (a + 1).
    // ln(a) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))
    // Recall that 20 digit fixed point division requires multiplying by ONE_20, and multiplication requires
    // division by ONE_20.
    const z = a.minus(ONE_20).times(ONE_20).idiv(a.plus(ONE_20));
    const z_squared = z.times(z).idiv(ONE_20);
    // num is the numerator of the series: the z^(2 * n + 1) term
    let num = z;
    // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
    let seriesSum = num;
    // In each step, the numerator is multiplied by z^2
    num = num.times(z_squared).idiv(ONE_20);
    seriesSum = seriesSum.plus(num.idiv(3));
    num = num.times(z_squared).idiv(ONE_20);
    seriesSum = seriesSum.plus(num.idiv(5));
    num = num.times(z_squared).idiv(ONE_20);
    seriesSum = seriesSum.plus(num.idiv(7));
    num = num.times(z_squared).idiv(ONE_20);
    seriesSum = seriesSum.plus(num.idiv(9));
    num = num.times(z_squared).idiv(ONE_20);
    seriesSum = seriesSum.plus(num.idiv(11));
    // 6 Taylor terms are sufficient for 36 decimal precision.
    // Finally, we multiply by 2 (non fixed point) to compute ln(remainder)
    seriesSum = seriesSum.times(2);
    // We now have the sum of all x_n present, and the Taylor approximation of the logarithm of the remainder (both
    // with 20 decimals). All that remains is to sum these two, and then drop two digits to return a 18 decimal
    // value.
    return sum.plus(seriesSum).idiv(100);
};
const _ln_36 = (x) => {
    // Since ln(1) = 0, a value of x close to one will yield a very small result, which makes using 36 digits worthwhile
    // First, we transform x to a 36 digit fixed point value
    x = x.times(ONE_18);
    // We will use the following Taylor expansion, which converges very rapidly. Let z = (x - 1) / (x + 1)
    // ln(x) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))
    // Recall that 36 digit fixed point division requires multiplying by ONE_36, and multiplication requires division by ONE_36
    const z = x.minus(ONE_36).times(ONE_36).idiv(x.plus(ONE_36));
    const z_squared = z.times(z).idiv(ONE_36);
    // num is the numerator of the series: the z^(2 * n + 1) term
    let num = z;
    // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
    let seriesSum = num;
    // In each step, the numerator is multiplied by z^2
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(3));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(5));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(7));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(9));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(11));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(13));
    num = num.times(z_squared).idiv(ONE_36);
    seriesSum = seriesSum.plus(num.idiv(15));
    // 8 Taylor terms are sufficient for 36 decimal precision
    // All that remains is multiplying by 2 (non fixed point)
    return seriesSum.times(2);
};
}(logExp));

(function (exports) {
// Ported from Solidity:
// https://github.com/balancer-labs/balancer-core-v2/blob/70843e6a61ad11208c1cfabf5cfe15be216ca8d3/pkg/solidity-utils/contracts/math/FixedPoint.sol
Object.defineProperty(exports, "__esModule", { value: true });
exports.complement = exports.powUp = exports.powDown = exports.divUp = exports.divDown = exports.mulUp = exports.mulDown = exports.sub = exports.add = exports.MIN_POW_BASE_FREE_EXPONENT = exports.MAX_POW_RELATIVE_ERROR = exports.ONE = exports.ZERO = void 0;
const big_number_1 = bigNumber;
const logExp$1 = logExp;
exports.ZERO = big_number_1.bn(0);
exports.ONE = big_number_1.bn("1000000000000000000"); // 10^18
exports.MAX_POW_RELATIVE_ERROR = big_number_1.bn(10000); // 10^(-14)
// Minimum base for the power function when the exponent is 'free' (larger than ONE)
exports.MIN_POW_BASE_FREE_EXPONENT = big_number_1.bn("700000000000000000"); // 0.7e18
const add = (a, b) => {
    // Fixed Point addition is the same as regular checked addition
    return a.plus(b);
};
exports.add = add;
const sub = (a, b) => {
    // Fixed Point subtraction is the same as regular checked subtraction
    if (b.gt(a)) {
        throw new Error("SUB_OVERFLOW");
    }
    return a.minus(b);
};
exports.sub = sub;
const mulDown = (a, b) => {
    return a.times(b).idiv(exports.ONE);
};
exports.mulDown = mulDown;
const mulUp = (a, b) => {
    const product = a.times(b);
    if (product.isZero()) {
        return product;
    }
    else {
        // The traditional divUp formula is:
        // divUp(x, y) := (x + y - 1) / y
        // To avoid intermediate overflow in the addition, we distribute the division and get:
        // divUp(x, y) := (x - 1) / y + 1
        // Note that this requires x != 0, which we already tested for
        return product.minus(big_number_1.bn(1)).idiv(exports.ONE).plus(big_number_1.bn(1));
    }
};
exports.mulUp = mulUp;
const divDown = (a, b) => {
    if (b.isZero()) {
        throw new Error("ZERO_DIVISION");
    }
    if (a.isZero()) {
        return a;
    }
    else {
        return a.times(exports.ONE).idiv(b);
    }
};
exports.divDown = divDown;
const divUp = (a, b) => {
    if (b.isZero()) {
        throw new Error("ZERO_DIVISION");
    }
    if (a.isZero()) {
        return a;
    }
    else {
        // The traditional divUp formula is:
        // divUp(x, y) := (x + y - 1) / y
        // To avoid intermediate overflow in the addition, we distribute the division and get:
        // divUp(x, y) := (x - 1) / y + 1
        // Note that this requires x != 0, which we already tested for.
        return a.times(exports.ONE).minus(big_number_1.bn(1)).idiv(b).plus(big_number_1.bn(1));
    }
};
exports.divUp = divUp;
const powDown = (x, y) => {
    const raw = logExp$1.pow(x, y);
    const maxError = exports.add(exports.mulUp(raw, exports.MAX_POW_RELATIVE_ERROR), big_number_1.bn(1));
    if (raw.lt(maxError)) {
        return big_number_1.bn(0);
    }
    else {
        return exports.sub(raw, maxError);
    }
};
exports.powDown = powDown;
const powUp = (x, y) => {
    const raw = logExp$1.pow(x, y);
    const maxError = exports.add(exports.mulUp(raw, exports.MAX_POW_RELATIVE_ERROR), big_number_1.bn(1));
    return exports.add(raw, maxError);
};
exports.powUp = powUp;
const complement = (x) => {
    return x.lt(exports.ONE) ? exports.ONE.minus(x) : big_number_1.bn(0);
};
exports.complement = complement;
}(fixedPoint));

(function (exports) {
// Ported from Solidity:
// https://github.com/balancer-labs/balancer-core-v2/blob/70843e6a61ad11208c1cfabf5cfe15be216ca8d3/pkg/pool-stable/contracts/StableMath.sol
Object.defineProperty(exports, "__esModule", { value: true });
exports._calcDueTokenProtocolSwapFeeAmount = exports._calcTokensOutGivenExactBptIn = exports._calcTokenOutGivenExactBptIn = exports._calcBptInGivenExactTokensOut = exports._calcTokenInGivenExactBptOut = exports._calcBptOutGivenExactTokensIn = exports._calcInGivenOut = exports._calcOutGivenIn = exports._calculateInvariant = exports.MAX_STABLE_TOKENS = exports.AMP_PRECISION = exports.MAX_AMP = exports.MIN_AMP = void 0;
const big_number_1 = bigNumber;
const fp = fixedPoint;
const math = math$5;
exports.MIN_AMP = big_number_1.bn(1);
exports.MAX_AMP = big_number_1.bn(5000);
exports.AMP_PRECISION = big_number_1.bn(1000);
exports.MAX_STABLE_TOKENS = 5;
// Computes the invariant given the current balances, using the Newton-Raphson approximation.
// The amplification parameter equals: A n^(n-1)
const _calculateInvariant = (amplificationParameter, balances, roundUp) => {
    /**********************************************************************************************
    // invariant                                                                                 //
    // D = invariant                                                  D^(n+1)                    //
    // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
    // S = sum of balances                                             n^n P                     //
    // P = product of balances                                                                   //
    // n = number of tokens                                                                      //
    **********************************************************************************************/
    // We support rounding up or down.
    let sum = math.ZERO;
    let numTokens = big_number_1.bn(balances.length);
    for (let i = 0; i < balances.length; i++) {
        sum = fp.add(sum, balances[i]);
    }
    if (sum.isZero()) {
        return math.ZERO;
    }
    let prevInvariant = math.ZERO;
    let invariant = sum;
    let ampTimesTotal = math.mul(amplificationParameter, numTokens);
    for (let i = 0; i < 255; i++) {
        let P_D = math.mul(numTokens, balances[0]);
        for (let j = 1; j < balances.length; j++) {
            P_D = math.div(math.mul(math.mul(P_D, balances[j]), numTokens), invariant, roundUp);
        }
        prevInvariant = invariant;
        invariant = math.div(fp.add(math.mul(math.mul(numTokens, invariant), invariant), math.div(math.mul(math.mul(ampTimesTotal, sum), P_D), exports.AMP_PRECISION, roundUp)), fp.add(math.mul(fp.add(numTokens, math.ONE), invariant), math.div(math.mul(fp.sub(ampTimesTotal, exports.AMP_PRECISION), P_D), exports.AMP_PRECISION, !roundUp)), roundUp);
        if (invariant.gt(prevInvariant)) {
            if (fp.sub(invariant, prevInvariant).lte(math.ONE)) {
                return invariant;
            }
        }
        else if (fp.sub(prevInvariant, invariant).lte(math.ONE)) {
            return invariant;
        }
    }
    throw new Error("STABLE_GET_BALANCE_DIDNT_CONVERGE");
};
exports._calculateInvariant = _calculateInvariant;
// Computes how many tokens can be taken out of a pool if `tokenAmountIn` are sent, given the current balances.
// The amplification parameter equals: A n^(n-1)
const _calcOutGivenIn = (amplificationParameter, balances, tokenIndexIn, tokenIndexOut, tokenAmountIn, swapFeePercentage) => {
    /**************************************************************************************************************
    // outGivenIn token x for y - polynomial equation to solve                                                   //
    // ay = amount out to calculate                                                                              //
    // by = balance token out                                                                                    //
    // y = by - ay (finalBalanceOut)                                                                             //
    // D = invariant                                               D                     D^(n+1)                 //
    // A = amplification coefficient               y^2 + ( S - ----------  - D) * y -  ------------- = 0         //
    // n = number of tokens                                    (A * n^n)               A * n^2n * P              //
    // S = sum of final balances but y                                                                           //
    // P = product of final balances but y                                                                       //
    **************************************************************************************************************/
    // Subtract the fee from the amount in if requested
    if (swapFeePercentage) {
        tokenAmountIn = fp.sub(tokenAmountIn, fp.mulUp(tokenAmountIn, swapFeePercentage));
    }
    // Amount out, so we round down overall.
    // Given that we need to have a greater final balance out, the invariant needs to be rounded up
    const invariant = exports._calculateInvariant(amplificationParameter, balances, true);
    balances[tokenIndexIn] = fp.add(balances[tokenIndexIn], tokenAmountIn);
    const finalBalanceOut = _getTokenBalanceGivenInvariantAndAllOtherBalances(amplificationParameter, balances, invariant, tokenIndexOut);
    balances[tokenIndexIn] = fp.sub(balances[tokenIndexIn], tokenAmountIn);
    return fp.sub(fp.sub(balances[tokenIndexOut], finalBalanceOut), math.ONE);
};
exports._calcOutGivenIn = _calcOutGivenIn;
// Computes how many tokens must be sent to a pool if `tokenAmountOut` are sent given the
// current balances, using the Newton-Raphson approximation.
// The amplification parameter equals: A n^(n-1)
const _calcInGivenOut = (amplificationParameter, balances, tokenIndexIn, tokenIndexOut, tokenAmountOut, swapFeePercentage) => {
    /**************************************************************************************************************
    // inGivenOut token x for y - polynomial equation to solve                                                   //
    // ax = amount in to calculate                                                                               //
    // bx = balance token in                                                                                     //
    // x = bx + ax (finalBalanceIn)                                                                              //
    // D = invariant                                                D                     D^(n+1)                //
    // A = amplification coefficient               x^2 + ( S - ----------  - D) * x -  ------------- = 0         //
    // n = number of tokens                                     (A * n^n)               A * n^2n * P             //
    // S = sum of final balances but x                                                                           //
    // P = product of final balances but x                                                                       //
    **************************************************************************************************************/
    // Amount in, so we round up overall.
    // Given that we need to have a greater final balance in, the invariant needs to be rounded up
    const invariant = exports._calculateInvariant(amplificationParameter, balances, true);
    balances[tokenIndexOut] = fp.sub(balances[tokenIndexOut], tokenAmountOut);
    const finalBalanceIn = _getTokenBalanceGivenInvariantAndAllOtherBalances(amplificationParameter, balances, invariant, tokenIndexIn);
    balances[tokenIndexOut] = fp.add(balances[tokenIndexOut], tokenAmountOut);
    let amountIn = fp.add(fp.sub(finalBalanceIn, balances[tokenIndexIn]), math.ONE);
    // Add the fee to the amount in if requested
    if (swapFeePercentage) {
        amountIn = fp.divUp(amountIn, fp.complement(swapFeePercentage));
    }
    return amountIn;
};
exports._calcInGivenOut = _calcInGivenOut;
const _calcBptOutGivenExactTokensIn = (amp, balances, amountsIn, bptTotalSupply, swapFeePercentage) => {
    // BPT out, so we round down overall.
    // First loop calculates the sum of all token balances, which will be used to calculate
    // the current weights of each token, relative to this sum
    let sumBalances = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        sumBalances = fp.add(sumBalances, balances[i]);
    }
    // Calculate the weighted balance ratio without considering fees
    const balanceRatiosWithFee = new Array(amountsIn.length);
    // The weighted sum of token balance ratios without fee
    let invariantRatioWithFees = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        const currentWeight = fp.divDown(balances[i], sumBalances);
        balanceRatiosWithFee[i] = fp.divDown(fp.add(balances[i], amountsIn[i]), balances[i]);
        invariantRatioWithFees = fp.add(invariantRatioWithFees, fp.mulDown(balanceRatiosWithFee[i], currentWeight));
    }
    // Second loop calculates new amounts in, taking into account the fee on the percentage excess
    const newBalances = new Array(balances.length);
    for (let i = 0; i < balances.length; i++) {
        let amountInWithoutFee;
        // Check if the balance ratio is greater than the ideal ratio to charge fees or not
        if (balanceRatiosWithFee[i].gt(invariantRatioWithFees)) {
            const nonTaxableAmount = fp.mulDown(balances[i], fp.sub(invariantRatioWithFees, fp.ONE));
            const taxableAmount = fp.sub(amountsIn[i], nonTaxableAmount);
            amountInWithoutFee = fp.add(nonTaxableAmount, fp.mulDown(taxableAmount, fp.sub(fp.ONE, swapFeePercentage)));
        }
        else {
            amountInWithoutFee = amountsIn[i];
        }
        newBalances[i] = fp.add(balances[i], amountInWithoutFee);
    }
    // Get current and new invariants, taking swap fees into account
    const currentInvariant = exports._calculateInvariant(amp, balances, true);
    const newInvariant = exports._calculateInvariant(amp, newBalances, false);
    const invariantRatio = fp.divDown(newInvariant, currentInvariant);
    // If the invariant didn't increase for any reason, we simply don't mint BPT
    if (invariantRatio.gt(fp.ONE)) {
        return fp.mulDown(bptTotalSupply, fp.sub(invariantRatio, fp.ONE));
    }
    else {
        return math.ZERO;
    }
};
exports._calcBptOutGivenExactTokensIn = _calcBptOutGivenExactTokensIn;
const _calcTokenInGivenExactBptOut = (amp, balances, tokenIndex, bptAmountOut, bptTotalSupply, swapFeePercentage) => {
    // Token in, so we round up overall.
    // Get the current invariant
    const currentInvariant = exports._calculateInvariant(amp, balances, true);
    // Calculate new invariant
    const newInvariant = fp.mulUp(fp.divUp(fp.add(bptTotalSupply, bptAmountOut), bptTotalSupply), currentInvariant);
    // Calculate amount in without fee.
    const newBalanceTokenIndex = _getTokenBalanceGivenInvariantAndAllOtherBalances(amp, balances, newInvariant, tokenIndex);
    const amountInWithoutFee = fp.sub(newBalanceTokenIndex, balances[tokenIndex]);
    // First calculate the sum of all token balances, which will be used to calculate
    // the current weight of each token
    let sumBalances = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        sumBalances = fp.add(sumBalances, balances[i]);
    }
    // We can now compute how much extra balance is being deposited and used in virtual swaps, and charge swap fees
    // accordingly.
    const currentWeight = fp.divDown(balances[tokenIndex], sumBalances);
    const taxablePercentage = fp.complement(currentWeight);
    const taxableAmount = fp.mulUp(amountInWithoutFee, taxablePercentage);
    const nonTaxableAmount = fp.sub(amountInWithoutFee, taxableAmount);
    return fp.add(nonTaxableAmount, fp.divUp(taxableAmount, fp.sub(fp.ONE, swapFeePercentage)));
};
exports._calcTokenInGivenExactBptOut = _calcTokenInGivenExactBptOut;
/*
  Flow of calculations:
  amountsTokenOut -> amountsOutProportional ->
  amountOutPercentageExcess -> amountOutBeforeFee -> newInvariant -> amountBPTIn
*/
const _calcBptInGivenExactTokensOut = (amp, balances, amountsOut, bptTotalSupply, swapFeePercentage) => {
    // BPT in, so we round up overall.
    // First loop calculates the sum of all token balances, which will be used to calculate
    // the current weights of each token relative to this sum
    let sumBalances = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        sumBalances = fp.add(sumBalances, balances[i]);
    }
    // Calculate the weighted balance ratio without considering fees
    const balanceRatiosWithoutFee = new Array(amountsOut.length);
    let invariantRatioWithoutFees = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        const currentWeight = fp.divUp(balances[i], sumBalances);
        balanceRatiosWithoutFee[i] = fp.divUp(fp.sub(balances[i], amountsOut[i]), balances[i]);
        invariantRatioWithoutFees = fp.add(invariantRatioWithoutFees, fp.mulUp(balanceRatiosWithoutFee[i], currentWeight));
    }
    // Second loop calculates new amounts in, taking into account the fee on the percentage excess
    const newBalances = new Array(balances.length);
    for (let i = 0; i < balances.length; i++) {
        // Swap fees are typically charged on 'token in', but there is no 'token in' here, so we apply it to
        // 'token out'. This results in slightly larger price impact.
        let amountOutWithFee;
        if (invariantRatioWithoutFees.gt(balanceRatiosWithoutFee[i])) {
            const nonTaxableAmount = fp.mulDown(balances[i], fp.complement(invariantRatioWithoutFees));
            const taxableAmount = fp.sub(amountsOut[i], nonTaxableAmount);
            amountOutWithFee = fp.add(nonTaxableAmount, fp.divUp(taxableAmount, fp.sub(fp.ONE, swapFeePercentage)));
        }
        else {
            amountOutWithFee = amountsOut[i];
        }
        newBalances[i] = fp.sub(balances[i], amountOutWithFee);
    }
    // Get current and new invariants, taking into account swap fees
    const currentInvariant = exports._calculateInvariant(amp, balances, true);
    const newInvariant = exports._calculateInvariant(amp, newBalances, false);
    const invariantRatio = fp.divDown(newInvariant, currentInvariant);
    // return amountBPTIn
    return fp.mulUp(bptTotalSupply, fp.complement(invariantRatio));
};
exports._calcBptInGivenExactTokensOut = _calcBptInGivenExactTokensOut;
const _calcTokenOutGivenExactBptIn = (amp, balances, tokenIndex, bptAmountIn, bptTotalSupply, swapFeePercentage) => {
    // Token out, so we round down overall.
    // Get the current and new invariants. Since we need a bigger new invariant, we round the current one up.
    const currentInvariant = exports._calculateInvariant(amp, balances, true);
    const newInvariant = fp.mulUp(fp.divUp(fp.sub(bptTotalSupply, bptAmountIn), bptTotalSupply), currentInvariant);
    // Calculate amount out without fee
    const newBalanceTokenIndex = _getTokenBalanceGivenInvariantAndAllOtherBalances(amp, balances, newInvariant, tokenIndex);
    const amountOutWithoutFee = fp.sub(balances[tokenIndex], newBalanceTokenIndex);
    // First calculate the sum of all token balances, which will be used to calculate
    // the current weight of each token
    let sumBalances = math.ZERO;
    for (let i = 0; i < balances.length; i++) {
        sumBalances = fp.add(sumBalances, balances[i]);
    }
    // We can now compute how much excess balance is being withdrawn as a result of the virtual swaps, which result
    // in swap fees.
    const currentWeight = fp.divDown(balances[tokenIndex], sumBalances);
    const taxablePercentage = fp.complement(currentWeight);
    // Swap fees are typically charged on 'token in', but there is no 'token in' here, so we apply it
    // to 'token out'. This results in slightly larger price impact. Fees are rounded up.
    const taxableAmount = fp.mulUp(amountOutWithoutFee, taxablePercentage);
    const nonTaxableAmount = fp.sub(amountOutWithoutFee, taxableAmount);
    return fp.add(nonTaxableAmount, fp.mulDown(taxableAmount, fp.sub(fp.ONE, swapFeePercentage)));
};
exports._calcTokenOutGivenExactBptIn = _calcTokenOutGivenExactBptIn;
const _calcTokensOutGivenExactBptIn = (balances, bptAmountIn, bptTotalSupply) => {
    /**********************************************************************************************
    // exactBPTInForTokensOut                                                                    //
    // (per token)                                                                               //
    // aO = tokenAmountOut             /        bptIn         \                                  //
    // b = tokenBalance      a0 = b * | ---------------------  |                                 //
    // bptIn = bptAmountIn             \     bptTotalSupply    /                                 //
    // bpt = bptTotalSupply                                                                      //
    **********************************************************************************************/
    // Since we're computing an amount out, we round down overall. This means rounding down on both the
    // multiplication and division.
    const bptRatio = fp.divDown(bptAmountIn, bptTotalSupply);
    const amountsOut = new Array(balances.length);
    for (let i = 0; i < balances.length; i++) {
        amountsOut[i] = fp.mulDown(balances[i], bptRatio);
    }
    return amountsOut;
};
exports._calcTokensOutGivenExactBptIn = _calcTokensOutGivenExactBptIn;
// The amplification parameter equals: A n^(n-1)
const _calcDueTokenProtocolSwapFeeAmount = (amplificationParameter, balances, lastInvariant, tokenIndex, protocolSwapFeePercentage) => {
    /**************************************************************************************************************
    // oneTokenSwapFee - polynomial equation to solve                                                            //
    // af = fee amount to calculate in one token                                                                 //
    // bf = balance of fee token                                                                                 //
    // f = bf - af (finalBalanceFeeToken)                                                                        //
    // D = old invariant                                            D                     D^(n+1)                //
    // A = amplification coefficient               f^2 + ( S - ----------  - D) * f -  ------------- = 0         //
    // n = number of tokens                                    (A * n^n)               A * n^2n * P              //
    // S = sum of final balances but f                                                                           //
    // P = product of final balances but f                                                                       //
    **************************************************************************************************************/
    // Protocol swap fee amount, so we round down overall.
    const finalBalanceFeeToken = _getTokenBalanceGivenInvariantAndAllOtherBalances(amplificationParameter, balances, lastInvariant, tokenIndex);
    if (balances[tokenIndex].lte(finalBalanceFeeToken)) {
        // This shouldn't happen outside of rounding errors, but have this safeguard nonetheless to prevent the Pool
        // from entering a locked state in which joins and exits revert while computing accumulated swap fees.
        return math.ZERO;
    }
    // Result is rounded down
    const accumulatedTokenSwapFees = fp.sub(balances[tokenIndex], finalBalanceFeeToken);
    return fp.divDown(fp.mulDown(accumulatedTokenSwapFees, protocolSwapFeePercentage), fp.ONE);
};
exports._calcDueTokenProtocolSwapFeeAmount = _calcDueTokenProtocolSwapFeeAmount;
// This function calculates the balance of a given token (tokenIndex)
// given all the other balances and the invariant
const _getTokenBalanceGivenInvariantAndAllOtherBalances = (amplificationParameter, balances, invariant, tokenIndex) => {
    // Rounds result up overall
    const numTokens = big_number_1.bn(balances.length);
    const ampTimesTotal = math.mul(amplificationParameter, numTokens);
    let sum = balances[0];
    let P_D = math.mul(numTokens, balances[0]);
    for (let j = 1; j < balances.length; j++) {
        P_D = math.divDown(math.mul(math.mul(P_D, balances[j]), numTokens), invariant);
        sum = fp.add(sum, balances[j]);
    }
    sum = fp.sub(sum, balances[tokenIndex]);
    const inv2 = math.mul(invariant, invariant);
    // We remove the balance fromm c by multiplying it
    const c = math.mul(math.mul(math.divUp(inv2, math.mul(ampTimesTotal, P_D)), exports.AMP_PRECISION), balances[tokenIndex]);
    const b = fp.add(sum, math.mul(math.divDown(invariant, ampTimesTotal), exports.AMP_PRECISION));
    // We iterate to find the balance
    let prevTokenBalance = math.ZERO;
    // We multiply the first iteration outside the loop with the invariant to set the value of the
    // initial approximation.
    let tokenBalance = math.divUp(fp.add(inv2, c), fp.add(invariant, b));
    for (let i = 0; i < 255; i++) {
        prevTokenBalance = tokenBalance;
        tokenBalance = math.divUp(fp.add(math.mul(tokenBalance, tokenBalance), c), fp.sub(fp.add(math.mul(tokenBalance, math.TWO), b), invariant));
        if (tokenBalance.gt(prevTokenBalance)) {
            if (fp.sub(tokenBalance, prevTokenBalance).lte(math.ONE)) {
                return tokenBalance;
            }
        }
        else if (fp.sub(prevTokenBalance, tokenBalance).lte(math.ONE)) {
            return tokenBalance;
        }
    }
    throw new Error("STABLE_GET_BALANCE_DIDNT_CONVERGE");
};
}(math$3));

Object.defineProperty(stable, "__esModule", { value: true });
const index_1$1 = subgraph;
const big_number_1$2 = bigNumber;
const common_1$1 = common;
const base_1$1 = base;
const math$2 = math$3;
class StablePool extends base_1$1.default {
    // ---------------------- Constructor ----------------------
    constructor(params) {
        super(params);
        if (params.tokens.length > math$2.MAX_STABLE_TOKENS) {
            throw new Error("MAX_STABLE_TOKENS");
        }
        this._tokens = common_1$1.shallowCopyAll(params.tokens);
        if (big_number_1$2.bn(params.amplificationParameter).lt(math$2.MIN_AMP)) {
            throw new Error("MIN_AMP");
        }
        if (big_number_1$2.bn(params.amplificationParameter).gt(math$2.MAX_AMP)) {
            throw new Error("MAX_AMP");
        }
        this._amplificationParameter = big_number_1$2.bn(params.amplificationParameter)
            .times(math$2.AMP_PRECISION)
            .toString();
    }
    // ---------------------- Getters ----------------------
    get tokens() {
        // Shallow-copy to disallow direct changes
        return common_1$1.shallowCopyAll(this._tokens);
    }
    get amplificationParameter() {
        return big_number_1$2.bn(this._amplificationParameter).idiv(math$2.AMP_PRECISION).toString();
    }
    // ---------------------- Subgraph initializer ----------------------
    static async initFromRealPool(poolId, query = false, blockNumber, testnet) {
        const pool = await index_1$1.getPool(poolId, blockNumber, testnet);
        if (!pool) {
            throw new Error("Could not fetch pool data");
        }
        if (pool.poolType !== "Stable") {
            throw new Error("Pool must be stable");
        }
        const id = pool.id;
        const address = pool.address;
        const bptTotalSupply = pool.totalShares;
        const swapFeePercentage = pool.swapFee;
        const amplificationParameter = pool.amp;
        const tokens = [];
        for (const token of pool.tokens) {
            tokens.push({
                address: token.address,
                symbol: token.symbol,
                balance: token.balance,
                decimals: token.decimals,
            });
        }
        return new StablePool({
            id,
            address,
            tokens,
            bptTotalSupply,
            swapFeePercentage,
            amplificationParameter,
            query,
        });
    }
    // ---------------------- Swap actions ----------------------
    swapGivenIn(tokenInSymbol, tokenOutSymbol, amountIn) {
        const tokenIndexIn = this._tokens.findIndex((t) => t.symbol === tokenInSymbol);
        const tokenIndexOut = this._tokens.findIndex((t) => t.symbol === tokenOutSymbol);
        const tokenIn = this._tokens[tokenIndexIn];
        const tokenOut = this._tokens[tokenIndexOut];
        const scaledAmountOut = math$2._calcOutGivenIn(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), tokenIndexIn, tokenIndexOut, this._upScale(amountIn, tokenIn.decimals), this._upScale(this._swapFeePercentage, 18));
        const amountOut = this._downScaleDown(scaledAmountOut, tokenOut.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1$2.bn(tokenIn.balance).plus(amountIn).toString();
            tokenOut.balance = big_number_1$2.bn(tokenOut.balance).minus(amountOut).toString();
        }
        return amountOut.toString();
    }
    swapGivenOut(tokenInSymbol, tokenOutSymbol, amountOut) {
        const tokenIndexIn = this._tokens.findIndex((t) => t.symbol === tokenInSymbol);
        const tokenIndexOut = this._tokens.findIndex((t) => t.symbol === tokenOutSymbol);
        const tokenIn = this._tokens[tokenIndexIn];
        const tokenOut = this._tokens[tokenIndexOut];
        const scaledAmountIn = math$2._calcInGivenOut(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), tokenIndexIn, tokenIndexOut, this._upScale(amountOut, tokenOut.decimals), this._upScale(this._swapFeePercentage, 18));
        const amountIn = this._downScaleUp(scaledAmountIn, tokenIn.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1$2.bn(tokenIn.balance).plus(amountIn).toString();
            tokenOut.balance = big_number_1$2.bn(tokenOut.balance).minus(amountOut).toString();
        }
        return amountIn.toString();
    }
    // ---------------------- LP actions ----------------------
    joinExactTokensInForBptOut(amountsIn) {
        if (Object.keys(amountsIn).length !== this._tokens.length) {
            throw new Error("Invalid input");
        }
        const scaledBptOut = math$2._calcBptOutGivenExactTokensIn(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._tokens.map((t) => this._upScale(amountsIn[t.symbol], t.decimals)), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const bptOut = this._downScaleDown(scaledBptOut, 18);
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1$2.bn(token.balance)
                    .plus(amountsIn[token.symbol])
                    .toString();
            }
            this._bptTotalSupply = big_number_1$2.bn(this._bptTotalSupply).plus(bptOut).toString();
        }
        return bptOut.toString();
    }
    joinTokenInForExactBptOut(tokenInSymbol, bptOut) {
        const tokenIndex = this._tokens.findIndex((t) => t.symbol === tokenInSymbol);
        const tokenIn = this._tokens[tokenIndex];
        if (!tokenIn) {
            throw new Error("Invalid input");
        }
        const scaledAmountIn = math$2._calcTokenInGivenExactBptOut(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), tokenIndex, this._upScale(bptOut, 18), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const amountIn = this._downScaleUp(scaledAmountIn, tokenIn.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1$2.bn(tokenIn.balance).plus(amountIn).toString();
            this._bptTotalSupply = big_number_1$2.bn(this._bptTotalSupply).plus(bptOut).toString();
        }
        return amountIn.toString();
    }
    exitExactBptInForTokenOut(tokenOutSymbol, bptIn) {
        const tokenIndex = this._tokens.findIndex((t) => t.symbol === tokenOutSymbol);
        const tokenOut = this._tokens[tokenIndex];
        if (!tokenOut) {
            throw new Error("Invalid input");
        }
        const scaledAmountOut = math$2._calcTokenOutGivenExactBptIn(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), tokenIndex, this._upScale(bptIn, 18), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const amountOut = this._downScaleDown(scaledAmountOut, tokenOut.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenOut.balance = big_number_1$2.bn(tokenOut.balance).minus(amountOut).toString();
            this._bptTotalSupply = big_number_1$2.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return amountOut.toString();
    }
    exitExactBptInForTokensOut(bptIn) {
        // Exactly match the EVM version
        if (big_number_1$2.bn(bptIn).gt(this._bptTotalSupply)) {
            throw new Error("BPT in exceeds total supply");
        }
        const scaledAmountsOut = math$2._calcTokensOutGivenExactBptIn(this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._upScale(bptIn, 18), this._upScale(this._bptTotalSupply, 18));
        const amountsOut = scaledAmountsOut.map((amount, i) => this._downScaleDown(amount, this._tokens[i].decimals));
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1$2.bn(token.balance).minus(amountsOut[i]).toString();
            }
            this._bptTotalSupply = big_number_1$2.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return amountsOut.map((a) => a.toString());
    }
    exitBptInForExactTokensOut(amountsOut) {
        if (Object.keys(amountsOut).length !== this._tokens.length) {
            throw new Error("Invalid input");
        }
        const scaledBptIn = math$2._calcBptInGivenExactTokensOut(big_number_1$2.bn(this._amplificationParameter), this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._tokens.map((t) => this._upScale(amountsOut[t.symbol], t.decimals)), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const bptIn = this._downScaleDown(scaledBptIn, 18);
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1$2.bn(token.balance)
                    .minus(amountsOut[token.symbol])
                    .toString();
            }
            this._bptTotalSupply = big_number_1$2.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return bptIn.toString();
    }
}
stable.default = StablePool;

var weighted = {};

var math$1 = {};

// Ported from Solidity:
// https://github.com/balancer-labs/balancer-core-v2/blob/70843e6a61ad11208c1cfabf5cfe15be216ca8d3/pkg/pool-weighted/contracts/WeightedMath.sol
Object.defineProperty(math$1, "__esModule", { value: true });
math$1._calcBptInGivenExactTokenOut = math$1._calcBptOutGivenExactTokenIn = math$1._calcDueTokenProtocolSwapFeeAmount = math$1._calcTokensOutGivenExactBptIn = math$1._calcTokenOutGivenExactBptIn = math$1._calcBptInGivenExactTokensOut = math$1._calcTokenInGivenExactBptOut = math$1._calcBptOutGivenExactTokensIn = math$1._calcInGivenOut = math$1._calcOutGivenIn = math$1._calculateInvariant = void 0;
const big_number_1$1 = bigNumber;
const fp = fixedPoint;
// Swap limits: amounts swapped may not be larger than this percentage of total balance
const MAX_IN_RATIO = big_number_1$1.bn("300000000000000000"); // 0.3e18
const MAX_OUT_RATIO = big_number_1$1.bn("300000000000000000"); // 0.3e18
// Invariant growth limit: non-proportional joins cannot cause the invariant to increase by more than this ratio
const MAX_INVARIANT_RATIO = big_number_1$1.bn("3000000000000000000"); // 3e18
// Invariant shrink limit: non-proportional exits cannot cause the invariant to decrease by less than this ratio
const MIN_INVARIANT_RATIO = big_number_1$1.bn("700000000000000000"); // 0.7e18
const _calculateInvariant = (normalizedWeights, balances) => {
    /*****************************************************************************************
    // invariant               _____                                                        //
    // wi = weight index i      | |      wi                                                 //
    // bi = balance index i     | |  bi ^   = i                                             //
    // i = invariant                                                                        //
    *****************************************************************************************/
    let invariant = fp.ONE;
    for (let i = 0; i < normalizedWeights.length; i++) {
        invariant = fp.mulDown(invariant, fp.powDown(balances[i], normalizedWeights[i]));
    }
    if (invariant.lte(fp.ZERO)) {
        throw new Error("ZERO_INVARIANT");
    }
    return invariant;
};
math$1._calculateInvariant = _calculateInvariant;
// Computes how many tokens can be taken out of a pool if `amountIn` is sent, given the
// current balances and weights.
const _calcOutGivenIn = (balanceIn, weightIn, balanceOut, weightOut, amountIn, swapFeePercentage) => {
    /*****************************************************************************************
    // outGivenIn                                                                           //
    // ao = amountOut                                                                       //
    // bo = balanceOut                                                                      //
    // bi = balanceIn              /      /            bi             \    (wi / wo) \      //
    // ai = amountIn    ao = bo * |  1 - | --------------------------  | ^            |     //
    // wi = weightIn               \      \       ( bi + ai )         /              /      //
    // wo = weightOut                                                                       //
    *****************************************************************************************/
    // Subtract the fee from the amount in if requested
    if (swapFeePercentage) {
        amountIn = fp.sub(amountIn, fp.mulUp(amountIn, swapFeePercentage));
    }
    // Amount out, so we round down overall
    // The multiplication rounds down, and the subtrahend (power) rounds up (so the base rounds up too)
    // Because bi / (bi + ai) <= 1, the exponent rounds down
    // Cannot exceed maximum in ratio
    if (amountIn.gt(fp.mulDown(balanceIn, MAX_IN_RATIO))) {
        throw new Error("MAX_IN_RATIO");
    }
    const denominator = fp.add(balanceIn, amountIn);
    const base = fp.divUp(balanceIn, denominator);
    const exponent = fp.divDown(weightIn, weightOut);
    const power = fp.powUp(base, exponent);
    return fp.mulDown(balanceOut, fp.complement(power));
};
math$1._calcOutGivenIn = _calcOutGivenIn;
// Computes how many tokens must be sent to a pool in order to take `amountOut`, given the
// current balances and weights.
const _calcInGivenOut = (balanceIn, weightIn, balanceOut, weightOut, amountOut, swapFeePercentage) => {
    /*****************************************************************************************
    // inGivenOut                                                                           //
    // ao = amountOut                                                                       //
    // bo = balanceOut                                                                      //
    // bi = balanceIn              /  /            bo             \    (wo / wi)      \     //
    // ai = amountIn    ai = bi * |  | --------------------------  | ^            - 1  |    //
    // wi = weightIn               \  \       ( bo - ao )         /                   /     //
    // wo = weightOut                                                                       //
    *****************************************************************************************/
    // Amount in, so we round up overall
    // The multiplication rounds up, and the power rounds up (so the base rounds up too)
    // Because bo / (bo - ao) >= 1, the exponent rounds up
    // Cannot exceed maximum out ratio
    if (amountOut.gt(fp.mulDown(balanceOut, MAX_OUT_RATIO))) {
        throw new Error("MAX_OUT_RATIO");
    }
    const base = fp.divUp(balanceOut, fp.sub(balanceOut, amountOut));
    const exponent = fp.divUp(weightOut, weightIn);
    const power = fp.powUp(base, exponent);
    const ratio = fp.sub(power, fp.ONE);
    let amountIn = fp.mulUp(balanceIn, ratio);
    // Add the fee to the amount in if requested
    if (swapFeePercentage) {
        amountIn = fp.divUp(amountIn, fp.complement(swapFeePercentage));
    }
    return amountIn;
};
math$1._calcInGivenOut = _calcInGivenOut;
const _calcBptOutGivenExactTokensIn = (balances, normalizedWeights, amountsIn, bptTotalSupply, swapFee) => {
    // BPT out, so we round down overall
    const balanceRatiosWithFee = new Array(amountsIn.length);
    let invariantRatioWithFees = fp.ZERO;
    for (let i = 0; i < balances.length; i++) {
        balanceRatiosWithFee[i] = fp.divDown(fp.add(balances[i], amountsIn[i]), balances[i]);
        invariantRatioWithFees = fp.add(invariantRatioWithFees, fp.mulDown(balanceRatiosWithFee[i], normalizedWeights[i]));
    }
    let invariantRatio = fp.ONE;
    for (let i = 0; i < balances.length; i++) {
        let amountInWithoutFee;
        if (balanceRatiosWithFee[i].gt(invariantRatioWithFees)) {
            const nonTaxableAmount = fp.mulDown(balances[i], fp.sub(invariantRatioWithFees, fp.ONE));
            const taxableAmount = fp.sub(amountsIn[i], nonTaxableAmount);
            amountInWithoutFee = fp.add(nonTaxableAmount, fp.mulDown(taxableAmount, fp.sub(fp.ONE, swapFee)));
        }
        else {
            amountInWithoutFee = amountsIn[i];
        }
        const balanceRatio = fp.divDown(fp.add(balances[i], amountInWithoutFee), balances[i]);
        invariantRatio = fp.mulDown(invariantRatio, fp.powDown(balanceRatio, normalizedWeights[i]));
    }
    if (invariantRatio.gte(fp.ONE)) {
        return fp.mulDown(bptTotalSupply, fp.sub(invariantRatio, fp.ONE));
    }
    else {
        return fp.ZERO;
    }
};
math$1._calcBptOutGivenExactTokensIn = _calcBptOutGivenExactTokensIn;
const _calcTokenInGivenExactBptOut = (balance, normalizedWeight, bptAmountOut, bptTotalSupply, swapFee) => {
    /*****************************************************************************************
    // tokenInForExactBptOut                                                                //
    // a = amountIn                                                                         //
    // b = balance                      /  /     bpt + bptOut     \    (1 / w)      \       //
    // bptOut = bptAmountOut   a = b * |  | ---------------------- | ^          - 1  |      //
    // bpt = bptTotalSupply             \  \         bpt          /                 /       //
    // w = normalizedWeight                                                                 //
    *****************************************************************************************/
    // Token in, so we round up overall
    // Calculate the factor by which the invariant will increase after minting `bptAmountOut`
    const invariantRatio = fp.divUp(fp.add(bptTotalSupply, bptAmountOut), bptTotalSupply);
    if (invariantRatio.gt(MAX_INVARIANT_RATIO)) {
        throw new Error("MAX_OUT_BPT_FOR_TOKEN_IN");
    }
    // Calculate by how much the token balance has to increase to cause `invariantRatio`
    const balanceRatio = fp.powUp(invariantRatio, fp.divUp(fp.ONE, normalizedWeight));
    const amountInWithoutFee = fp.mulUp(balance, fp.sub(balanceRatio, fp.ONE));
    // We can now compute how much extra balance is being deposited and used in virtual swaps, and charge swap fees accordingly
    const taxablePercentage = fp.complement(normalizedWeight);
    const taxableAmount = fp.mulUp(amountInWithoutFee, taxablePercentage);
    const nonTaxableAmount = fp.sub(amountInWithoutFee, taxableAmount);
    return fp.add(nonTaxableAmount, fp.divUp(taxableAmount, fp.complement(swapFee)));
};
math$1._calcTokenInGivenExactBptOut = _calcTokenInGivenExactBptOut;
const _calcBptInGivenExactTokensOut = (balances, normalizedWeights, amountsOut, bptTotalSupply, swapFee) => {
    // BPT in, so we round up overall
    const balanceRatiosWithoutFee = new Array(amountsOut.length);
    let invariantRatioWithoutFees = fp.ZERO;
    for (let i = 0; i < balances.length; i++) {
        balanceRatiosWithoutFee[i] = fp.divUp(fp.sub(balances[i], amountsOut[i]), balances[i]);
        invariantRatioWithoutFees = fp.add(invariantRatioWithoutFees, fp.mulUp(balanceRatiosWithoutFee[i], normalizedWeights[i]));
    }
    let invariantRatio = fp.ONE;
    for (let i = 0; i < balances.length; i++) {
        // Swap fees are typically charged on 'tokenIn', but there is no 'tokenIn' here, so we apply it to
        // 'tokenOut' - this results in slightly larger price impact
        let amountOutWithFee;
        if (invariantRatioWithoutFees.gt(balanceRatiosWithoutFee[i])) {
            const nonTaxableAmount = fp.mulDown(balances[i], fp.complement(invariantRatioWithoutFees));
            const taxableAmount = fp.sub(amountsOut[i], nonTaxableAmount);
            amountOutWithFee = fp.add(nonTaxableAmount, fp.divUp(taxableAmount, fp.complement(swapFee)));
        }
        else {
            amountOutWithFee = amountsOut[i];
        }
        const balanceRatio = fp.divDown(fp.sub(balances[i], amountOutWithFee), balances[i]);
        invariantRatio = fp.mulDown(invariantRatio, fp.powDown(balanceRatio, normalizedWeights[i]));
    }
    return fp.mulUp(bptTotalSupply, fp.complement(invariantRatio));
};
math$1._calcBptInGivenExactTokensOut = _calcBptInGivenExactTokensOut;
const _calcTokenOutGivenExactBptIn = (balance, normalizedWeight, bptAmountIn, bptTotalSupply, swapFee) => {
    /*****************************************************************************************
    // exactBptInForTokenOut                                                                //
    // a = amountOut                                                                        //
    // b = balance                     /      /    bpt - bptIn    \    (1 / w)  \           //
    // bptIn = bptAmountIn    a = b * |  1 - | ------------------- | ^           |          //
    // bpt = bptTotalSupply            \      \        bpt        /             /           //
    // w = weight                                                                           //
    *****************************************************************************************/
    // Token out, so we round down overall
    // The multiplication rounds down, but the power rounds up (so the base rounds up)
    // Because (bpt - bptIn) / bpt <= 1, the exponent rounds down
    // Calculate the factor by which the invariant will decrease after burning `bptAmountIn`
    const invariantRatio = fp.divUp(fp.sub(bptTotalSupply, bptAmountIn), bptTotalSupply);
    if (invariantRatio.lt(MIN_INVARIANT_RATIO)) {
        throw new Error("MIN_BPT_IN_FOR_TOKEN_OUT");
    }
    // Calculate by how much the token balance has to increase to cause `invariantRatio`
    const balanceRatio = fp.powUp(invariantRatio, fp.divDown(fp.ONE, normalizedWeight));
    // Because of rounding up, `balanceRatio` can be greater than one, so we use its complement
    const amountOutWithoutFee = fp.mulDown(balance, fp.complement(balanceRatio));
    // We can now compute how much excess balance is being withdrawn as a result of the virtual swaps,
    // which result in swap fees
    const taxablePercentage = fp.complement(normalizedWeight);
    // Swap fees are typically charged on 'tokenIn', but there is no 'tokenIn' here, so we apply it
    // to 'tokenOut' - this results in slightly larger price impact (fees are rounded up)
    const taxableAmount = fp.mulUp(amountOutWithoutFee, taxablePercentage);
    const nonTaxableAmount = fp.sub(amountOutWithoutFee, taxableAmount);
    return fp.add(nonTaxableAmount, fp.mulDown(taxableAmount, fp.complement(swapFee)));
};
math$1._calcTokenOutGivenExactBptIn = _calcTokenOutGivenExactBptIn;
const _calcTokensOutGivenExactBptIn = (balances, bptAmountIn, bptTotalSupply) => {
    /*****************************************************************************************
    // exactBptInForTokensOut                                                               //
    // (formula per token)                                                                  //
    // ao = amountOut                  /   bptIn   \                                        //
    // b = balance           ao = b * | ----------- |                                       //
    // bptIn = bptAmountIn             \    bpt    /                                        //
    // bpt = bptTotalSupply                                                                 //
    *****************************************************************************************/
    // Token out, so we round down overall
    // This means rounding down on both multiplication and division
    const bptRatio = fp.divDown(bptAmountIn, bptTotalSupply);
    const amountsOut = new Array(balances.length);
    for (let i = 0; i < balances.length; i++) {
        amountsOut[i] = fp.mulDown(balances[i], bptRatio);
    }
    return amountsOut;
};
math$1._calcTokensOutGivenExactBptIn = _calcTokensOutGivenExactBptIn;
const _calcDueTokenProtocolSwapFeeAmount = (balance, normalizedWeight, previousInvariant, currentInvariant, protocolSwapFeePercentage) => {
    /*********************************************************************************
    /*  protocolSwapFeePercentage * balanceToken * ( 1 - (previousInvariant / currentInvariant) ^ (1 / weightToken))
    *********************************************************************************/
    if (currentInvariant.lte(previousInvariant)) {
        // This shouldn't happen outside of rounding errors, but have this safeguard nonetheless to prevent the Pool
        // from entering a locked state in which joins and exits revert while computing accumulated swap fees.
        return fp.ZERO;
    }
    // We round down to prevent issues in the Pool's accounting, even if it means paying slightly less in protocol
    // fees to the Vault.
    // Fee percentage and balance multiplications round down, while the subtrahend (power) rounds up (as does the
    // base). Because previousInvariant / currentInvariant <= 1, the exponent rounds down.
    let base = fp.divUp(previousInvariant, currentInvariant);
    const exponent = fp.divDown(fp.ONE, normalizedWeight);
    // Because the exponent is larger than one, the base of the power function has a lower bound. We cap to this
    // value to avoid numeric issues, which means in the extreme case (where the invariant growth is larger than
    // 1 / min exponent) the Pool will pay less in protocol fees than it should.
    base = base.gte(fp.MIN_POW_BASE_FREE_EXPONENT)
        ? base
        : fp.MIN_POW_BASE_FREE_EXPONENT;
    const power = fp.powUp(base, exponent);
    const tokenAccruedFees = fp.mulDown(balance, fp.complement(power));
    return fp.mulDown(tokenAccruedFees, protocolSwapFeePercentage);
};
math$1._calcDueTokenProtocolSwapFeeAmount = _calcDueTokenProtocolSwapFeeAmount;
// Convenience method needed by the SOR package (adapted from _calcBptOutGivenExactTokensIn)
const _calcBptOutGivenExactTokenIn = (balance, normalizedWeight, amountIn, bptTotalSupply, swapFee) => {
    // BPT out, so we round down overall
    const tokenBalanceRatioWithoutFee = fp.divDown(fp.add(balance, amountIn), balance);
    const weightedBalanceRatio = fp.mulDown(tokenBalanceRatioWithoutFee, normalizedWeight);
    let invariantRatio = fp.ONE;
    // Percentage of the amount supplied that will be swapped for other tokens in the pool
    let tokenBalancePercentageExcess;
    // Some tokens might have amounts supplied in excess of a 'balanced' join: these are identified if
    // the token's balance ratio sans fee is larger than the weighted balance ratio, and swap fees charged
    // on the amount to swap
    if (weightedBalanceRatio.gte(tokenBalanceRatioWithoutFee)) {
        tokenBalancePercentageExcess = fp.ZERO;
    }
    else {
        tokenBalancePercentageExcess = fp.divUp(fp.sub(tokenBalanceRatioWithoutFee, weightedBalanceRatio), fp.sub(tokenBalanceRatioWithoutFee, fp.ONE));
    }
    const swapFeeExcess = fp.mulUp(swapFee, tokenBalancePercentageExcess);
    const amountInAfterFee = fp.mulDown(amountIn, fp.complement(swapFeeExcess));
    const tokenBalanceRatio = fp.add(fp.ONE, fp.divDown(amountInAfterFee, balance));
    invariantRatio = fp.mulDown(invariantRatio, fp.powDown(tokenBalanceRatio, normalizedWeight));
    return fp.mulDown(bptTotalSupply, fp.sub(invariantRatio, fp.ONE));
};
math$1._calcBptOutGivenExactTokenIn = _calcBptOutGivenExactTokenIn;
// Convenience method needed by the SOR package (adapted from _calcBptInGivenExactTokensOut)
function _calcBptInGivenExactTokenOut(balance, normalizedWeight, amountOut, bptTotalSupply, swapFee) {
    // BPT in, so we round up overall
    const tokenBalanceRatioWithoutFee = fp.divUp(fp.sub(balance, amountOut), balance);
    const weightedBalanceRatio = fp.mulUp(tokenBalanceRatioWithoutFee, normalizedWeight);
    let invariantRatio = fp.ONE;
    // Percentage of the amount supplied that will be swapped for other tokens in the pool
    let tokenBalancePercentageExcess;
    // For each ratioSansFee, compare with the total weighted ratio (weightedBalanceRatio) and
    // decrease the fee from what goes above it
    if (weightedBalanceRatio.lte(tokenBalanceRatioWithoutFee)) {
        tokenBalancePercentageExcess = fp.ZERO;
    }
    else {
        tokenBalancePercentageExcess = fp.divUp(fp.sub(weightedBalanceRatio, tokenBalanceRatioWithoutFee), fp.complement(tokenBalanceRatioWithoutFee));
    }
    const swapFeeExcess = fp.mulUp(swapFee, tokenBalancePercentageExcess);
    const amountOutBeforeFee = fp.divUp(amountOut, fp.complement(swapFeeExcess));
    const tokenBalanceRatio = fp.complement(fp.divUp(amountOutBeforeFee, balance));
    invariantRatio = fp.mulDown(invariantRatio, fp.powDown(tokenBalanceRatio, normalizedWeight));
    return fp.mulUp(bptTotalSupply, fp.complement(invariantRatio));
}
math$1._calcBptInGivenExactTokenOut = _calcBptInGivenExactTokenOut;

Object.defineProperty(weighted, "__esModule", { value: true });
const index_1 = subgraph;
const big_number_1 = bigNumber;
const common_1 = common;
const base_1 = base;
const math = math$1;
class WeightedPool extends base_1.default {
    // ---------------------- Constructor ----------------------
    constructor(params) {
        super(params);
        this.MIN_TOKENS = 2;
        this.MAX_TOKENS = 8;
        // A minimum normalized weight imposes a maximum weight ratio
        // We need this due to limitations in the implementation of the power function, as these ratios are often exponents
        this.MIN_WEIGHT = big_number_1.bn("0.01"); // 0.01e18
        if (params.tokens.length < this.MIN_TOKENS) {
            throw new Error("MIN_TOKENS");
        }
        if (params.tokens.length > this.MAX_TOKENS) {
            throw new Error("MAX_TOKENS");
        }
        this._tokens = common_1.shallowCopyAll(params.tokens);
        let normalizedSum = big_number_1.bn(0);
        for (let i = 0; i < params.tokens.length; i++) {
            if (big_number_1.bn(params.tokens[i].weight).lt(this.MIN_WEIGHT)) {
                throw new Error("MIN_WEIGHT");
            }
            normalizedSum = normalizedSum.plus(params.tokens[i].weight);
        }
        if (!normalizedSum.eq(1)) {
            throw new Error("NORMALIZED_WEIGHT_INVARIANT");
        }
    }
    // ---------------------- Getters ----------------------
    get tokens() {
        // Shallow-copy to disallow direct changes
        return common_1.shallowCopyAll(this._tokens);
    }
    // ---------------------- Subgraph initializer ----------------------
    static async initFromRealPool(poolId, query = false, blockNumber, testnet) {
        const pool = await index_1.getPool(poolId, blockNumber, testnet);
        if (!pool) {
            throw new Error("Could not fetch pool data");
        }
        if (pool.poolType !== "Weighted") {
            throw new Error("Pool must be weighted");
        }
        const id = pool.id;
        const address = pool.address;
        const bptTotalSupply = pool.totalShares;
        const swapFeePercentage = pool.swapFee;
        const tokens = [];
        for (const token of pool.tokens) {
            tokens.push({
                address: token.address,
                symbol: token.symbol,
                balance: token.balance,
                decimals: token.decimals,
                weight: token.weight,
            });
        }
        return new WeightedPool({
            id,
            address,
            tokens,
            bptTotalSupply,
            swapFeePercentage,
            query,
        });
    }
    // ---------------------- Misc ----------------------
    getInvariant() {
        const invariant = math._calculateInvariant(this._tokens.map((t) => this._upScale(t.weight, 18)), this._tokens.map((t) => this._upScale(t.balance, t.decimals)));
        return invariant.toString();
    }
    // ---------------------- Swap actions ----------------------
    swapGivenIn(tokenInSymbol, tokenOutSymbol, amountIn) {
        const tokenIn = this._tokens.find((t) => t.symbol === tokenInSymbol);
        const tokenOut = this._tokens.find((t) => t.symbol === tokenOutSymbol);
        const scaledAmountOut = math._calcOutGivenIn(this._upScale(tokenIn.balance, tokenIn.decimals), this._upScale(tokenIn.weight, 18), this._upScale(tokenOut.balance, tokenOut.decimals), this._upScale(tokenOut.weight, 18), this._upScale(amountIn, tokenIn.decimals), this._upScale(this._swapFeePercentage, 18));
        const amountOut = this._downScaleDown(scaledAmountOut, tokenOut.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1.bn(tokenIn.balance).plus(amountIn).toString();
            tokenOut.balance = big_number_1.bn(tokenOut.balance).minus(amountOut).toString();
        }
        return amountOut.toString();
    }
    swapGivenOut(tokenInSymbol, tokenOutSymbol, amountOut) {
        const tokenIn = this._tokens.find((t) => t.symbol === tokenInSymbol);
        const tokenOut = this._tokens.find((t) => t.symbol === tokenOutSymbol);
        const scaledAmountIn = math._calcInGivenOut(this._upScale(tokenIn.balance, tokenIn.decimals), this._upScale(tokenIn.weight, 18), this._upScale(tokenOut.balance, tokenOut.decimals), this._upScale(tokenOut.weight, 18), this._upScale(amountOut, tokenOut.decimals), this._upScale(this._swapFeePercentage, 18));
        const amountIn = this._downScaleUp(scaledAmountIn, tokenIn.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1.bn(tokenIn.balance).plus(amountIn).toString();
            tokenOut.balance = big_number_1.bn(tokenOut.balance).minus(amountOut).toString();
        }
        return amountIn.toString();
    }
    // ---------------------- LP actions ----------------------
    joinExactTokensInForBptOut(amountsIn) {
        if (Object.keys(amountsIn).length !== this._tokens.length) {
            throw new Error("Invalid input");
        }
        const scaledBptOut = math._calcBptOutGivenExactTokensIn(this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._tokens.map((t) => this._upScale(t.weight, 18)), this._tokens.map((t) => this._upScale(amountsIn[t.symbol], t.decimals)), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const bptOut = this._downScaleDown(scaledBptOut, 18);
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1.bn(token.balance)
                    .plus(amountsIn[token.symbol])
                    .toString();
            }
            this._bptTotalSupply = big_number_1.bn(this._bptTotalSupply).plus(bptOut).toString();
        }
        return bptOut.toString();
    }
    joinTokenInForExactBptOut(tokenInSymbol, bptOut) {
        const tokenIn = this._tokens.find((t) => t.symbol === tokenInSymbol);
        if (!tokenIn) {
            throw new Error("Invalid input");
        }
        const scaledAmountIn = math._calcTokenInGivenExactBptOut(this._upScale(tokenIn.balance, tokenIn.decimals), this._upScale(tokenIn.weight, 18), this._upScale(bptOut, 18), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const amountIn = this._downScaleUp(scaledAmountIn, tokenIn.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenIn.balance = big_number_1.bn(tokenIn.balance).plus(amountIn).toString();
            this._bptTotalSupply = big_number_1.bn(this._bptTotalSupply).plus(bptOut).toString();
        }
        return amountIn.toString();
    }
    exitExactBptInForTokenOut(tokenOutSymbol, bptIn) {
        const tokenOut = this._tokens.find((t) => t.symbol === tokenOutSymbol);
        if (!tokenOut) {
            throw new Error("Invalid input");
        }
        const scaledAmountOut = math._calcTokenOutGivenExactBptIn(this._upScale(tokenOut.balance, tokenOut.decimals), this._upScale(tokenOut.weight, 18), this._upScale(bptIn, 18), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const amountOut = this._downScaleDown(scaledAmountOut, tokenOut.decimals);
        // In-place balance updates
        if (!this._query) {
            tokenOut.balance = big_number_1.bn(tokenOut.balance).minus(amountOut).toString();
            this._bptTotalSupply = big_number_1.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return amountOut.toString();
    }
    exitExactBptInForTokensOut(bptIn) {
        // Exactly match the EVM version
        if (big_number_1.bn(bptIn).gt(this._bptTotalSupply)) {
            throw new Error("BPT in exceeds total supply");
        }
        const scaledAmountsOut = math._calcTokensOutGivenExactBptIn(this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._upScale(bptIn, 18), this._upScale(this._bptTotalSupply, 18));
        const amountsOut = scaledAmountsOut.map((amount, i) => this._downScaleDown(amount, this._tokens[i].decimals));
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1.bn(token.balance).minus(amountsOut[i]).toString();
            }
            this._bptTotalSupply = big_number_1.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return amountsOut.map((a) => a.toString());
    }
    exitBptInForExactTokensOut(amountsOut) {
        if (Object.keys(amountsOut).length !== this._tokens.length) {
            throw new Error("Invalid input");
        }
        const scaledBptIn = math._calcBptInGivenExactTokensOut(this._tokens.map((t) => this._upScale(t.balance, t.decimals)), this._tokens.map((t) => this._upScale(t.weight, 18)), this._tokens.map((t) => this._upScale(amountsOut[t.symbol], t.decimals)), this._upScale(this._bptTotalSupply, 18), this._upScale(this._swapFeePercentage, 18));
        const bptIn = this._downScaleUp(scaledBptIn, 18);
        // In-place balance updates
        if (!this._query) {
            for (let i = 0; i < this._tokens.length; i++) {
                const token = this._tokens[i];
                token.balance = big_number_1.bn(token.balance)
                    .minus(amountsOut[token.symbol])
                    .toString();
            }
            this._bptTotalSupply = big_number_1.bn(this._bptTotalSupply).minus(bptIn).toString();
        }
        return bptIn.toString();
    }
}
weighted.default = WeightedPool;

Object.defineProperty(src, "__esModule", { value: true });
var WeightedMath_1 = src.WeightedMath = src.WeightedPool = StableMath_1 = src.StableMath = src.StablePool = void 0;
const stable_1 = stable;
src.StablePool = stable_1.default;
const StableMath = math$3;
var StableMath_1 = src.StableMath = StableMath;
const weighted_1 = weighted;
src.WeightedPool = weighted_1.default;
const WeightedMath = math$1;
WeightedMath_1 = src.WeightedMath = WeightedMath;

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
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
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
            },
            tokens: {
                wrappedNativeAsset: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
        },
        pools: {},
    },
    [Network.ARBITRUM]: {
        chainId: Network.ARBITRUM,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x269ff446d9892c9e19082564df3f5e8741e190a1',
            },
            tokens: {
                wrappedNativeAsset: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
        },
        pools: {},
    },
    [Network.KOVAN]: {
        chainId: Network.KOVAN,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x2cc8688C5f75E365aaEEb4ea8D6a480405A48D2A',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
        },
        pools: {},
    },
    [Network.ROPSTEN]: {
        chainId: Network.ROPSTEN,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x53c43764255c17bd724f74c4ef150724ac50a3ed',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
            },
        },
        urls: {
            subgraph: '',
        },
        pools: {},
    },
    [Network.RINKEBY]: {
        chainId: Network.RINKEBY,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x42ad527de7d4e9d9d011ac45b31d8551f8fe9821',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-rinkeby-v2',
        },
        pools: {},
    },
    [Network.GOERLI]: {
        chainId: Network.GOERLI,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e',
            },
            tokens: {
                wrappedNativeAsset: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
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
            default:
                return 'Unknown error';
        }
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
            const expectedBPTOut = StableMath_1._calcBptOutGivenExactTokensIn(new OldBigNumber(parsedAmp), sortedBalances.map((b) => new OldBigNumber(b)), sortedAmounts.map((a) => new OldBigNumber(a)), new OldBigNumber(parsedTotalShares), new OldBigNumber(parsedSwapFee)).toString();
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

const SCALING_FACTOR$5 = 18;
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
            const price = parseFixed(token.price.usd, SCALING_FACTOR$5);
            const balance = parseFixed(token.balance, SCALING_FACTOR$5);
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
                const balance = parseFixed(token.balance, SCALING_FACTOR$5);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed(sumValue, SCALING_FACTOR$5 * 2).toString();
    }
}

class StablePoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const poolClass = StablePool$1.fromPool(pool);
        const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
        return poolClass
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class Stable {
    constructor(exit = new StablePoolExit(), join = new StablePoolJoin(), liquidity = new StablePoolLiquidity(), spotPriceCalculator = new StablePoolSpotPrice()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
    }
}

class WeightedPoolExit {
    constructor() {
        /**
         * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
         * @param {string}  exiter - Account address exiting pool
         * @param {Pool}    pool - Subgraph pool object of pool being exited
         * @param {string}  bptIn - BPT provided for exiting pool
         * @param {string}  slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
         * @param {boolean} shouldUnwrapNativeAsset - Indicates wether wrapped native asset should be unwrapped after exit.
         * @param {string}  wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for exiting to native asset.
         * @param {string}  singleTokenMaxOut - Optional: token address that if provided will exit to given token
         * @returns         transaction request ready to send with signer.sendTransaction
         */
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
                const amountOut = WeightedMath_1._calcTokenOutGivenExactBptIn(new OldBigNumber(sortedBalances[singleTokenMaxOutIndex]), new OldBigNumber(sortedWeights[singleTokenMaxOutIndex]), new OldBigNumber(bptIn), new OldBigNumber(parsedTotalShares), new OldBigNumber(parsedSwapFee)).toString();
                // Apply slippage
                minAmountsOut[singleTokenMaxOutIndex] = subSlippage(BigNumber.from(amountOut), BigNumber.from(slippage)).toString();
                userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(bptIn, singleTokenMaxOutIndex);
            }
            else {
                // Exit pool with all tokens proportinally
                // Calculate amounts out given BPT in
                const amountsOut = WeightedMath_1._calcTokensOutGivenExactBptIn(sortedBalances.map((b) => new OldBigNumber(b)), new OldBigNumber(bptIn), new OldBigNumber(parsedTotalShares)).map((amount) => amount.toString());
                // Apply slippage
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
        /**
         * Build exit pool transaction parameters with exact tokens out and maximum BPT in based on slippage tolerance
         * @param {string}    exiter - Account address exiting pool
         * @param {Pool}      pool - Subgraph pool object of pool being exited
         * @param {string[]}  tokensOut - Tokens provided for exiting pool
         * @param {string[]}  amountsOut - Amoutns provided for exiting pool
         * @param {string}    slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
         * @param {string}    wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for exiting with ETH.
         * @returns           transaction request ready to send with signer.sendTransaction
         */
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
            const bptIn = WeightedMath_1._calcBptInGivenExactTokensOut(sortedBalances.map((b) => new OldBigNumber(b)), sortedWeights.map((w) => new OldBigNumber(w)), sortedAmounts.map((a) => new OldBigNumber(a)), new OldBigNumber(parsedTotalShares), new OldBigNumber(parsedSwapFee)).toString();
            // Apply slippage
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

const SCALING_FACTOR$4 = 18;
class WeightedPoolLiquidity {
    calcTotal(tokens) {
        var _a;
        let sumWeight = Zero;
        let sumValue = Zero;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd, SCALING_FACTOR$4);
            const balance = parseFixed(token.balance, SCALING_FACTOR$4);
            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumWeight = sumWeight.add(token.weight || '0');
        }
        // Scale the known prices of x% of the pool to get value of 100% of the pool.
        const totalWeight = tokens.reduce((total, token) => total.add(token.weight || '0'), Zero);
        if (sumWeight.gt(0)) {
            const liquidity = sumValue.mul(totalWeight).div(sumWeight);
            return formatFixed(liquidity, SCALING_FACTOR$4 * 2);
        }
        return '0';
    }
}

class WeightedPoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const weightedPool = WeightedPool$1.fromPool(pool);
        const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
        return weightedPool
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class Weighted {
    constructor(exit = new WeightedPoolExit(), join = new WeightedPoolJoin(), liquidity = new WeightedPoolLiquidity(), spotPriceCalculator = new WeightedPoolSpotPrice()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
    }
}

class MetaStablePoolExit {
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
            const expectedBPTOut = StableMath_1._calcBptOutGivenExactTokensIn(new OldBigNumber(parsedAmp), scaledBalances.map((b) => new OldBigNumber(b)), scaledAmounts.map((a) => new OldBigNumber(a)), new OldBigNumber(parsedTotalShares), new OldBigNumber(parsedSwapFee)).toString();
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

const SCALING_FACTOR$3 = 18;
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
            const price = parseFixed(token.price.usd, SCALING_FACTOR$3);
            const balance = parseFixed(token.balance, SCALING_FACTOR$3);
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
                const balance = parseFixed(token.balance, SCALING_FACTOR$3);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed(sumValue, SCALING_FACTOR$3 * 2).toString();
    }
}

class MetaStablePoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const poolClass = MetaStablePool.fromPool(pool);
        const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
        return poolClass
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class MetaStable {
    constructor(exit = new MetaStablePoolExit(), join = new MetaStablePoolJoin(), liquidity = new MetaStablePoolLiquidity(), spotPriceCalculator = new MetaStablePoolSpotPrice()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
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

class StablePhantomPoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const poolClass = PhantomStablePool.fromPool(pool);
        const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
        return poolClass
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class StablePhantom {
    constructor(exit = new StablePhantomPoolExit(), join = new StablePhantomPoolJoin(), liquidity = new StablePhantomPoolLiquidity(), spotPriceCalculator = new StablePhantomPoolSpotPrice()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
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

const SCALING_FACTOR$2 = 18;
const ONE = parseFixed('1', SCALING_FACTOR$2);
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
            const price = parseFixed(token.price.usd, SCALING_FACTOR$2);
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
                const priceRate = parseFixed(token.priceRate || '1', SCALING_FACTOR$2);
                // Apply priceRate to scale the balance correctly
                const balance = parseFixed(token.balance, SCALING_FACTOR$2)
                    .mul(priceRate)
                    .div(ONE);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        const totalLiquidity = formatFixed(sumValue, SCALING_FACTOR$2 * 2).toString();
        return totalLiquidity;
    }
}

class LinearPoolSpotPrice {
    calcPoolSpotPrice(tokenIn, tokenOut, pool) {
        const poolClass = LinearPool.fromPool(pool);
        const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
        return poolClass
            ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
            .toString();
    }
}

class Linear {
    constructor(exit = new LinearPoolExit(), join = new LinearPoolJoin(), liquidity = new LinearPoolLiquidity(), spotPriceCalculator = new LinearPoolSpotPrice()) {
        this.exit = exit;
        this.join = join;
        this.liquidity = liquidity;
        this.spotPriceCalculator = spotPriceCalculator;
    }
}

class Pools {
    constructor(config, weighted = new Weighted(), stable = new Stable(), metaStable = new MetaStable(), stablePhantom = new StablePhantom(), linear = new Linear()) {
        this.weighted = weighted;
        this.stable = stable;
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

const SCALING_FACTOR$1 = 36;
const TOKEN_WEIGHT_SCALING_FACTOR = 18;
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
            const liquidity = await this.getLiquidity(pool);
            const scaledLiquidity = parseFixed(liquidity, SCALING_FACTOR$1 * 2);
            const totalBPT = parseFixed(pool.totalShares, SCALING_FACTOR$1);
            const bptValue = scaledLiquidity.div(totalBPT);
            const bptInParentPool = parseFixed(token.balance, SCALING_FACTOR$1);
            const liquidityInParentPool = formatFixed(bptValue.mul(bptInParentPool), SCALING_FACTOR$1).replace(/\.[0-9]+/, ''); // strip trailing decimals, we don't need them as we're already scaled up by 1e36
            return {
                address: pool.address,
                liquidity: liquidityInParentPool,
            };
        }));
        const totalSubPoolLiquidity = subPoolLiquidity.reduce((totalLiquidity, subPool) => {
            if (!subPool)
                return Zero;
            return totalLiquidity.add(subPool.liquidity);
        }, Zero);
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
                weight: token.weight
                    ? parseFixed(token.weight, TOKEN_WEIGHT_SCALING_FACTOR).toString()
                    : '0',
            };
            return poolToken;
        }));
        const tokenLiquidity = Pools.from(pool.poolType).liquidity.calcTotal(tokenBalances);
        const totalLiquidity = formatFixed(BigNumber.from(totalSubPoolLiquidity).add(parseFixed(tokenLiquidity, SCALING_FACTOR$1)), SCALING_FACTOR$1);
        return totalLiquidity;
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
var Investment_OrderBy;
(function (Investment_OrderBy) {
    Investment_OrderBy["Amount"] = "amount";
    Investment_OrderBy["AssetManagerAddress"] = "assetManagerAddress";
    Investment_OrderBy["Id"] = "id";
    Investment_OrderBy["PoolTokenId"] = "poolTokenId";
    Investment_OrderBy["Timestamp"] = "timestamp";
})(Investment_OrderBy || (Investment_OrderBy = {}));
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
/** Defines the order direction, either ascending or descending */
var OrderDirection;
(function (OrderDirection) {
    OrderDirection["Asc"] = "asc";
    OrderDirection["Desc"] = "desc";
})(OrderDirection || (OrderDirection = {}));
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
    PoolToken_OrderBy["Balance"] = "balance";
    PoolToken_OrderBy["Decimals"] = "decimals";
    PoolToken_OrderBy["Id"] = "id";
    PoolToken_OrderBy["managedBalance"] = "managedBalance";
    PoolToken_OrderBy["Managements"] = "managements";
    PoolToken_OrderBy["Name"] = "name";
    PoolToken_OrderBy["PoolId"] = "poolId";
    PoolToken_OrderBy["PriceRate"] = "priceRate";
    PoolToken_OrderBy["Symbol"] = "symbol";
    PoolToken_OrderBy["Token"] = "token";
    PoolToken_OrderBy["Weight"] = "weight";
})(PoolToken_OrderBy || (PoolToken_OrderBy = {}));
var Pool_OrderBy;
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
    Pool_OrderBy["Owner"] = "owner";
    Pool_OrderBy["PoolType"] = "poolType";
    Pool_OrderBy["PriceRateProviders"] = "priceRateProviders";
    Pool_OrderBy["PrincipalToken"] = "principalToken";
    Pool_OrderBy["Shares"] = "shares";
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
})(Pool_OrderBy || (Pool_OrderBy = {}));
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
    Token_OrderBy["Name"] = "name";
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
var User_OrderBy;
(function (User_OrderBy) {
    User_OrderBy["Id"] = "id";
    User_OrderBy["SharesOwned"] = "sharesOwned";
    User_OrderBy["Swaps"] = "swaps";
    User_OrderBy["UserInternalBalances"] = "userInternalBalances";
})(User_OrderBy || (User_OrderBy = {}));
var _SubgraphErrorPolicy_;
(function (_SubgraphErrorPolicy_) {
    /** Data will be returned even if the subgraph has indexing errors */
    _SubgraphErrorPolicy_["Allow"] = "allow";
    /** If the subgraph has indexing errors, data will be omitted. The default. */
    _SubgraphErrorPolicy_["Deny"] = "deny";
})(_SubgraphErrorPolicy_ || (_SubgraphErrorPolicy_ = {}));
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
  principalToken
  baseToken
  swapEnabled
  wrappedIndex
  mainIndex
  lowerTarget
  upperTarget
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
const PoolsDocument = gql$1 `
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
const defaultWrapper = (action, _operationName, _operationType) => action();
function getSdk(client, withWrapper = defaultWrapper) {
    return {
        Pools(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(PoolsDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'Pools', 'query');
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

function createSubgraphClient(subgraphUrl) {
    const client = new GraphQLClient(subgraphUrl);
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
        // TO DO - Make this part of class to make more flexible?
        if (pool.poolType === 'Weighted' ||
            pool.poolType === 'LiquidityBootstrapping' ||
            pool.poolType === 'Investment') {
            multiPool.call(`${pool.id}.weights`, pool.address, 'getNormalizedWeights');
            multiPool.call(`${pool.id}.swapFee`, pool.address, 'getSwapFeePercentage');
        }
        else if (pool.poolType === 'Stable' ||
            pool.poolType === 'MetaStable' ||
            pool.poolType === 'StablePhantom') {
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
            const { poolTokens, swapFee, weights, totalSupply, virtualSupply } = onchainData;
            if (subgraphPools[index].poolType === 'Stable' ||
                subgraphPools[index].poolType === 'MetaStable' ||
                subgraphPools[index].poolType === 'StablePhantom') {
                if (!onchainData.amp) {
                    console.error(`Stable Pool Missing Amp: ${poolId}`);
                    return;
                }
                else {
                    // Need to scale amp by precision to match expected Subgraph scale
                    // amp is stored with 3 decimals of precision
                    subgraphPools[index].amp = formatFixed(onchainData.amp[0], 3);
                }
            }
            if (subgraphPools[index].poolType.includes('Linear')) {
                if (!onchainData.targets) {
                    console.error(`Linear Pool Missing Targets: ${poolId}`);
                    return;
                }
                else {
                    subgraphPools[index].lowerTarget = formatFixed(onchainData.targets[0], 18);
                    subgraphPools[index].upperTarget = formatFixed(onchainData.targets[1], 18);
                }
                const wrappedIndex = subgraphPools[index].wrappedIndex;
                if (wrappedIndex === undefined || onchainData.rate === undefined) {
                    console.error(`Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`);
                    return;
                }
                // Update priceRate of wrappedToken
                subgraphPools[index].tokens[wrappedIndex].priceRate = formatFixed(onchainData.rate, 18);
            }
            subgraphPools[index].swapFee = formatFixed(swapFee, 18);
            poolTokens.tokens.forEach((token, i) => {
                const T = subgraphPools[index].tokens.find((t) => isSameAddress(t.address, token));
                if (!T)
                    throw `Pool Missing Expected Token: ${poolId} ${token}`;
                T.balance = formatFixed(poolTokens.balances[i], T.decimals);
                if (weights) {
                    // Only expected for WeightedPools
                    T.weight = formatFixed(weights[i], 18);
                }
            });
            // Pools with pre minted BPT
            if (subgraphPools[index].poolType.includes('Linear') ||
                subgraphPools[index].poolType === 'StablePhantom') {
                if (virtualSupply === undefined) {
                    console.error(`Pool with pre-minted BPT missing Virtual Supply: ${poolId}`);
                    return;
                }
                subgraphPools[index].totalShares = formatFixed(virtualSupply, 18);
            }
            else {
                subgraphPools[index].totalShares = formatFixed(totalSupply, 18);
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
            orderBy: Pool_OrderBy.TotalLiquidity,
            orderDirection: OrderDirection.Desc,
        });
        const pools = [...pool0, ...pool1000];
        return pools;
    }
    async getNonLinearPools() {
        const { pools } = await this.client.PoolsWithoutLinear({
            where: { swapEnabled: true, totalShares_gt: '0' },
            orderBy: Pool_OrderBy.TotalLiquidity,
            orderDirection: OrderDirection.Desc,
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

class Sor extends SOR {
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
        if (sorOrConfig instanceof SOR) {
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
        return getSdk(client);
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
        this.pools = new Pools(config);
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
     * Calculates Spot Price for a token pair - for specific pool if ID otherwise finds most liquid path and uses this as reference SP.
     * @param { string } tokenIn Token in address.
     * @param { string } tokenOut Token out address.
     * @param { string } poolId Optional - if specified this pool will be used for SP calculation.
     * @param { SubgraphPoolBase[] } pools Optional - Pool data. Will be fetched via dataProvider if not supplied.
     * @returns  { string } Spot price.
     */
    async getSpotPrice(tokenIn, tokenOut, poolId = '', pools = []) {
        // If pools list isn't supplied fetch it from swaps data provider
        if (pools.length === 0) {
            await this.fetchPools();
            pools = this.getPools();
        }
        // If a poolId isn't specified we find the path for the pair with the highest liquidity and use this as the ref SP
        if (poolId === '') {
            const poolsDict = parseToPoolsDict(pools, 0);
            // This creates all paths for tokenIn>Out ordered by liquidity
            const paths = this.swaps.sor.routeProposer.getCandidatePathsFromDict(tokenIn, tokenOut, 0, poolsDict, 4);
            if (paths.length === 0)
                throw new BalancerError(BalancerErrorCode.UNSUPPORTED_PAIR);
            return getSpotPriceAfterSwapForPath(paths[0], 0, ZERO).toString();
        }
        else {
            // Find pool of interest from pools list
            const poolData = pools.find((p) => p.id.toLowerCase() === poolId.toLowerCase());
            if (!poolData)
                throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
            const pool = Pools.from(poolData.poolType);
            return pool.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, poolData);
        }
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

/**
 * Building pools from raw data injecting poolType specific methods
 */
class PoolsProvider {
    constructor(config, repository) {
        this.config = config;
        this.repository = repository;
    }
    static wrap(data, config) {
        const methods = Pools.from(data.poolType);
        const networkConfig = getNetworkConfig(config);
        return {
            ...data,
            liquidity: async () => methods.liquidity.calcTotal(data.tokens),
            buildJoin: (joiner, tokensIn, amountsIn, slippage) => methods.join.buildJoin({
                joiner,
                pool: data,
                tokensIn,
                amountsIn,
                slippage,
                wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
            }),
            buildExitExactBPTIn: (exiter, bptIn, slippage, shouldUnwrapNativeAsset = false, singleTokenMaxOut) => methods.exit.buildExitExactBPTIn({
                exiter,
                pool: data,
                bptIn,
                slippage,
                shouldUnwrapNativeAsset,
                wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
                singleTokenMaxOut,
            }),
            buildExitExactTokensOut: (exiter, tokensOut, amountsOut, slippage) => methods.exit.buildExitExactTokensOut({
                exiter,
                pool: data,
                tokensOut,
                amountsOut,
                slippage,
                wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
            }),
            // TODO: spotPrice fails, because it needs a subgraphType,
            // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
            // spotPrice: async (tokenIn: string, tokenOut: string) =>
            //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
        };
    }
    async find(id) {
        const data = await this.repository.find(id);
        if (!data)
            return;
        return PoolsProvider.wrap(data, this.config);
    }
    async findBy(param, value) {
        if (param == 'id') {
            return this.find(value);
        }
        else if (param == 'address') {
            const data = await this.repository.findBy('address', value);
            if (!data)
                return;
            return PoolsProvider.wrap(data, this.config);
        }
        else {
            throw `search by ${param} not implemented`;
        }
    }
}

class SubgraphPoolRepository {
    constructor(client) {
        this.client = client;
    }
    async find(id) {
        const { pool } = await this.client.Pool({ id });
        return this.mapPool(pool);
    }
    async findBy(attribute, value) {
        switch (attribute) {
            case 'id':
                return this.find(value);
            case 'address':
                // eslint-disable-next-line no-case-declarations
                const { pool0 } = await this.client.Pools({
                    where: { address: value },
                });
                return this.mapPool(pool0[0]);
            default:
                return undefined;
        }
    }
    // Helper methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapPool(pool) {
        if (!pool)
            return undefined;
        const poolType = pool === null || pool === void 0 ? void 0 : pool.poolType;
        if (!poolType)
            throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
        const tokens = (pool === null || pool === void 0 ? void 0 : pool.tokens) || [];
        if (tokens.length === 0)
            throw new BalancerError(BalancerErrorCode.MISSING_TOKENS);
        return {
            ...pool,
            poolType,
            tokens,
        };
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
            id: '0x9B532AB955417AFD0D012EB9F7389457CD0EA712000000000000000000000338',
            address: '0x9B532AB955417AFD0D012EB9F7389457CD0EA712',
            gauge: '0x66122c9030030155fb2bbe2e1e9a72588065c4f5',
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

class BalancerSDK {
    constructor(config, sor = new Sor(config), subgraph = new Subgraph(config), pools = new Pools(config), poolsProvider = new PoolsProvider(config, new SubgraphPoolRepository(subgraph.client))) {
        this.config = config;
        this.sor = sor;
        this.subgraph = subgraph;
        this.pools = pools;
        this.poolsProvider = poolsProvider;
        this.swaps = new Swaps(this.config);
        this.relayer = new Relayer(this.swaps);
        this.pricing = new Pricing(config, this.swaps);
        const networkConfig = getNetworkConfig(config);
        this.balancerContracts = new Contracts(networkConfig.addresses.contracts, sor.provider);
        this.zaps = new Zaps(networkConfig.chainId);
    }
    get networkConfig() {
        return getNetworkConfig(this.config);
    }
    /**
     * Expose balancer contracts, e.g. Vault, LidoRelayer.
     */
    get contracts() {
        return this.balancerContracts.contracts;
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
                price.usd = formatFixed(usdPrice, SCALING_FACTOR);
            }
        }
    }
    async find(address) {
        const price = this.tokenPrices[address];
        if (!price)
            return;
        return price;
    }
}

export { AaveHelpers, AssetHelpers, BalancerError, BalancerErrorCode, BalancerErrors, BalancerMinterAuthorization, BalancerSDK, FallbackPoolRepository, Liquidity, ManagedPoolEncoder, Network, PoolBalanceOpKind, PoolSpecialization, PoolType, Pools, Relayer, RelayerAction, RelayerAuthorization, Sor, StablePhantomPoolJoinKind, StablePoolEncoder, StablePoolExitKind, StablePoolJoinKind, StaticPoolRepository, StaticTokenPriceProvider, StaticTokenProvider, Subgraph, SubgraphPoolRepository, SwapType, Swaps, UserBalanceOpKind, WeightedPoolEncoder, WeightedPoolExitKind, WeightedPoolJoinKind, accountToAddress, getLimitsForSlippage, getPoolAddress, getPoolNonce, getPoolSpecialization, isNormalizedWeights, isSameAddress, parsePoolInfo, signPermit, splitPoolId, toNormalizedWeights };
//# sourceMappingURL=index.esm.js.map
