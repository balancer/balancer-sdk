import require$$0$1, { defaultAbiCoder, Interface, AbiCoder, Fragment, ConstructorFragment, ErrorFragment, EventFragment, FunctionFragment, ParamType, FormatTypes, checkResultErrors, LogDescription, TransactionDescription, Indexed } from '@ethersproject/abi';
import { WeiPerEther, Zero as Zero$1, MaxUint256 as MaxUint256$1, AddressZero, HashZero } from '@ethersproject/constants';
import { BigNumber, parseFixed as parseFixed$1, formatFixed } from '@ethersproject/bignumber';
import require$$1, { getAddress, getIcapAddress, getContractAddress, getCreate2Address, isAddress } from '@ethersproject/address';
import require$$4, { hexZeroPad, hexValue, splitSignature, arrayify, hexlify, concat, hexConcat, isHexString, hexDataLength, isBytesLike, hexDataSlice, stripZeros, zeroPad, joinSignature, isBytes, hexStripZeros } from '@ethersproject/bytes';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { mergeWith, set, parseInt as parseInt$1, keyBy, sum, pickBy, zipObject, identity } from 'lodash';
import OldBigNumber, { BigNumber as BigNumber$1 } from 'bignumber.js';
import { StablePool as StablePool$1, ZERO, WeightedPool as WeightedPool$1, MetaStablePool, PhantomStablePool, LinearPool, SwapTypes, PoolFilter, SOR, parseToPoolsDict, getSpotPriceAfterSwapForPath } from '@balancer-labs/sor';
export { PoolFilter, RouteProposer, SOR, SwapTypes, formatSequence, getTokenAddressesForSwap, parseToPoolsDict, phantomStableBPTForTokensZeroPriceImpact, queryBatchSwapTokensIn, queryBatchSwapTokensOut, stableBPTForTokensZeroPriceImpact, weightedBPTForTokensZeroPriceImpact } from '@balancer-labs/sor';
import require$$0, { GraphQLClient } from 'graphql-request';
import { Vault__factory, LidoRelayer__factory } from '@balancer-labs/typechain';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parse as parse$1 } from 'graphql';
import axios from 'axios';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';

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
    const sum = weights.reduce((total, weight) => total.add(weight), Zero$1);
    if (sum.eq(WeiPerEther))
        return weights;
    const normalizedWeights = [];
    let normalizedSum = Zero$1;
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
    const totalWeight = weights.reduce((total, weight) => total.add(weight), Zero$1);
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
RelayerAuthorization.signAuthorizationFor = async (type, validator, user, allowedSender, allowedCalldata, deadline = MaxUint256$1, nonce) => {
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
BalancerMinterAuthorization.signSetMinterApproval = async (minterContract, minter, approval, user, deadline = MaxUint256$1, nonce) => {
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

const signPermit = async (token, owner, spender, amount, deadline = MaxUint256$1, nonce) => {
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

var GraphQLFilterOperator;
(function (GraphQLFilterOperator) {
    GraphQLFilterOperator[GraphQLFilterOperator["GreaterThan"] = 0] = "GreaterThan";
    GraphQLFilterOperator[GraphQLFilterOperator["LessThan"] = 1] = "LessThan";
    GraphQLFilterOperator[GraphQLFilterOperator["Equals"] = 2] = "Equals";
    GraphQLFilterOperator[GraphQLFilterOperator["In"] = 3] = "In";
    GraphQLFilterOperator[GraphQLFilterOperator["NotIn"] = 4] = "NotIn";
    GraphQLFilterOperator[GraphQLFilterOperator["Contains"] = 5] = "Contains";
})(GraphQLFilterOperator || (GraphQLFilterOperator = {}));

class BalancerAPIArgsFormatter {
    constructor() {
        this.operatorMap = {
            [GraphQLFilterOperator.GreaterThan]: 'gt',
            [GraphQLFilterOperator.LessThan]: 'lt',
            [GraphQLFilterOperator.Equals]: 'eq',
            [GraphQLFilterOperator.In]: 'in',
            [GraphQLFilterOperator.NotIn]: 'not_in',
            [GraphQLFilterOperator.Contains]: 'contains',
        };
    }
    format(args) {
        const whereQuery = {};
        if (args.where) {
            Object.entries(args.where).forEach(([name, filter]) => {
                whereQuery[name] = {
                    [this.operatorMap[filter.operator]]: filter.value,
                };
            });
        }
        return {
            ...args,
            ...{ where: whereQuery },
        };
    }
}

class SubgraphArgsFormatter {
    constructor() {
        this.operatorMap = {
            [GraphQLFilterOperator.GreaterThan]: '_gt',
            [GraphQLFilterOperator.LessThan]: '_lt',
            [GraphQLFilterOperator.Equals]: '',
            [GraphQLFilterOperator.In]: '_in',
            [GraphQLFilterOperator.NotIn]: '_not_in',
            [GraphQLFilterOperator.Contains]: '_contains',
        };
    }
    format(args) {
        const whereQuery = {};
        if (args.where) {
            Object.entries(args.where).forEach(([name, filter]) => {
                whereQuery[`${name}${this.operatorMap[filter.operator]}`] =
                    filter.value;
            });
        }
        return {
            ...args,
            ...{ where: whereQuery },
        };
    }
}

function GreaterThan(value) {
    return {
        operator: GraphQLFilterOperator.GreaterThan,
        value,
    };
}
function LessThan(value) {
    return {
        operator: GraphQLFilterOperator.LessThan,
        value,
    };
}
function Equals(value) {
    return {
        operator: GraphQLFilterOperator.Equals,
        value,
    };
}
function In(value) {
    return {
        operator: GraphQLFilterOperator.In,
        value,
    };
}
function NotIn(value) {
    return {
        operator: GraphQLFilterOperator.NotIn,
        value,
    };
}
function Contains(value) {
    return {
        operator: GraphQLFilterOperator.Contains,
        value,
    };
}
const Op = {
    GreaterThan,
    LessThan,
    Equals,
    In,
    NotIn,
    Contains,
};
class GraphQLArgsBuilder {
    constructor(args) {
        this.args = args;
    }
    merge(other) {
        const mergedArgs = mergeWith(this.args, other.args, (objValue, srcValue) => {
            if (Array.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        });
        return new GraphQLArgsBuilder(mergedArgs);
    }
    format(formatter) {
        return formatter.format(this.args);
    }
}

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
    const limits = new Array(assets.length).fill(Zero$1);
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
    Network[Network["OPTIMISM"] = 10] = "OPTIMISM";
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

const SCALING_FACTOR$2 = 18;
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
        return formatFixed(sumValue, SCALING_FACTOR$2 * 2).toString();
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

class StablePoolJoin {
    async buildJoin({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) {
        // TODO implementation
        console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
        throw new Error('To be implemented');
    }
}

class Stable {
    constructor(liquidityConcern = StablePoolLiquidity, spotPriceCalculatorConcern = StablePoolSpotPrice, joinConcern = StablePoolJoin) {
        this.liquidityConcern = liquidityConcern;
        this.spotPriceCalculatorConcern = spotPriceCalculatorConcern;
        this.joinConcern = joinConcern;
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.join = new this.joinConcern();
    }
}

class WeightedPoolLiquidity {
    calcTotal(tokens) {
        var _a;
        let sumWeight = new BigNumber$1(0);
        let sumValue = new BigNumber$1(0);
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = new BigNumber$1(token.price.usd);
            const balance = new BigNumber$1(token.balance);
            const value = balance.times(price);
            sumValue = sumValue.plus(value);
            sumWeight = sumWeight.plus(token.weight || '0');
        }
        // Scale the known prices of x% of the pool to get value of 100% of the pool.
        const totalWeight = tokens.reduce((total, token) => total.plus(token.weight || '0'), new BigNumber$1(0));
        if (sumWeight.gt(0)) {
            const liquidity = sumValue.times(totalWeight).div(sumWeight);
            return liquidity.toString();
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

const version$h = "logger/5.6.0";

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
            _globalLogger = new Logger(version$h);
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

var lib_esm$h = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get LogLevel () { return LogLevel; },
    get ErrorCode () { return ErrorCode; },
    Logger: Logger
});

const version$g = "units/5.6.1";

const logger$h = new Logger(version$g);
const names = [
    "wei",
    "kwei",
    "mwei",
    "gwei",
    "szabo",
    "finney",
    "ether",
];
// Some environments have issues with RegEx that contain back-tracking, so we cannot
// use them.
function commify(value) {
    const comps = String(value).split(".");
    if (comps.length > 2 || !comps[0].match(/^-?[0-9]*$/) || (comps[1] && !comps[1].match(/^[0-9]*$/)) || value === "." || value === "-.") {
        logger$h.throwArgumentError("invalid value", "value", value);
    }
    // Make sure we have at least one whole digit (0 if none)
    let whole = comps[0];
    let negative = "";
    if (whole.substring(0, 1) === "-") {
        negative = "-";
        whole = whole.substring(1);
    }
    // Make sure we have at least 1 whole digit with no leading zeros
    while (whole.substring(0, 1) === "0") {
        whole = whole.substring(1);
    }
    if (whole === "") {
        whole = "0";
    }
    let suffix = "";
    if (comps.length === 2) {
        suffix = "." + (comps[1] || "0");
    }
    while (suffix.length > 2 && suffix[suffix.length - 1] === "0") {
        suffix = suffix.substring(0, suffix.length - 1);
    }
    const formatted = [];
    while (whole.length) {
        if (whole.length <= 3) {
            formatted.unshift(whole);
            break;
        }
        else {
            const index = whole.length - 3;
            formatted.unshift(whole.substring(index));
            whole = whole.substring(0, index);
        }
    }
    return negative + formatted.join(",") + suffix;
}
function formatUnits$1(value, unitName) {
    if (typeof (unitName) === "string") {
        const index = names.indexOf(unitName);
        if (index !== -1) {
            unitName = 3 * index;
        }
    }
    return formatFixed(value, (unitName != null) ? unitName : 18);
}
function parseUnits(value, unitName) {
    if (typeof (value) !== "string") {
        logger$h.throwArgumentError("value must be a string", "value", value);
    }
    if (typeof (unitName) === "string") {
        const index = names.indexOf(unitName);
        if (index !== -1) {
            unitName = 3 * index;
        }
    }
    return parseFixed$1(value, (unitName != null) ? unitName : 18);
}
function formatEther(wei) {
    return formatUnits$1(wei, 18);
}
function parseEther(ether) {
    return parseUnits(ether, 18);
}

var lib_esm$g = /*#__PURE__*/Object.freeze({
    __proto__: null,
    commify: commify,
    formatUnits: formatUnits$1,
    parseUnits: parseUnits,
    formatEther: formatEther,
    parseEther: parseEther
});

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getAugmentedNamespace(n) {
	if (n.__esModule) return n;
	var a = Object.defineProperty({}, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
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

var common$6 = {};

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
}(common$6));

var base$1 = {};

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

Object.defineProperty(base$1, "__esModule", { value: true });
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
base$1.default = BasePool;

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
const common_1$1 = common$6;
const base_1$1 = base$1;
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
const common_1 = common$6;
const base_1 = base$1;
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
var WeightedMath_1 = src.WeightedMath = src.WeightedPool = src.StableMath = src.StablePool = void 0;
const stable_1 = stable;
src.StablePool = stable_1.default;
const StableMath = math$3;
src.StableMath = StableMath;
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
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
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
            gaugesSubgraph: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges',
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
        },
        pools: {},
    },
    [Network.OPTIMISM]: {
        chainId: Network.OPTIMISM,
        addresses: {
            contracts: {
                vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
                multicall: '0x2dc0e2aa608532da689e89e237df582b783e552c',
                gaugeController: '',
                feeDistributor: '',
            },
            tokens: {
                wrappedNativeAsset: '0x4200000000000000000000000000000000000006',
                bal: '',
                veBal: '',
                bbaUsd: '',
            },
        },
        urls: {
            subgraph: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism',
            gaugesSubgraph: '',
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
    BalancerErrorCode["INPUT_LENGTH_MISMATCH"] = "INPUT_LENGTH_MISMATCH";
    BalancerErrorCode["MISSING_DECIMALS"] = "MISSING_DECIMALS";
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
            case BalancerErrorCode.INPUT_LENGTH_MISMATCH:
                return 'input length mismatch';
            case BalancerErrorCode.MISSING_DECIMALS:
                return 'missing decimals';
            case BalancerErrorCode.MISSING_WEIGHT:
                return 'missing weight';
            default:
                return 'Unknown error';
        }
    }
}

class WeightedPoolJoin {
    constructor() {
        // Static
        // Helper methods
        /**
         * Sort BPT calc. inputs alphabetically by token addresses as required by calcBptOutGivenExactTokensIn
         */
        this.sortCalcInputs = (poolTokens, poolBalances, poolWeights, poolDecimals, tokensIn, amountsIn, wrappedNativeAsset) => {
            const assetHelpers = new AssetHelpers(wrappedNativeAsset);
            const [tokens, amounts] = assetHelpers.sortTokens(tokensIn, amountsIn);
            const [, balances, weights, decimals] = assetHelpers.sortTokens(poolTokens, poolBalances, poolWeights, poolDecimals);
            return {
                tokens,
                balances,
                weights,
                amounts,
                decimals,
            };
        };
        /**
         * Parse pool info into EVM amounts
         * @param {Pool}  pool
         * @returns       parsed pool info
         */
        this.parsePoolInfo = (pool) => {
            const decimals = pool.tokens.map((token) => {
                if (!token.decimals)
                    throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
                return token.decimals;
            });
            const weights = pool.tokens.map((token) => {
                if (!token.weight)
                    throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
                return parseUnits(token.weight).toString();
            });
            const tokens = pool.tokens.map((token) => token.address);
            const balances = pool.tokens.map((token) => parseFixed$1(token.balance, token.decimals).toString());
            const totalShares = parseUnits(pool.totalShares).toString();
            const swapFee = parseUnits(pool.swapFee).toString();
            return {
                tokens,
                balances,
                weights,
                decimals,
                totalShares,
                swapFee,
            };
        };
    }
    /**
     * Encode joinPool in an ABI byte string
     *
     * [See method for a join pool](https://dev.balancer.fi/references/contracts/apis/the-vault#joinpool).
     *
     * _NB: This method doesn't execute a join pool -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
     * containing the data of the function call on a contract, which can then be sent to the network to be executed.
     * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
     *
     * @param {JoinPool}          joinPool - join pool information to be encoded
     * @param {string}            joinPool.poolId - id of pool being joined
     * @param {string}            joinPool.sender - account address sending tokens to join pool
     * @param {string}            joinPool.recipient - account address receiving BPT after joining pool
     * @param {JoinPoolRequest}   joinPool.joinPoolRequest - object containing join pool request information
     * @returns {string}          encodedJoinPoolData - Returns an ABI byte string containing the data of the function call on a contract
     */
    static encodeJoinPool({ poolId, sender, recipient, joinPoolRequest, }) {
        const vaultInterface = Vault__factory.createInterface();
        return vaultInterface.encodeFunctionData('joinPool', [
            poolId,
            sender,
            recipient,
            joinPoolRequest,
        ]);
    }
    // Join Concern Interface
    /**
     * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
     * @param {JoinPoolParameters} params - parameters used to build exact tokens in for bpt out transaction
     * @param {string}                          params.joiner - Account address joining pool
     * @param {SubgraphPoolBase}                params.pool - Subgraph pool object of pool being joined
     * @param {string[]}                        params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
     * @param {string[]}                        params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
     * @param {string}                          params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
     * @returns                                 transaction request ready to send with signer.sendTransaction
     */
    async buildJoin({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) {
        if (tokensIn.length != amountsIn.length ||
            tokensIn.length != pool.tokensList.length) {
            throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
        }
        const parsedPoolInfo = this.parsePoolInfo(pool); // Parse pool info into EVM amounts in order to match amountsIn scalling
        const sortedCalcInputs = this.sortCalcInputs(parsedPoolInfo.tokens, parsedPoolInfo.balances, parsedPoolInfo.weights, parsedPoolInfo.decimals, tokensIn, amountsIn, wrappedNativeAsset);
        const expectedBPTOut = WeightedMath_1._calcBptOutGivenExactTokensIn(sortedCalcInputs.balances.map((b) => new OldBigNumber(b)), sortedCalcInputs.weights.map((w) => new OldBigNumber(w)), sortedCalcInputs.amounts.map((a) => new OldBigNumber(a)), new OldBigNumber(parsedPoolInfo.totalShares), new OldBigNumber(parsedPoolInfo.swapFee)).toString();
        const minBPTOut = subSlippage(BigNumber.from(expectedBPTOut), BigNumber.from(slippage)).toString();
        const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(sortedCalcInputs.amounts, minBPTOut);
        const to = balancerVault;
        const functionName = 'joinPool';
        const attributes = {
            poolId: pool.id,
            sender: joiner,
            recipient: joiner,
            joinPoolRequest: {
                assets: sortedCalcInputs.tokens,
                maxAmountsIn: sortedCalcInputs.amounts,
                userData,
                fromInternalBalance: false,
            },
        };
        const data = WeightedPoolJoin.encodeJoinPool(attributes);
        const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
        const value = values[0] ? BigNumber.from(values[0]) : undefined;
        return { to, functionName, attributes, data, value, minBPTOut };
    }
}

class Weighted {
    constructor(liquidityConcern = WeightedPoolLiquidity, spotPriceCalculatorConcern = WeightedPoolSpotPrice, joinConcern = WeightedPoolJoin) {
        this.liquidityConcern = liquidityConcern;
        this.spotPriceCalculatorConcern = spotPriceCalculatorConcern;
        this.joinConcern = joinConcern;
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.join = new this.joinConcern();
    }
}

const SCALING_FACTOR$1 = 18;
class MetaStablePoolLiquidity {
    calcTotal(tokens) {
        var _a, _b;
        let sumBalance = Zero$1;
        let sumValue = Zero$1;
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
                const balance = parseFixed(token.balance, SCALING_FACTOR$1);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        return formatFixed(sumValue, SCALING_FACTOR$1 * 2).toString();
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

class MetaStablePoolJoin {
    async buildJoin({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) {
        // TODO implementation
        console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
        throw new Error('To be implemented');
    }
}

class MetaStable {
    constructor(liquidityConcern = MetaStablePoolLiquidity, spotPriceCalculatorConcern = MetaStablePoolSpotPrice, joinConcern = MetaStablePoolJoin) {
        this.liquidityConcern = liquidityConcern;
        this.spotPriceCalculatorConcern = spotPriceCalculatorConcern;
        this.joinConcern = joinConcern;
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.join = new this.joinConcern();
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

class StablePhantomPoolJoin {
    async buildJoin({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) {
        // TODO implementation
        console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
        throw new Error('To be implemented');
    }
}

class StablePhantom {
    constructor(liquidityConcern = StablePhantomPoolLiquidity, spotPriceCalculatorConcern = StablePhantomPoolSpotPrice, joinConcern = StablePhantomPoolJoin) {
        this.liquidityConcern = liquidityConcern;
        this.spotPriceCalculatorConcern = spotPriceCalculatorConcern;
        this.joinConcern = joinConcern;
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.join = new this.joinConcern();
    }
}

const SCALING_FACTOR = 18;
const ONE = parseFixed('1', SCALING_FACTOR);
class LinearPoolLiquidity {
    calcTotal(tokens) {
        var _a, _b;
        let sumBalance = Zero$1;
        let sumValue = Zero$1;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // if a token's price is unknown, ignore it
            // it will be computed at the next step
            if (!((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd)) {
                continue;
            }
            const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR);
            const balance = parseFixed(token.balance, SCALING_FACTOR);
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
                const priceRate = parseFixed(token.priceRate || '1', SCALING_FACTOR);
                // Apply priceRate to scale the balance correctly
                const balance = parseFixed(token.balance, SCALING_FACTOR)
                    .mul(priceRate)
                    .div(ONE);
                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }
        const totalLiquidity = formatFixed(sumValue, SCALING_FACTOR * 2).toString();
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

class LinearPoolJoin {
    async buildJoin({ joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset, }) {
        // TODO implementation
        console.log(joiner, pool, tokensIn, amountsIn, slippage, wrappedNativeAsset);
        throw new Error('To be implemented');
    }
}

class Linear {
    constructor(liquidityConcern = LinearPoolLiquidity, spotPriceCalculatorConcern = LinearPoolSpotPrice, joinConcern = LinearPoolJoin) {
        this.liquidityConcern = liquidityConcern;
        this.spotPriceCalculatorConcern = spotPriceCalculatorConcern;
        this.joinConcern = joinConcern;
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.join = new this.joinConcern();
    }
}

/**
 * Wrapper around pool type specific methods.
 *
 * Returns a class instance of a type specific method handlers.
 */
class PoolTypeConcerns {
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
            const liquidity = new BigNumber$1(await this.getLiquidity(pool));
            const totalBPT = new BigNumber$1(pool.totalShares);
            const bptValue = liquidity.div(totalBPT);
            const bptInParentPool = new BigNumber$1(token.balance);
            const liquidityInParentPool = bptValue.times(bptInParentPool);
            return {
                address: pool.address,
                liquidity: liquidityInParentPool.toString(),
            };
        }));
        const totalSubPoolLiquidity = subPoolLiquidity.reduce((totalLiquidity, subPool) => {
            if (!subPool)
                return new BigNumber$1(0);
            return totalLiquidity.plus(subPool.liquidity);
        }, new BigNumber$1(0));
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
        const totalLiquidity = new BigNumber$1(totalSubPoolLiquidity).plus(tokenLiquidity);
        return totalLiquidity.toString();
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
        if (!swap.returnAmount.gt(Zero$1))
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
                    (_a = deltas[batchedSwaps.assets.indexOf(t.toLowerCase())].toString()) !== null && _a !== void 0 ? _a : Zero$1.toString());
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
        var parsed = parse$1(source, {
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
const defaultWrapper$1 = (action, _operationName, _operationType) => action();
function getSdk$1(client, withWrapper = defaultWrapper$1) {
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
    Gauge_OrderBy["Address"] = "address";
    Gauge_OrderBy["Id"] = "id";
    Gauge_OrderBy["Type"] = "type";
})(Gauge_OrderBy || (Gauge_OrderBy = {}));
var LiquidityGauge_OrderBy;
(function (LiquidityGauge_OrderBy) {
    LiquidityGauge_OrderBy["Factory"] = "factory";
    LiquidityGauge_OrderBy["Id"] = "id";
    LiquidityGauge_OrderBy["PoolAddress"] = "poolAddress";
    LiquidityGauge_OrderBy["PoolId"] = "poolId";
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
    RootGauge_OrderBy["Id"] = "id";
    RootGauge_OrderBy["Recipient"] = "recipient";
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
const defaultWrapper = (action, _operationName, _operationType) => action();
function getSdk(client, withWrapper = defaultWrapper) {
    return {
        LiquidityGauges(variables, requestHeaders) {
            return withWrapper((wrappedRequestHeaders) => client.request(LiquidityGaugesDocument, variables, { ...requestHeaders, ...wrappedRequestHeaders }), 'LiquidityGauges', 'query');
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
            orderDirection: OrderDirection$1.Desc,
        });
        const pools = [...pool0, ...pool1000];
        return pools;
    }
    async getNonLinearPools() {
        const { pools } = await this.client.PoolsWithoutLinear({
            where: { swapEnabled: true, totalShares_gt: '0' },
            orderBy: Pool_OrderBy.TotalLiquidity,
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
    weekly: weekly,
    total: total,
    between: between
});

var utils$b = {};

function decode$1(textData) {
    textData = atob(textData);
    const data = [];
    for (let i = 0; i < textData.length; i++) {
        data.push(textData.charCodeAt(i));
    }
    return arrayify(data);
}
function encode$1(data) {
    data = arrayify(data);
    let textData = "";
    for (let i = 0; i < data.length; i++) {
        textData += String.fromCharCode(data[i]);
    }
    return btoa(textData);
}

var lib_esm$f = /*#__PURE__*/Object.freeze({
    __proto__: null,
    decode: decode$1,
    encode: encode$1
});

var require$$2 = /*@__PURE__*/getAugmentedNamespace(lib_esm$f);

const version$f = "properties/5.6.0";

var __awaiter$6 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger$g = new Logger(version$f);
function defineReadOnly(object, name, value) {
    Object.defineProperty(object, name, {
        enumerable: true,
        value: value,
        writable: false,
    });
}
// Crawl up the constructor chain to find a static method
function getStatic(ctor, key) {
    for (let i = 0; i < 32; i++) {
        if (ctor[key]) {
            return ctor[key];
        }
        if (!ctor.prototype || typeof (ctor.prototype) !== "object") {
            break;
        }
        ctor = Object.getPrototypeOf(ctor.prototype).constructor;
    }
    return null;
}
function resolveProperties(object) {
    return __awaiter$6(this, void 0, void 0, function* () {
        const promises = Object.keys(object).map((key) => {
            const value = object[key];
            return Promise.resolve(value).then((v) => ({ key: key, value: v }));
        });
        const results = yield Promise.all(promises);
        return results.reduce((accum, result) => {
            accum[(result.key)] = result.value;
            return accum;
        }, {});
    });
}
function checkProperties(object, properties) {
    if (!object || typeof (object) !== "object") {
        logger$g.throwArgumentError("invalid object", "object", object);
    }
    Object.keys(object).forEach((key) => {
        if (!properties[key]) {
            logger$g.throwArgumentError("invalid object key - " + key, "transaction:" + key, object);
        }
    });
}
function shallowCopy(object) {
    const result = {};
    for (const key in object) {
        result[key] = object[key];
    }
    return result;
}
const opaque = { bigint: true, boolean: true, "function": true, number: true, string: true };
function _isFrozen(object) {
    // Opaque objects are not mutable, so safe to copy by assignment
    if (object === undefined || object === null || opaque[typeof (object)]) {
        return true;
    }
    if (Array.isArray(object) || typeof (object) === "object") {
        if (!Object.isFrozen(object)) {
            return false;
        }
        const keys = Object.keys(object);
        for (let i = 0; i < keys.length; i++) {
            let value = null;
            try {
                value = object[keys[i]];
            }
            catch (error) {
                // If accessing a value triggers an error, it is a getter
                // designed to do so (e.g. Result) and is therefore "frozen"
                continue;
            }
            if (!_isFrozen(value)) {
                return false;
            }
        }
        return true;
    }
    return logger$g.throwArgumentError(`Cannot deepCopy ${typeof (object)}`, "object", object);
}
// Returns a new copy of object, such that no properties may be replaced.
// New properties may be added only to objects.
function _deepCopy(object) {
    if (_isFrozen(object)) {
        return object;
    }
    // Arrays are mutable, so we need to create a copy
    if (Array.isArray(object)) {
        return Object.freeze(object.map((item) => deepCopy(item)));
    }
    if (typeof (object) === "object") {
        const result = {};
        for (const key in object) {
            const value = object[key];
            if (value === undefined) {
                continue;
            }
            defineReadOnly(result, key, deepCopy(value));
        }
        return result;
    }
    return logger$g.throwArgumentError(`Cannot deepCopy ${typeof (object)}`, "object", object);
}
function deepCopy(object) {
    return _deepCopy(object);
}
class Description {
    constructor(info) {
        for (const key in info) {
            this[key] = deepCopy(info[key]);
        }
    }
}

var lib_esm$e = /*#__PURE__*/Object.freeze({
    __proto__: null,
    defineReadOnly: defineReadOnly,
    getStatic: getStatic,
    resolveProperties: resolveProperties,
    checkProperties: checkProperties,
    shallowCopy: shallowCopy,
    deepCopy: deepCopy,
    Description: Description
});

/**
 * var basex = require("base-x");
 *
 * This implementation is heavily based on base-x. The main reason to
 * deviate was to prevent the dependency of Buffer.
 *
 * Contributors:
 *
 * base-x encoding
 * Forked from https://github.com/cryptocoinjs/bs58
 * Originally written by Mike Hearn for BitcoinJ
 * Copyright (c) 2011 Google Inc
 * Ported to JavaScript by Stefan Thomas
 * Merged Buffer refactorings from base58-native by Stephen Pair
 * Copyright (c) 2013 BitPay Inc
 *
 * The MIT License (MIT)
 *
 * Copyright base-x contributors (c) 2016
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */
class BaseX {
    constructor(alphabet) {
        defineReadOnly(this, "alphabet", alphabet);
        defineReadOnly(this, "base", alphabet.length);
        defineReadOnly(this, "_alphabetMap", {});
        defineReadOnly(this, "_leader", alphabet.charAt(0));
        // pre-compute lookup table
        for (let i = 0; i < alphabet.length; i++) {
            this._alphabetMap[alphabet.charAt(i)] = i;
        }
    }
    encode(value) {
        let source = arrayify(value);
        if (source.length === 0) {
            return "";
        }
        let digits = [0];
        for (let i = 0; i < source.length; ++i) {
            let carry = source[i];
            for (let j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8;
                digits[j] = carry % this.base;
                carry = (carry / this.base) | 0;
            }
            while (carry > 0) {
                digits.push(carry % this.base);
                carry = (carry / this.base) | 0;
            }
        }
        let string = "";
        // deal with leading zeros
        for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) {
            string += this._leader;
        }
        // convert digits to a string
        for (let q = digits.length - 1; q >= 0; --q) {
            string += this.alphabet[digits[q]];
        }
        return string;
    }
    decode(value) {
        if (typeof (value) !== "string") {
            throw new TypeError("Expected String");
        }
        let bytes = [];
        if (value.length === 0) {
            return new Uint8Array(bytes);
        }
        bytes.push(0);
        for (let i = 0; i < value.length; i++) {
            let byte = this._alphabetMap[value[i]];
            if (byte === undefined) {
                throw new Error("Non-base" + this.base + " character");
            }
            let carry = byte;
            for (let j = 0; j < bytes.length; ++j) {
                carry += bytes[j] * this.base;
                bytes[j] = carry & 0xff;
                carry >>= 8;
            }
            while (carry > 0) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
        }
        // deal with leading zeros
        for (let k = 0; value[k] === this._leader && k < value.length - 1; ++k) {
            bytes.push(0);
        }
        return arrayify(new Uint8Array(bytes.reverse()));
    }
}
const Base32 = new BaseX("abcdefghijklmnopqrstuvwxyz234567");
const Base58 = new BaseX("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
//console.log(Base58.decode("Qmd2V777o5XvJbYMeMb8k2nU5f8d3ciUQ5YpYuWhzv8iDj"))
//console.log(Base58.encode(Base58.decode("Qmd2V777o5XvJbYMeMb8k2nU5f8d3ciUQ5YpYuWhzv8iDj")))

var lib_esm$d = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BaseX: BaseX,
    Base32: Base32,
    Base58: Base58
});

var require$$3 = /*@__PURE__*/getAugmentedNamespace(lib_esm$d);

var sha3$1 = {exports: {}};

/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2018
 * @license MIT
 */

(function (module) {
/*jslint bitwise: true */
(function () {

  var INPUT_ERROR = 'input is invalid type';
  var FINALIZE_ERROR = 'finalize already called';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA3_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = commonjsGlobal;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && 'object' === 'object' && module.exports;
  var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
  var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
  var KECCAK_PADDING = [1, 256, 65536, 16777216];
  var PADDING = [6, 1536, 393216, 100663296];
  var SHIFT = [0, 8, 16, 24];
  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
  var BITS = [224, 256, 384, 512];
  var SHAKE_BITS = [128, 256];
  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
  var CSHAKE_BYTEPAD = {
    '128': 168,
    '256': 136
  };

  if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (bits, padding, outputType) {
    return function (message) {
      return new Keccak(bits, padding, bits).update(message)[outputType]();
    };
  };

  var createShakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits) {
      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
    };
  };

  var createCshakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits, n, s) {
      return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
    };
  };

  var createKmacOutputMethod = function (bits, padding, outputType) {
    return function (key, message, outputBits, s) {
      return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
    };
  };

  var createOutputMethods = function (method, createMethod, bits, padding) {
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createMethod(bits, padding, type);
    }
    return method;
  };

  var createMethod = function (bits, padding) {
    var method = createOutputMethod(bits, padding, 'hex');
    method.create = function () {
      return new Keccak(bits, padding, bits);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    return createOutputMethods(method, createOutputMethod, bits, padding);
  };

  var createShakeMethod = function (bits, padding) {
    var method = createShakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits) {
      return new Keccak(bits, padding, outputBits);
    };
    method.update = function (message, outputBits) {
      return method.create(outputBits).update(message);
    };
    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
  };

  var createCshakeMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createCshakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits, n, s) {
      if (!n && !s) {
        return methods['shake' + bits].create(outputBits);
      } else {
        return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
      }
    };
    method.update = function (message, outputBits, n, s) {
      return method.create(outputBits, n, s).update(message);
    };
    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
  };

  var createKmacMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createKmacOutputMethod(bits, padding, 'hex');
    method.create = function (key, outputBits, s) {
      return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
    };
    method.update = function (key, message, outputBits, s) {
      return method.create(key, outputBits, s).update(message);
    };
    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
  };

  var algorithms = [
    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
  ];

  var methods = {}, methodNames = [];

  for (var i = 0; i < algorithms.length; ++i) {
    var algorithm = algorithms[i];
    var bits = algorithm.bits;
    for (var j = 0; j < bits.length; ++j) {
      var methodName = algorithm.name + '_' + bits[j];
      methodNames.push(methodName);
      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
      if (algorithm.name !== 'sha3') {
        var newMethodName = algorithm.name + bits[j];
        methodNames.push(newMethodName);
        methods[newMethodName] = methods[methodName];
      }
    }
  }

  function Keccak(bits, padding, outputBits) {
    this.blocks = [];
    this.s = [];
    this.padding = padding;
    this.outputBits = outputBits;
    this.reset = true;
    this.finalized = false;
    this.block = 0;
    this.start = 0;
    this.blockCount = (1600 - (bits << 1)) >> 5;
    this.byteCount = this.blockCount << 2;
    this.outputBlocks = outputBits >> 5;
    this.extraBytes = (outputBits & 31) >> 3;

    for (var i = 0; i < 50; ++i) {
      this.s[i] = 0;
    }
  }

  Keccak.prototype.update = function (message) {
    if (this.finalized) {
      throw new Error(FINALIZE_ERROR);
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
      blockCount = this.blockCount, index = 0, s = this.s, i, code;

    while (index < length) {
      if (this.reset) {
        this.reset = false;
        blocks[0] = this.block;
        for (i = 1; i < blockCount + 1; ++i) {
          blocks[i] = 0;
        }
      }
      if (notString) {
        for (i = this.start; index < length && i < byteCount; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < byteCount; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }
      this.lastByteIndex = i;
      if (i >= byteCount) {
        this.start = i - byteCount;
        this.block = blocks[blockCount];
        for (i = 0; i < blockCount; ++i) {
          s[i] ^= blocks[i];
        }
        f(s);
        this.reset = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Keccak.prototype.encode = function (x, right) {
    var o = x & 255, n = 1;
    var bytes = [o];
    x = x >> 8;
    o = x & 255;
    while (o > 0) {
      bytes.unshift(o);
      x = x >> 8;
      o = x & 255;
      ++n;
    }
    if (right) {
      bytes.push(n);
    } else {
      bytes.unshift(n);
    }
    this.update(bytes);
    return bytes.length;
  };

  Keccak.prototype.encodeString = function (str) {
    var notString, type = typeof str;
    if (type !== 'string') {
      if (type === 'object') {
        if (str === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
          str = new Uint8Array(str);
        } else if (!Array.isArray(str)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var bytes = 0, length = str.length;
    if (notString) {
      bytes = length;
    } else {
      for (var i = 0; i < str.length; ++i) {
        var code = str.charCodeAt(i);
        if (code < 0x80) {
          bytes += 1;
        } else if (code < 0x800) {
          bytes += 2;
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes += 3;
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
          bytes += 4;
        }
      }
    }
    bytes += this.encode(bytes * 8);
    this.update(str);
    return bytes;
  };

  Keccak.prototype.bytepad = function (strs, w) {
    var bytes = this.encode(w);
    for (var i = 0; i < strs.length; ++i) {
      bytes += this.encodeString(strs[i]);
    }
    var paddingBytes = w - bytes % w;
    var zeros = [];
    zeros.length = paddingBytes;
    this.update(zeros);
    return this;
  };

  Keccak.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
    blocks[i >> 2] |= this.padding[i & 3];
    if (this.lastByteIndex === this.byteCount) {
      blocks[0] = blocks[blockCount];
      for (i = 1; i < blockCount + 1; ++i) {
        blocks[i] = 0;
      }
    }
    blocks[blockCount - 1] |= 0x80000000;
    for (i = 0; i < blockCount; ++i) {
      s[i] ^= blocks[i];
    }
    f(s);
  };

  Keccak.prototype.toString = Keccak.prototype.hex = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var hex = '', block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        block = s[i];
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
          HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
          HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
          HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
      }
      if (j % blockCount === 0) {
        f(s);
        i = 0;
      }
    }
    if (extraBytes) {
      block = s[i];
      hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
      if (extraBytes > 1) {
        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
      }
      if (extraBytes > 2) {
        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
      }
    }
    return hex;
  };

  Keccak.prototype.arrayBuffer = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var bytes = this.outputBits >> 3;
    var buffer;
    if (extraBytes) {
      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
    } else {
      buffer = new ArrayBuffer(bytes);
    }
    var array = new Uint32Array(buffer);
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        array[j] = s[i];
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      array[i] = s[i];
      buffer = buffer.slice(0, bytes);
    }
    return buffer;
  };

  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

  Keccak.prototype.digest = Keccak.prototype.array = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var array = [], offset, block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;
        array[offset + 1] = (block >> 8) & 0xFF;
        array[offset + 2] = (block >> 16) & 0xFF;
        array[offset + 3] = (block >> 24) & 0xFF;
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      offset = j << 2;
      block = s[i];
      array[offset] = block & 0xFF;
      if (extraBytes > 1) {
        array[offset + 1] = (block >> 8) & 0xFF;
      }
      if (extraBytes > 2) {
        array[offset + 2] = (block >> 16) & 0xFF;
      }
    }
    return array;
  };

  function Kmac(bits, padding, outputBits) {
    Keccak.call(this, bits, padding, outputBits);
  }

  Kmac.prototype = new Keccak();

  Kmac.prototype.finalize = function () {
    this.encode(this.outputBits, true);
    return Keccak.prototype.finalize.call(this);
  };

  var f = function (s) {
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
      b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
      b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
      b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for (n = 0; n < 48; n += 2) {
      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
      s[0] ^= h;
      s[1] ^= l;
      s[10] ^= h;
      s[11] ^= l;
      s[20] ^= h;
      s[21] ^= l;
      s[30] ^= h;
      s[31] ^= l;
      s[40] ^= h;
      s[41] ^= l;
      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
      s[2] ^= h;
      s[3] ^= l;
      s[12] ^= h;
      s[13] ^= l;
      s[22] ^= h;
      s[23] ^= l;
      s[32] ^= h;
      s[33] ^= l;
      s[42] ^= h;
      s[43] ^= l;
      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
      s[4] ^= h;
      s[5] ^= l;
      s[14] ^= h;
      s[15] ^= l;
      s[24] ^= h;
      s[25] ^= l;
      s[34] ^= h;
      s[35] ^= l;
      s[44] ^= h;
      s[45] ^= l;
      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
      s[6] ^= h;
      s[7] ^= l;
      s[16] ^= h;
      s[17] ^= l;
      s[26] ^= h;
      s[27] ^= l;
      s[36] ^= h;
      s[37] ^= l;
      s[46] ^= h;
      s[47] ^= l;
      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
      s[8] ^= h;
      s[9] ^= l;
      s[18] ^= h;
      s[19] ^= l;
      s[28] ^= h;
      s[29] ^= l;
      s[38] ^= h;
      s[39] ^= l;
      s[48] ^= h;
      s[49] ^= l;

      b0 = s[0];
      b1 = s[1];
      b32 = (s[11] << 4) | (s[10] >>> 28);
      b33 = (s[10] << 4) | (s[11] >>> 28);
      b14 = (s[20] << 3) | (s[21] >>> 29);
      b15 = (s[21] << 3) | (s[20] >>> 29);
      b46 = (s[31] << 9) | (s[30] >>> 23);
      b47 = (s[30] << 9) | (s[31] >>> 23);
      b28 = (s[40] << 18) | (s[41] >>> 14);
      b29 = (s[41] << 18) | (s[40] >>> 14);
      b20 = (s[2] << 1) | (s[3] >>> 31);
      b21 = (s[3] << 1) | (s[2] >>> 31);
      b2 = (s[13] << 12) | (s[12] >>> 20);
      b3 = (s[12] << 12) | (s[13] >>> 20);
      b34 = (s[22] << 10) | (s[23] >>> 22);
      b35 = (s[23] << 10) | (s[22] >>> 22);
      b16 = (s[33] << 13) | (s[32] >>> 19);
      b17 = (s[32] << 13) | (s[33] >>> 19);
      b48 = (s[42] << 2) | (s[43] >>> 30);
      b49 = (s[43] << 2) | (s[42] >>> 30);
      b40 = (s[5] << 30) | (s[4] >>> 2);
      b41 = (s[4] << 30) | (s[5] >>> 2);
      b22 = (s[14] << 6) | (s[15] >>> 26);
      b23 = (s[15] << 6) | (s[14] >>> 26);
      b4 = (s[25] << 11) | (s[24] >>> 21);
      b5 = (s[24] << 11) | (s[25] >>> 21);
      b36 = (s[34] << 15) | (s[35] >>> 17);
      b37 = (s[35] << 15) | (s[34] >>> 17);
      b18 = (s[45] << 29) | (s[44] >>> 3);
      b19 = (s[44] << 29) | (s[45] >>> 3);
      b10 = (s[6] << 28) | (s[7] >>> 4);
      b11 = (s[7] << 28) | (s[6] >>> 4);
      b42 = (s[17] << 23) | (s[16] >>> 9);
      b43 = (s[16] << 23) | (s[17] >>> 9);
      b24 = (s[26] << 25) | (s[27] >>> 7);
      b25 = (s[27] << 25) | (s[26] >>> 7);
      b6 = (s[36] << 21) | (s[37] >>> 11);
      b7 = (s[37] << 21) | (s[36] >>> 11);
      b38 = (s[47] << 24) | (s[46] >>> 8);
      b39 = (s[46] << 24) | (s[47] >>> 8);
      b30 = (s[8] << 27) | (s[9] >>> 5);
      b31 = (s[9] << 27) | (s[8] >>> 5);
      b12 = (s[18] << 20) | (s[19] >>> 12);
      b13 = (s[19] << 20) | (s[18] >>> 12);
      b44 = (s[29] << 7) | (s[28] >>> 25);
      b45 = (s[28] << 7) | (s[29] >>> 25);
      b26 = (s[38] << 8) | (s[39] >>> 24);
      b27 = (s[39] << 8) | (s[38] >>> 24);
      b8 = (s[48] << 14) | (s[49] >>> 18);
      b9 = (s[49] << 14) | (s[48] >>> 18);

      s[0] = b0 ^ (~b2 & b4);
      s[1] = b1 ^ (~b3 & b5);
      s[10] = b10 ^ (~b12 & b14);
      s[11] = b11 ^ (~b13 & b15);
      s[20] = b20 ^ (~b22 & b24);
      s[21] = b21 ^ (~b23 & b25);
      s[30] = b30 ^ (~b32 & b34);
      s[31] = b31 ^ (~b33 & b35);
      s[40] = b40 ^ (~b42 & b44);
      s[41] = b41 ^ (~b43 & b45);
      s[2] = b2 ^ (~b4 & b6);
      s[3] = b3 ^ (~b5 & b7);
      s[12] = b12 ^ (~b14 & b16);
      s[13] = b13 ^ (~b15 & b17);
      s[22] = b22 ^ (~b24 & b26);
      s[23] = b23 ^ (~b25 & b27);
      s[32] = b32 ^ (~b34 & b36);
      s[33] = b33 ^ (~b35 & b37);
      s[42] = b42 ^ (~b44 & b46);
      s[43] = b43 ^ (~b45 & b47);
      s[4] = b4 ^ (~b6 & b8);
      s[5] = b5 ^ (~b7 & b9);
      s[14] = b14 ^ (~b16 & b18);
      s[15] = b15 ^ (~b17 & b19);
      s[24] = b24 ^ (~b26 & b28);
      s[25] = b25 ^ (~b27 & b29);
      s[34] = b34 ^ (~b36 & b38);
      s[35] = b35 ^ (~b37 & b39);
      s[44] = b44 ^ (~b46 & b48);
      s[45] = b45 ^ (~b47 & b49);
      s[6] = b6 ^ (~b8 & b0);
      s[7] = b7 ^ (~b9 & b1);
      s[16] = b16 ^ (~b18 & b10);
      s[17] = b17 ^ (~b19 & b11);
      s[26] = b26 ^ (~b28 & b20);
      s[27] = b27 ^ (~b29 & b21);
      s[36] = b36 ^ (~b38 & b30);
      s[37] = b37 ^ (~b39 & b31);
      s[46] = b46 ^ (~b48 & b40);
      s[47] = b47 ^ (~b49 & b41);
      s[8] = b8 ^ (~b0 & b2);
      s[9] = b9 ^ (~b1 & b3);
      s[18] = b18 ^ (~b10 & b12);
      s[19] = b19 ^ (~b11 & b13);
      s[28] = b28 ^ (~b20 & b22);
      s[29] = b29 ^ (~b21 & b23);
      s[38] = b38 ^ (~b30 & b32);
      s[39] = b39 ^ (~b31 & b33);
      s[48] = b48 ^ (~b40 & b42);
      s[49] = b49 ^ (~b41 & b43);

      s[0] ^= RC[n];
      s[1] ^= RC[n + 1];
    }
  };

  if (COMMON_JS) {
    module.exports = methods;
  } else {
    for (i = 0; i < methodNames.length; ++i) {
      root[methodNames[i]] = methods[methodNames[i]];
    }
  }
})();
}(sha3$1));

var sha3 = sha3$1.exports;

function keccak256$1(data) {
    return '0x' + sha3.keccak_256(arrayify(data));
}

var lib_esm$c = /*#__PURE__*/Object.freeze({
    __proto__: null,
    keccak256: keccak256$1
});

const version$e = "strings/5.6.1";

const logger$f = new Logger(version$e);
///////////////////////////////
var UnicodeNormalizationForm;
(function (UnicodeNormalizationForm) {
    UnicodeNormalizationForm["current"] = "";
    UnicodeNormalizationForm["NFC"] = "NFC";
    UnicodeNormalizationForm["NFD"] = "NFD";
    UnicodeNormalizationForm["NFKC"] = "NFKC";
    UnicodeNormalizationForm["NFKD"] = "NFKD";
})(UnicodeNormalizationForm || (UnicodeNormalizationForm = {}));
var Utf8ErrorReason;
(function (Utf8ErrorReason) {
    // A continuation byte was present where there was nothing to continue
    // - offset = the index the codepoint began in
    Utf8ErrorReason["UNEXPECTED_CONTINUE"] = "unexpected continuation byte";
    // An invalid (non-continuation) byte to start a UTF-8 codepoint was found
    // - offset = the index the codepoint began in
    Utf8ErrorReason["BAD_PREFIX"] = "bad codepoint prefix";
    // The string is too short to process the expected codepoint
    // - offset = the index the codepoint began in
    Utf8ErrorReason["OVERRUN"] = "string overrun";
    // A missing continuation byte was expected but not found
    // - offset = the index the continuation byte was expected at
    Utf8ErrorReason["MISSING_CONTINUE"] = "missing continuation byte";
    // The computed code point is outside the range for UTF-8
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; outside the UTF-8 range
    Utf8ErrorReason["OUT_OF_RANGE"] = "out of UTF-8 range";
    // UTF-8 strings may not contain UTF-16 surrogate pairs
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; inside the UTF-16 surrogate range
    Utf8ErrorReason["UTF16_SURROGATE"] = "UTF-16 surrogate";
    // The string is an overlong representation
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; already bounds checked
    Utf8ErrorReason["OVERLONG"] = "overlong representation";
})(Utf8ErrorReason || (Utf8ErrorReason = {}));
function errorFunc(reason, offset, bytes, output, badCodepoint) {
    return logger$f.throwArgumentError(`invalid codepoint at offset ${offset}; ${reason}`, "bytes", bytes);
}
function ignoreFunc(reason, offset, bytes, output, badCodepoint) {
    // If there is an invalid prefix (including stray continuation), skip any additional continuation bytes
    if (reason === Utf8ErrorReason.BAD_PREFIX || reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
        let i = 0;
        for (let o = offset + 1; o < bytes.length; o++) {
            if (bytes[o] >> 6 !== 0x02) {
                break;
            }
            i++;
        }
        return i;
    }
    // This byte runs us past the end of the string, so just jump to the end
    // (but the first byte was read already read and therefore skipped)
    if (reason === Utf8ErrorReason.OVERRUN) {
        return bytes.length - offset - 1;
    }
    // Nothing to skip
    return 0;
}
function replaceFunc(reason, offset, bytes, output, badCodepoint) {
    // Overlong representations are otherwise "valid" code points; just non-deistingtished
    if (reason === Utf8ErrorReason.OVERLONG) {
        output.push(badCodepoint);
        return 0;
    }
    // Put the replacement character into the output
    output.push(0xfffd);
    // Otherwise, process as if ignoring errors
    return ignoreFunc(reason, offset, bytes);
}
// Common error handing strategies
const Utf8ErrorFuncs = Object.freeze({
    error: errorFunc,
    ignore: ignoreFunc,
    replace: replaceFunc
});
// http://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript#13691499
function getUtf8CodePoints(bytes, onError) {
    if (onError == null) {
        onError = Utf8ErrorFuncs.error;
    }
    bytes = arrayify(bytes);
    const result = [];
    let i = 0;
    // Invalid bytes are ignored
    while (i < bytes.length) {
        const c = bytes[i++];
        // 0xxx xxxx
        if (c >> 7 === 0) {
            result.push(c);
            continue;
        }
        // Multibyte; how many bytes left for this character?
        let extraLength = null;
        let overlongMask = null;
        // 110x xxxx 10xx xxxx
        if ((c & 0xe0) === 0xc0) {
            extraLength = 1;
            overlongMask = 0x7f;
            // 1110 xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf0) === 0xe0) {
            extraLength = 2;
            overlongMask = 0x7ff;
            // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf8) === 0xf0) {
            extraLength = 3;
            overlongMask = 0xffff;
        }
        else {
            if ((c & 0xc0) === 0x80) {
                i += onError(Utf8ErrorReason.UNEXPECTED_CONTINUE, i - 1, bytes, result);
            }
            else {
                i += onError(Utf8ErrorReason.BAD_PREFIX, i - 1, bytes, result);
            }
            continue;
        }
        // Do we have enough bytes in our data?
        if (i - 1 + extraLength >= bytes.length) {
            i += onError(Utf8ErrorReason.OVERRUN, i - 1, bytes, result);
            continue;
        }
        // Remove the length prefix from the char
        let res = c & ((1 << (8 - extraLength - 1)) - 1);
        for (let j = 0; j < extraLength; j++) {
            let nextChar = bytes[i];
            // Invalid continuation byte
            if ((nextChar & 0xc0) != 0x80) {
                i += onError(Utf8ErrorReason.MISSING_CONTINUE, i, bytes, result);
                res = null;
                break;
            }
            res = (res << 6) | (nextChar & 0x3f);
            i++;
        }
        // See above loop for invalid continuation byte
        if (res === null) {
            continue;
        }
        // Maximum code point
        if (res > 0x10ffff) {
            i += onError(Utf8ErrorReason.OUT_OF_RANGE, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Reserved for UTF-16 surrogate halves
        if (res >= 0xd800 && res <= 0xdfff) {
            i += onError(Utf8ErrorReason.UTF16_SURROGATE, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Check for overlong sequences (more bytes than needed)
        if (res <= overlongMask) {
            i += onError(Utf8ErrorReason.OVERLONG, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        result.push(res);
    }
    return result;
}
// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
function toUtf8Bytes(str, form = UnicodeNormalizationForm.current) {
    if (form != UnicodeNormalizationForm.current) {
        logger$f.checkNormalize();
        str = str.normalize(form);
    }
    let result = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 0x80) {
            result.push(c);
        }
        else if (c < 0x800) {
            result.push((c >> 6) | 0xc0);
            result.push((c & 0x3f) | 0x80);
        }
        else if ((c & 0xfc00) == 0xd800) {
            i++;
            const c2 = str.charCodeAt(i);
            if (i >= str.length || (c2 & 0xfc00) !== 0xdc00) {
                throw new Error("invalid utf-8 string");
            }
            // Surrogate Pair
            const pair = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
            result.push((pair >> 18) | 0xf0);
            result.push(((pair >> 12) & 0x3f) | 0x80);
            result.push(((pair >> 6) & 0x3f) | 0x80);
            result.push((pair & 0x3f) | 0x80);
        }
        else {
            result.push((c >> 12) | 0xe0);
            result.push(((c >> 6) & 0x3f) | 0x80);
            result.push((c & 0x3f) | 0x80);
        }
    }
    return arrayify(result);
}
function escapeChar(value) {
    const hex = ("0000" + value.toString(16));
    return "\\u" + hex.substring(hex.length - 4);
}
function _toEscapedUtf8String(bytes, onError) {
    return '"' + getUtf8CodePoints(bytes, onError).map((codePoint) => {
        if (codePoint < 256) {
            switch (codePoint) {
                case 8: return "\\b";
                case 9: return "\\t";
                case 10: return "\\n";
                case 13: return "\\r";
                case 34: return "\\\"";
                case 92: return "\\\\";
            }
            if (codePoint >= 32 && codePoint < 127) {
                return String.fromCharCode(codePoint);
            }
        }
        if (codePoint <= 0xffff) {
            return escapeChar(codePoint);
        }
        codePoint -= 0x10000;
        return escapeChar(((codePoint >> 10) & 0x3ff) + 0xd800) + escapeChar((codePoint & 0x3ff) + 0xdc00);
    }).join("") + '"';
}
function _toUtf8String(codePoints) {
    return codePoints.map((codePoint) => {
        if (codePoint <= 0xffff) {
            return String.fromCharCode(codePoint);
        }
        codePoint -= 0x10000;
        return String.fromCharCode((((codePoint >> 10) & 0x3ff) + 0xd800), ((codePoint & 0x3ff) + 0xdc00));
    }).join("");
}
function toUtf8String(bytes, onError) {
    return _toUtf8String(getUtf8CodePoints(bytes, onError));
}
function toUtf8CodePoints(str, form = UnicodeNormalizationForm.current) {
    return getUtf8CodePoints(toUtf8Bytes(str, form));
}

function formatBytes32String(text) {
    // Get the bytes
    const bytes = toUtf8Bytes(text);
    // Check we have room for null-termination
    if (bytes.length > 31) {
        throw new Error("bytes32 string must be less than 32 bytes");
    }
    // Zero-pad (implicitly null-terminates)
    return hexlify(concat([bytes, HashZero]).slice(0, 32));
}
function parseBytes32String(bytes) {
    const data = arrayify(bytes);
    // Must be 32 bytes with a null-termination
    if (data.length !== 32) {
        throw new Error("invalid bytes32 - not 32 bytes long");
    }
    if (data[31] !== 0) {
        throw new Error("invalid bytes32 string - no null terminator");
    }
    // Find the null termination
    let length = 31;
    while (data[length - 1] === 0) {
        length--;
    }
    // Determine the string value
    return toUtf8String(data.slice(0, length));
}

function bytes2(data) {
    if ((data.length % 4) !== 0) {
        throw new Error("bad data");
    }
    let result = [];
    for (let i = 0; i < data.length; i += 4) {
        result.push(parseInt(data.substring(i, i + 4), 16));
    }
    return result;
}
function createTable(data, func) {
    if (!func) {
        func = function (value) { return [parseInt(value, 16)]; };
    }
    let lo = 0;
    let result = {};
    data.split(",").forEach((pair) => {
        let comps = pair.split(":");
        lo += parseInt(comps[0], 16);
        result[lo] = func(comps[1]);
    });
    return result;
}
function createRangeTable(data) {
    let hi = 0;
    return data.split(",").map((v) => {
        let comps = v.split("-");
        if (comps.length === 1) {
            comps[1] = "0";
        }
        else if (comps[1] === "") {
            comps[1] = "1";
        }
        let lo = hi + parseInt(comps[0], 16);
        hi = parseInt(comps[1], 16);
        return { l: lo, h: hi };
    });
}
function matchMap(value, ranges) {
    let lo = 0;
    for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i];
        lo += range.l;
        if (value >= lo && value <= lo + range.h && ((value - lo) % (range.d || 1)) === 0) {
            if (range.e && range.e.indexOf(value - lo) !== -1) {
                continue;
            }
            return range;
        }
    }
    return null;
}
const Table_A_1_ranges = createRangeTable("221,13-1b,5f-,40-10,51-f,11-3,3-3,2-2,2-4,8,2,15,2d,28-8,88,48,27-,3-5,11-20,27-,8,28,3-5,12,18,b-a,1c-4,6-16,2-d,2-2,2,1b-4,17-9,8f-,10,f,1f-2,1c-34,33-14e,4,36-,13-,6-2,1a-f,4,9-,3-,17,8,2-2,5-,2,8-,3-,4-8,2-3,3,6-,16-6,2-,7-3,3-,17,8,3,3,3-,2,6-3,3-,4-a,5,2-6,10-b,4,8,2,4,17,8,3,6-,b,4,4-,2-e,2-4,b-10,4,9-,3-,17,8,3-,5-,9-2,3-,4-7,3-3,3,4-3,c-10,3,7-2,4,5-2,3,2,3-2,3-2,4-2,9,4-3,6-2,4,5-8,2-e,d-d,4,9,4,18,b,6-3,8,4,5-6,3-8,3-3,b-11,3,9,4,18,b,6-3,8,4,5-6,3-6,2,3-3,b-11,3,9,4,18,11-3,7-,4,5-8,2-7,3-3,b-11,3,13-2,19,a,2-,8-2,2-3,7,2,9-11,4-b,3b-3,1e-24,3,2-,3,2-,2-5,5,8,4,2,2-,3,e,4-,6,2,7-,b-,3-21,49,23-5,1c-3,9,25,10-,2-2f,23,6,3,8-2,5-5,1b-45,27-9,2a-,2-3,5b-4,45-4,53-5,8,40,2,5-,8,2,5-,28,2,5-,20,2,5-,8,2,5-,8,8,18,20,2,5-,8,28,14-5,1d-22,56-b,277-8,1e-2,52-e,e,8-a,18-8,15-b,e,4,3-b,5e-2,b-15,10,b-5,59-7,2b-555,9d-3,5b-5,17-,7-,27-,7-,9,2,2,2,20-,36,10,f-,7,14-,4,a,54-3,2-6,6-5,9-,1c-10,13-1d,1c-14,3c-,10-6,32-b,240-30,28-18,c-14,a0,115-,3,66-,b-76,5,5-,1d,24,2,5-2,2,8-,35-2,19,f-10,1d-3,311-37f,1b,5a-b,d7-19,d-3,41,57-,68-4,29-3,5f,29-37,2e-2,25-c,2c-2,4e-3,30,78-3,64-,20,19b7-49,51a7-59,48e-2,38-738,2ba5-5b,222f-,3c-94,8-b,6-4,1b,6,2,3,3,6d-20,16e-f,41-,37-7,2e-2,11-f,5-b,18-,b,14,5-3,6,88-,2,bf-2,7-,7-,7-,4-2,8,8-9,8-2ff,20,5-b,1c-b4,27-,27-cbb1,f7-9,28-2,b5-221,56,48,3-,2-,3-,5,d,2,5,3,42,5-,9,8,1d,5,6,2-2,8,153-3,123-3,33-27fd,a6da-5128,21f-5df,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3,2-1d,61-ff7d");
// @TODO: Make this relative...
const Table_B_1_flags = "ad,34f,1806,180b,180c,180d,200b,200c,200d,2060,feff".split(",").map((v) => parseInt(v, 16));
const Table_B_2_ranges = [
    { h: 25, s: 32, l: 65 },
    { h: 30, s: 32, e: [23], l: 127 },
    { h: 54, s: 1, e: [48], l: 64, d: 2 },
    { h: 14, s: 1, l: 57, d: 2 },
    { h: 44, s: 1, l: 17, d: 2 },
    { h: 10, s: 1, e: [2, 6, 8], l: 61, d: 2 },
    { h: 16, s: 1, l: 68, d: 2 },
    { h: 84, s: 1, e: [18, 24, 66], l: 19, d: 2 },
    { h: 26, s: 32, e: [17], l: 435 },
    { h: 22, s: 1, l: 71, d: 2 },
    { h: 15, s: 80, l: 40 },
    { h: 31, s: 32, l: 16 },
    { h: 32, s: 1, l: 80, d: 2 },
    { h: 52, s: 1, l: 42, d: 2 },
    { h: 12, s: 1, l: 55, d: 2 },
    { h: 40, s: 1, e: [38], l: 15, d: 2 },
    { h: 14, s: 1, l: 48, d: 2 },
    { h: 37, s: 48, l: 49 },
    { h: 148, s: 1, l: 6351, d: 2 },
    { h: 88, s: 1, l: 160, d: 2 },
    { h: 15, s: 16, l: 704 },
    { h: 25, s: 26, l: 854 },
    { h: 25, s: 32, l: 55915 },
    { h: 37, s: 40, l: 1247 },
    { h: 25, s: -119711, l: 53248 },
    { h: 25, s: -119763, l: 52 },
    { h: 25, s: -119815, l: 52 },
    { h: 25, s: -119867, e: [1, 4, 5, 7, 8, 11, 12, 17], l: 52 },
    { h: 25, s: -119919, l: 52 },
    { h: 24, s: -119971, e: [2, 7, 8, 17], l: 52 },
    { h: 24, s: -120023, e: [2, 7, 13, 15, 16, 17], l: 52 },
    { h: 25, s: -120075, l: 52 },
    { h: 25, s: -120127, l: 52 },
    { h: 25, s: -120179, l: 52 },
    { h: 25, s: -120231, l: 52 },
    { h: 25, s: -120283, l: 52 },
    { h: 25, s: -120335, l: 52 },
    { h: 24, s: -119543, e: [17], l: 56 },
    { h: 24, s: -119601, e: [17], l: 58 },
    { h: 24, s: -119659, e: [17], l: 58 },
    { h: 24, s: -119717, e: [17], l: 58 },
    { h: 24, s: -119775, e: [17], l: 58 }
];
const Table_B_2_lut_abs = createTable("b5:3bc,c3:ff,7:73,2:253,5:254,3:256,1:257,5:259,1:25b,3:260,1:263,2:269,1:268,5:26f,1:272,2:275,7:280,3:283,5:288,3:28a,1:28b,5:292,3f:195,1:1bf,29:19e,125:3b9,8b:3b2,1:3b8,1:3c5,3:3c6,1:3c0,1a:3ba,1:3c1,1:3c3,2:3b8,1:3b5,1bc9:3b9,1c:1f76,1:1f77,f:1f7a,1:1f7b,d:1f78,1:1f79,1:1f7c,1:1f7d,107:63,5:25b,4:68,1:68,1:68,3:69,1:69,1:6c,3:6e,4:70,1:71,1:72,1:72,1:72,7:7a,2:3c9,2:7a,2:6b,1:e5,1:62,1:63,3:65,1:66,2:6d,b:3b3,1:3c0,6:64,1b574:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3");
const Table_B_2_lut_rel = createTable("179:1,2:1,2:1,5:1,2:1,a:4f,a:1,8:1,2:1,2:1,3:1,5:1,3:1,4:1,2:1,3:1,4:1,8:2,1:1,2:2,1:1,2:2,27:2,195:26,2:25,1:25,1:25,2:40,2:3f,1:3f,33:1,11:-6,1:-9,1ac7:-3a,6d:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,b:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,c:-8,2:-8,2:-8,2:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,49:-8,1:-8,1:-4a,1:-4a,d:-56,1:-56,1:-56,1:-56,d:-8,1:-8,f:-8,1:-8,3:-7");
const Table_B_2_complex = createTable("df:00730073,51:00690307,19:02BC006E,a7:006A030C,18a:002003B9,16:03B903080301,20:03C503080301,1d7:05650582,190f:00680331,1:00740308,1:0077030A,1:0079030A,1:006102BE,b6:03C50313,2:03C503130300,2:03C503130301,2:03C503130342,2a:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,3:1F7003B9,1:03B103B9,1:03AC03B9,2:03B10342,1:03B1034203B9,5:03B103B9,6:1F7403B9,1:03B703B9,1:03AE03B9,2:03B70342,1:03B7034203B9,5:03B703B9,6:03B903080300,1:03B903080301,3:03B90342,1:03B903080342,b:03C503080300,1:03C503080301,1:03C10313,2:03C50342,1:03C503080342,b:1F7C03B9,1:03C903B9,1:03CE03B9,2:03C90342,1:03C9034203B9,5:03C903B9,ac:00720073,5b:00B00063,6:00B00066,d:006E006F,a:0073006D,1:00740065006C,1:0074006D,124f:006800700061,2:00610075,2:006F0076,b:00700061,1:006E0061,1:03BC0061,1:006D0061,1:006B0061,1:006B0062,1:006D0062,1:00670062,3:00700066,1:006E0066,1:03BC0066,4:0068007A,1:006B0068007A,1:006D0068007A,1:00670068007A,1:00740068007A,15:00700061,1:006B00700061,1:006D00700061,1:006700700061,8:00700076,1:006E0076,1:03BC0076,1:006D0076,1:006B0076,1:006D0076,1:00700077,1:006E0077,1:03BC0077,1:006D0077,1:006B0077,1:006D0077,1:006B03C9,1:006D03C9,2:00620071,3:00632215006B0067,1:0063006F002E,1:00640062,1:00670079,2:00680070,2:006B006B,1:006B006D,9:00700068,2:00700070006D,1:00700072,2:00730076,1:00770062,c723:00660066,1:00660069,1:0066006C,1:006600660069,1:00660066006C,1:00730074,1:00730074,d:05740576,1:05740565,1:0574056B,1:057E0576,1:0574056D", bytes2);
const Table_C_ranges = createRangeTable("80-20,2a0-,39c,32,f71,18e,7f2-f,19-7,30-4,7-5,f81-b,5,a800-20ff,4d1-1f,110,fa-6,d174-7,2e84-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,2,1f-5f,ff7f-20001");
function flatten(values) {
    return values.reduce((accum, value) => {
        value.forEach((value) => { accum.push(value); });
        return accum;
    }, []);
}
function _nameprepTableA1(codepoint) {
    return !!matchMap(codepoint, Table_A_1_ranges);
}
function _nameprepTableB2(codepoint) {
    let range = matchMap(codepoint, Table_B_2_ranges);
    if (range) {
        return [codepoint + range.s];
    }
    let codes = Table_B_2_lut_abs[codepoint];
    if (codes) {
        return codes;
    }
    let shift = Table_B_2_lut_rel[codepoint];
    if (shift) {
        return [codepoint + shift[0]];
    }
    let complex = Table_B_2_complex[codepoint];
    if (complex) {
        return complex;
    }
    return null;
}
function _nameprepTableC(codepoint) {
    return !!matchMap(codepoint, Table_C_ranges);
}
function nameprep(value) {
    // This allows platforms with incomplete normalize to bypass
    // it for very basic names which the built-in toLowerCase
    // will certainly handle correctly
    if (value.match(/^[a-z0-9-]*$/i) && value.length <= 59) {
        return value.toLowerCase();
    }
    // Get the code points (keeping the current normalization)
    let codes = toUtf8CodePoints(value);
    codes = flatten(codes.map((code) => {
        // Substitute Table B.1 (Maps to Nothing)
        if (Table_B_1_flags.indexOf(code) >= 0) {
            return [];
        }
        if (code >= 0xfe00 && code <= 0xfe0f) {
            return [];
        }
        // Substitute Table B.2 (Case Folding)
        let codesTableB2 = _nameprepTableB2(code);
        if (codesTableB2) {
            return codesTableB2;
        }
        // No Substitution
        return [code];
    }));
    // Normalize using form KC
    codes = toUtf8CodePoints(_toUtf8String(codes), UnicodeNormalizationForm.NFKC);
    // Prohibit Tables C.1.2, C.2.2, C.3, C.4, C.5, C.6, C.7, C.8, C.9
    codes.forEach((code) => {
        if (_nameprepTableC(code)) {
            throw new Error("STRINGPREP_CONTAINS_PROHIBITED");
        }
    });
    // Prohibit Unassigned Code Points (Table A.1)
    codes.forEach((code) => {
        if (_nameprepTableA1(code)) {
            throw new Error("STRINGPREP_CONTAINS_UNASSIGNED");
        }
    });
    // IDNA extras
    let name = _toUtf8String(codes);
    // IDNA: 4.2.3.1
    if (name.substring(0, 1) === "-" || name.substring(2, 4) === "--" || name.substring(name.length - 1) === "-") {
        throw new Error("invalid hyphen");
    }
    // IDNA: 4.2.4
    if (name.length > 63) {
        throw new Error("too long");
    }
    return name;
}

var lib_esm$b = /*#__PURE__*/Object.freeze({
    __proto__: null,
    _toEscapedUtf8String: _toEscapedUtf8String,
    toUtf8Bytes: toUtf8Bytes,
    toUtf8CodePoints: toUtf8CodePoints,
    toUtf8String: toUtf8String,
    Utf8ErrorFuncs: Utf8ErrorFuncs,
    get Utf8ErrorReason () { return Utf8ErrorReason; },
    get UnicodeNormalizationForm () { return UnicodeNormalizationForm; },
    formatBytes32String: formatBytes32String,
    parseBytes32String: parseBytes32String,
    nameprep: nameprep
});

function id(text) {
    return keccak256$1(toUtf8Bytes(text));
}

const version$d = "hash/5.6.1";

const logger$e = new Logger(version$d);
const Zeros$1 = new Uint8Array(32);
Zeros$1.fill(0);
const Partition = new RegExp("^((.*)\\.)?([^.]+)$");
function isValidName(name) {
    try {
        const comps = name.split(".");
        for (let i = 0; i < comps.length; i++) {
            if (nameprep(comps[i]).length === 0) {
                throw new Error("empty");
            }
        }
        return true;
    }
    catch (error) { }
    return false;
}
function namehash(name) {
    /* istanbul ignore if */
    if (typeof (name) !== "string") {
        logger$e.throwArgumentError("invalid ENS name; not a string", "name", name);
    }
    let current = name;
    let result = Zeros$1;
    while (current.length) {
        const partition = current.match(Partition);
        if (partition == null || partition[2] === "") {
            logger$e.throwArgumentError("invalid ENS address; missing component", "name", name);
        }
        const label = toUtf8Bytes(nameprep(partition[3]));
        result = keccak256$1(concat([result, keccak256$1(label)]));
        current = partition[2] || "";
    }
    return hexlify(result);
}
function dnsEncode(name) {
    return hexlify(concat(name.split(".").map((comp) => {
        // We jam in an _ prefix to fill in with the length later
        // Note: Nameprep throws if the component is over 63 bytes
        const bytes = toUtf8Bytes("_" + nameprep(comp));
        bytes[0] = bytes.length - 1;
        return bytes;
    }))) + "00";
}

const messagePrefix = "\x19Ethereum Signed Message:\n";
function hashMessage(message) {
    if (typeof (message) === "string") {
        message = toUtf8Bytes(message);
    }
    return keccak256$1(concat([
        toUtf8Bytes(messagePrefix),
        toUtf8Bytes(String(message.length)),
        message
    ]));
}

var __awaiter$5 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger$d = new Logger(version$d);
const padding = new Uint8Array(32);
padding.fill(0);
const NegativeOne = BigNumber.from(-1);
const Zero = BigNumber.from(0);
const One = BigNumber.from(1);
const MaxUint256 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
function hexPadRight(value) {
    const bytes = arrayify(value);
    const padOffset = bytes.length % 32;
    if (padOffset) {
        return hexConcat([bytes, padding.slice(padOffset)]);
    }
    return hexlify(bytes);
}
const hexTrue = hexZeroPad(One.toHexString(), 32);
const hexFalse = hexZeroPad(Zero.toHexString(), 32);
const domainFieldTypes = {
    name: "string",
    version: "string",
    chainId: "uint256",
    verifyingContract: "address",
    salt: "bytes32"
};
const domainFieldNames = [
    "name", "version", "chainId", "verifyingContract", "salt"
];
function checkString(key) {
    return function (value) {
        if (typeof (value) !== "string") {
            logger$d.throwArgumentError(`invalid domain value for ${JSON.stringify(key)}`, `domain.${key}`, value);
        }
        return value;
    };
}
const domainChecks = {
    name: checkString("name"),
    version: checkString("version"),
    chainId: function (value) {
        try {
            return BigNumber.from(value).toString();
        }
        catch (error) { }
        return logger$d.throwArgumentError(`invalid domain value for "chainId"`, "domain.chainId", value);
    },
    verifyingContract: function (value) {
        try {
            return getAddress(value).toLowerCase();
        }
        catch (error) { }
        return logger$d.throwArgumentError(`invalid domain value "verifyingContract"`, "domain.verifyingContract", value);
    },
    salt: function (value) {
        try {
            const bytes = arrayify(value);
            if (bytes.length !== 32) {
                throw new Error("bad length");
            }
            return hexlify(bytes);
        }
        catch (error) { }
        return logger$d.throwArgumentError(`invalid domain value "salt"`, "domain.salt", value);
    }
};
function getBaseEncoder(type) {
    // intXX and uintXX
    {
        const match = type.match(/^(u?)int(\d*)$/);
        if (match) {
            const signed = (match[1] === "");
            const width = parseInt(match[2] || "256");
            if (width % 8 !== 0 || width > 256 || (match[2] && match[2] !== String(width))) {
                logger$d.throwArgumentError("invalid numeric width", "type", type);
            }
            const boundsUpper = MaxUint256.mask(signed ? (width - 1) : width);
            const boundsLower = signed ? boundsUpper.add(One).mul(NegativeOne) : Zero;
            return function (value) {
                const v = BigNumber.from(value);
                if (v.lt(boundsLower) || v.gt(boundsUpper)) {
                    logger$d.throwArgumentError(`value out-of-bounds for ${type}`, "value", value);
                }
                return hexZeroPad(v.toTwos(256).toHexString(), 32);
            };
        }
    }
    // bytesXX
    {
        const match = type.match(/^bytes(\d+)$/);
        if (match) {
            const width = parseInt(match[1]);
            if (width === 0 || width > 32 || match[1] !== String(width)) {
                logger$d.throwArgumentError("invalid bytes width", "type", type);
            }
            return function (value) {
                const bytes = arrayify(value);
                if (bytes.length !== width) {
                    logger$d.throwArgumentError(`invalid length for ${type}`, "value", value);
                }
                return hexPadRight(value);
            };
        }
    }
    switch (type) {
        case "address": return function (value) {
            return hexZeroPad(getAddress(value), 32);
        };
        case "bool": return function (value) {
            return ((!value) ? hexFalse : hexTrue);
        };
        case "bytes": return function (value) {
            return keccak256$1(value);
        };
        case "string": return function (value) {
            return id(value);
        };
    }
    return null;
}
function encodeType(name, fields) {
    return `${name}(${fields.map(({ name, type }) => (type + " " + name)).join(",")})`;
}
class TypedDataEncoder {
    constructor(types) {
        defineReadOnly(this, "types", Object.freeze(deepCopy(types)));
        defineReadOnly(this, "_encoderCache", {});
        defineReadOnly(this, "_types", {});
        // Link struct types to their direct child structs
        const links = {};
        // Link structs to structs which contain them as a child
        const parents = {};
        // Link all subtypes within a given struct
        const subtypes = {};
        Object.keys(types).forEach((type) => {
            links[type] = {};
            parents[type] = [];
            subtypes[type] = {};
        });
        for (const name in types) {
            const uniqueNames = {};
            types[name].forEach((field) => {
                // Check each field has a unique name
                if (uniqueNames[field.name]) {
                    logger$d.throwArgumentError(`duplicate variable name ${JSON.stringify(field.name)} in ${JSON.stringify(name)}`, "types", types);
                }
                uniqueNames[field.name] = true;
                // Get the base type (drop any array specifiers)
                const baseType = field.type.match(/^([^\x5b]*)(\x5b|$)/)[1];
                if (baseType === name) {
                    logger$d.throwArgumentError(`circular type reference to ${JSON.stringify(baseType)}`, "types", types);
                }
                // Is this a base encoding type?
                const encoder = getBaseEncoder(baseType);
                if (encoder) {
                    return;
                }
                if (!parents[baseType]) {
                    logger$d.throwArgumentError(`unknown type ${JSON.stringify(baseType)}`, "types", types);
                }
                // Add linkage
                parents[baseType].push(name);
                links[name][baseType] = true;
            });
        }
        // Deduce the primary type
        const primaryTypes = Object.keys(parents).filter((n) => (parents[n].length === 0));
        if (primaryTypes.length === 0) {
            logger$d.throwArgumentError("missing primary type", "types", types);
        }
        else if (primaryTypes.length > 1) {
            logger$d.throwArgumentError(`ambiguous primary types or unused types: ${primaryTypes.map((t) => (JSON.stringify(t))).join(", ")}`, "types", types);
        }
        defineReadOnly(this, "primaryType", primaryTypes[0]);
        // Check for circular type references
        function checkCircular(type, found) {
            if (found[type]) {
                logger$d.throwArgumentError(`circular type reference to ${JSON.stringify(type)}`, "types", types);
            }
            found[type] = true;
            Object.keys(links[type]).forEach((child) => {
                if (!parents[child]) {
                    return;
                }
                // Recursively check children
                checkCircular(child, found);
                // Mark all ancestors as having this decendant
                Object.keys(found).forEach((subtype) => {
                    subtypes[subtype][child] = true;
                });
            });
            delete found[type];
        }
        checkCircular(this.primaryType, {});
        // Compute each fully describe type
        for (const name in subtypes) {
            const st = Object.keys(subtypes[name]);
            st.sort();
            this._types[name] = encodeType(name, types[name]) + st.map((t) => encodeType(t, types[t])).join("");
        }
    }
    getEncoder(type) {
        let encoder = this._encoderCache[type];
        if (!encoder) {
            encoder = this._encoderCache[type] = this._getEncoder(type);
        }
        return encoder;
    }
    _getEncoder(type) {
        // Basic encoder type (address, bool, uint256, etc)
        {
            const encoder = getBaseEncoder(type);
            if (encoder) {
                return encoder;
            }
        }
        // Array
        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
            const subtype = match[1];
            const subEncoder = this.getEncoder(subtype);
            const length = parseInt(match[3]);
            return (value) => {
                if (length >= 0 && value.length !== length) {
                    logger$d.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
                }
                let result = value.map(subEncoder);
                if (this._types[subtype]) {
                    result = result.map(keccak256$1);
                }
                return keccak256$1(hexConcat(result));
            };
        }
        // Struct
        const fields = this.types[type];
        if (fields) {
            const encodedType = id(this._types[type]);
            return (value) => {
                const values = fields.map(({ name, type }) => {
                    const result = this.getEncoder(type)(value[name]);
                    if (this._types[type]) {
                        return keccak256$1(result);
                    }
                    return result;
                });
                values.unshift(encodedType);
                return hexConcat(values);
            };
        }
        return logger$d.throwArgumentError(`unknown type: ${type}`, "type", type);
    }
    encodeType(name) {
        const result = this._types[name];
        if (!result) {
            logger$d.throwArgumentError(`unknown type: ${JSON.stringify(name)}`, "name", name);
        }
        return result;
    }
    encodeData(type, value) {
        return this.getEncoder(type)(value);
    }
    hashStruct(name, value) {
        return keccak256$1(this.encodeData(name, value));
    }
    encode(value) {
        return this.encodeData(this.primaryType, value);
    }
    hash(value) {
        return this.hashStruct(this.primaryType, value);
    }
    _visit(type, value, callback) {
        // Basic encoder type (address, bool, uint256, etc)
        {
            const encoder = getBaseEncoder(type);
            if (encoder) {
                return callback(type, value);
            }
        }
        // Array
        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
            const subtype = match[1];
            const length = parseInt(match[3]);
            if (length >= 0 && value.length !== length) {
                logger$d.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
            }
            return value.map((v) => this._visit(subtype, v, callback));
        }
        // Struct
        const fields = this.types[type];
        if (fields) {
            return fields.reduce((accum, { name, type }) => {
                accum[name] = this._visit(type, value[name], callback);
                return accum;
            }, {});
        }
        return logger$d.throwArgumentError(`unknown type: ${type}`, "type", type);
    }
    visit(value, callback) {
        return this._visit(this.primaryType, value, callback);
    }
    static from(types) {
        return new TypedDataEncoder(types);
    }
    static getPrimaryType(types) {
        return TypedDataEncoder.from(types).primaryType;
    }
    static hashStruct(name, types, value) {
        return TypedDataEncoder.from(types).hashStruct(name, value);
    }
    static hashDomain(domain) {
        const domainFields = [];
        for (const name in domain) {
            const type = domainFieldTypes[name];
            if (!type) {
                logger$d.throwArgumentError(`invalid typed-data domain key: ${JSON.stringify(name)}`, "domain", domain);
            }
            domainFields.push({ name, type });
        }
        domainFields.sort((a, b) => {
            return domainFieldNames.indexOf(a.name) - domainFieldNames.indexOf(b.name);
        });
        return TypedDataEncoder.hashStruct("EIP712Domain", { EIP712Domain: domainFields }, domain);
    }
    static encode(domain, types, value) {
        return hexConcat([
            "0x1901",
            TypedDataEncoder.hashDomain(domain),
            TypedDataEncoder.from(types).hash(value)
        ]);
    }
    static hash(domain, types, value) {
        return keccak256$1(TypedDataEncoder.encode(domain, types, value));
    }
    // Replaces all address types with ENS names with their looked up address
    static resolveNames(domain, types, value, resolveName) {
        return __awaiter$5(this, void 0, void 0, function* () {
            // Make a copy to isolate it from the object passed in
            domain = shallowCopy(domain);
            // Look up all ENS names
            const ensCache = {};
            // Do we need to look up the domain's verifyingContract?
            if (domain.verifyingContract && !isHexString(domain.verifyingContract, 20)) {
                ensCache[domain.verifyingContract] = "0x";
            }
            // We are going to use the encoder to visit all the base values
            const encoder = TypedDataEncoder.from(types);
            // Get a list of all the addresses
            encoder.visit(value, (type, value) => {
                if (type === "address" && !isHexString(value, 20)) {
                    ensCache[value] = "0x";
                }
                return value;
            });
            // Lookup each name
            for (const name in ensCache) {
                ensCache[name] = yield resolveName(name);
            }
            // Replace the domain verifyingContract if needed
            if (domain.verifyingContract && ensCache[domain.verifyingContract]) {
                domain.verifyingContract = ensCache[domain.verifyingContract];
            }
            // Replace all ENS names with their address
            value = encoder.visit(value, (type, value) => {
                if (type === "address" && ensCache[value]) {
                    return ensCache[value];
                }
                return value;
            });
            return { domain, value };
        });
    }
    static getPayload(domain, types, value) {
        // Validate the domain fields
        TypedDataEncoder.hashDomain(domain);
        // Derive the EIP712Domain Struct reference type
        const domainValues = {};
        const domainTypes = [];
        domainFieldNames.forEach((name) => {
            const value = domain[name];
            if (value == null) {
                return;
            }
            domainValues[name] = domainChecks[name](value);
            domainTypes.push({ name, type: domainFieldTypes[name] });
        });
        const encoder = TypedDataEncoder.from(types);
        const typesWithDomain = shallowCopy(types);
        if (typesWithDomain.EIP712Domain) {
            logger$d.throwArgumentError("types must not contain EIP712Domain type", "types.EIP712Domain", types);
        }
        else {
            typesWithDomain.EIP712Domain = domainTypes;
        }
        // Validate the data structures and types
        encoder.encode(value);
        return {
            types: typesWithDomain,
            domain: domainValues,
            primaryType: encoder.primaryType,
            message: encoder.visit(value, (type, value) => {
                // bytes
                if (type.match(/^bytes(\d*)/)) {
                    return hexlify(arrayify(value));
                }
                // uint or int
                if (type.match(/^u?int/)) {
                    return BigNumber.from(value).toString();
                }
                switch (type) {
                    case "address":
                        return value.toLowerCase();
                    case "bool":
                        return !!value;
                    case "string":
                        if (typeof (value) !== "string") {
                            logger$d.throwArgumentError(`invalid string`, "value", value);
                        }
                        return value;
                }
                return logger$d.throwArgumentError("unsupported type", "type", type);
            })
        };
    }
}

var lib_esm$a = /*#__PURE__*/Object.freeze({
    __proto__: null,
    id: id,
    dnsEncode: dnsEncode,
    namehash: namehash,
    isValidName: isValidName,
    messagePrefix: messagePrefix,
    hashMessage: hashMessage,
    _TypedDataEncoder: TypedDataEncoder
});

var require$$5 = /*@__PURE__*/getAugmentedNamespace(lib_esm$a);

var hash = {};

var utils$a = {};

var minimalisticAssert$1 = assert$b;

function assert$b(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

assert$b.equal = function assertEqual(l, r, msg) {
  if (l != r)
    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
};

var inherits$1 = {exports: {}};

var inherits_browser$1 = {exports: {}};

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser$1.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  inherits_browser$1.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

try {
  var util = require('util');
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  inherits$1.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  inherits$1.exports = inherits_browser$1.exports;
}

var assert$a = minimalisticAssert$1;
var inherits = inherits$1.exports;

utils$a.inherits = inherits;

function isSurrogatePair(msg, i) {
  if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
    return false;
  }
  if (i < 0 || i + 1 >= msg.length) {
    return false;
  }
  return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
}

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg === 'string') {
    if (!enc) {
      // Inspired by stringToUtf8ByteArray() in closure-library by Google
      // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
      // Apache License 2.0
      // https://github.com/google/closure-library/blob/master/LICENSE
      var p = 0;
      for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        if (c < 128) {
          res[p++] = c;
        } else if (c < 2048) {
          res[p++] = (c >> 6) | 192;
          res[p++] = (c & 63) | 128;
        } else if (isSurrogatePair(msg, i)) {
          c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
          res[p++] = (c >> 18) | 240;
          res[p++] = ((c >> 12) & 63) | 128;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        } else {
          res[p++] = (c >> 12) | 224;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        }
      }
    } else if (enc === 'hex') {
      msg = msg.replace(/[^a-z0-9]+/ig, '');
      if (msg.length % 2 !== 0)
        msg = '0' + msg;
      for (i = 0; i < msg.length; i += 2)
        res.push(parseInt(msg[i] + msg[i + 1], 16));
    }
  } else {
    for (i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
  }
  return res;
}
utils$a.toArray = toArray;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
utils$a.toHex = toHex;

function htonl(w) {
  var res = (w >>> 24) |
            ((w >>> 8) & 0xff00) |
            ((w << 8) & 0xff0000) |
            ((w & 0xff) << 24);
  return res >>> 0;
}
utils$a.htonl = htonl;

function toHex32(msg, endian) {
  var res = '';
  for (var i = 0; i < msg.length; i++) {
    var w = msg[i];
    if (endian === 'little')
      w = htonl(w);
    res += zero8(w.toString(16));
  }
  return res;
}
utils$a.toHex32 = toHex32;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
utils$a.zero2 = zero2;

function zero8(word) {
  if (word.length === 7)
    return '0' + word;
  else if (word.length === 6)
    return '00' + word;
  else if (word.length === 5)
    return '000' + word;
  else if (word.length === 4)
    return '0000' + word;
  else if (word.length === 3)
    return '00000' + word;
  else if (word.length === 2)
    return '000000' + word;
  else if (word.length === 1)
    return '0000000' + word;
  else
    return word;
}
utils$a.zero8 = zero8;

function join32(msg, start, end, endian) {
  var len = end - start;
  assert$a(len % 4 === 0);
  var res = new Array(len / 4);
  for (var i = 0, k = start; i < res.length; i++, k += 4) {
    var w;
    if (endian === 'big')
      w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
    else
      w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
    res[i] = w >>> 0;
  }
  return res;
}
utils$a.join32 = join32;

function split32(msg, endian) {
  var res = new Array(msg.length * 4);
  for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
    var m = msg[i];
    if (endian === 'big') {
      res[k] = m >>> 24;
      res[k + 1] = (m >>> 16) & 0xff;
      res[k + 2] = (m >>> 8) & 0xff;
      res[k + 3] = m & 0xff;
    } else {
      res[k + 3] = m >>> 24;
      res[k + 2] = (m >>> 16) & 0xff;
      res[k + 1] = (m >>> 8) & 0xff;
      res[k] = m & 0xff;
    }
  }
  return res;
}
utils$a.split32 = split32;

function rotr32$1(w, b) {
  return (w >>> b) | (w << (32 - b));
}
utils$a.rotr32 = rotr32$1;

function rotl32$2(w, b) {
  return (w << b) | (w >>> (32 - b));
}
utils$a.rotl32 = rotl32$2;

function sum32$3(a, b) {
  return (a + b) >>> 0;
}
utils$a.sum32 = sum32$3;

function sum32_3$1(a, b, c) {
  return (a + b + c) >>> 0;
}
utils$a.sum32_3 = sum32_3$1;

function sum32_4$2(a, b, c, d) {
  return (a + b + c + d) >>> 0;
}
utils$a.sum32_4 = sum32_4$2;

function sum32_5$2(a, b, c, d, e) {
  return (a + b + c + d + e) >>> 0;
}
utils$a.sum32_5 = sum32_5$2;

function sum64$1(buf, pos, ah, al) {
  var bh = buf[pos];
  var bl = buf[pos + 1];

  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  buf[pos] = hi >>> 0;
  buf[pos + 1] = lo;
}
utils$a.sum64 = sum64$1;

function sum64_hi$1(ah, al, bh, bl) {
  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  return hi >>> 0;
}
utils$a.sum64_hi = sum64_hi$1;

function sum64_lo$1(ah, al, bh, bl) {
  var lo = al + bl;
  return lo >>> 0;
}
utils$a.sum64_lo = sum64_lo$1;

function sum64_4_hi$1(ah, al, bh, bl, ch, cl, dh, dl) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;

  var hi = ah + bh + ch + dh + carry;
  return hi >>> 0;
}
utils$a.sum64_4_hi = sum64_4_hi$1;

function sum64_4_lo$1(ah, al, bh, bl, ch, cl, dh, dl) {
  var lo = al + bl + cl + dl;
  return lo >>> 0;
}
utils$a.sum64_4_lo = sum64_4_lo$1;

function sum64_5_hi$1(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;
  lo = (lo + el) >>> 0;
  carry += lo < el ? 1 : 0;

  var hi = ah + bh + ch + dh + eh + carry;
  return hi >>> 0;
}
utils$a.sum64_5_hi = sum64_5_hi$1;

function sum64_5_lo$1(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var lo = al + bl + cl + dl + el;

  return lo >>> 0;
}
utils$a.sum64_5_lo = sum64_5_lo$1;

function rotr64_hi$1(ah, al, num) {
  var r = (al << (32 - num)) | (ah >>> num);
  return r >>> 0;
}
utils$a.rotr64_hi = rotr64_hi$1;

function rotr64_lo$1(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
utils$a.rotr64_lo = rotr64_lo$1;

function shr64_hi$1(ah, al, num) {
  return ah >>> num;
}
utils$a.shr64_hi = shr64_hi$1;

function shr64_lo$1(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
utils$a.shr64_lo = shr64_lo$1;

var common$5 = {};

var utils$9 = utils$a;
var assert$9 = minimalisticAssert$1;

function BlockHash$4() {
  this.pending = null;
  this.pendingTotal = 0;
  this.blockSize = this.constructor.blockSize;
  this.outSize = this.constructor.outSize;
  this.hmacStrength = this.constructor.hmacStrength;
  this.padLength = this.constructor.padLength / 8;
  this.endian = 'big';

  this._delta8 = this.blockSize / 8;
  this._delta32 = this.blockSize / 32;
}
common$5.BlockHash = BlockHash$4;

BlockHash$4.prototype.update = function update(msg, enc) {
  // Convert message to array, pad it, and join into 32bit blocks
  msg = utils$9.toArray(msg, enc);
  if (!this.pending)
    this.pending = msg;
  else
    this.pending = this.pending.concat(msg);
  this.pendingTotal += msg.length;

  // Enough data, try updating
  if (this.pending.length >= this._delta8) {
    msg = this.pending;

    // Process pending data in blocks
    var r = msg.length % this._delta8;
    this.pending = msg.slice(msg.length - r, msg.length);
    if (this.pending.length === 0)
      this.pending = null;

    msg = utils$9.join32(msg, 0, msg.length - r, this.endian);
    for (var i = 0; i < msg.length; i += this._delta32)
      this._update(msg, i, i + this._delta32);
  }

  return this;
};

BlockHash$4.prototype.digest = function digest(enc) {
  this.update(this._pad());
  assert$9(this.pending === null);

  return this._digest(enc);
};

BlockHash$4.prototype._pad = function pad() {
  var len = this.pendingTotal;
  var bytes = this._delta8;
  var k = bytes - ((len + this.padLength) % bytes);
  var res = new Array(k + this.padLength);
  res[0] = 0x80;
  for (var i = 1; i < k; i++)
    res[i] = 0;

  // Append length
  len <<= 3;
  if (this.endian === 'big') {
    for (var t = 8; t < this.padLength; t++)
      res[i++] = 0;

    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = len & 0xff;
  } else {
    res[i++] = len & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;

    for (t = 8; t < this.padLength; t++)
      res[i++] = 0;
  }

  return res;
};

var sha = {};

var common$4 = {};

var utils$8 = utils$a;
var rotr32 = utils$8.rotr32;

function ft_1$1(s, x, y, z) {
  if (s === 0)
    return ch32$1(x, y, z);
  if (s === 1 || s === 3)
    return p32(x, y, z);
  if (s === 2)
    return maj32$1(x, y, z);
}
common$4.ft_1 = ft_1$1;

function ch32$1(x, y, z) {
  return (x & y) ^ ((~x) & z);
}
common$4.ch32 = ch32$1;

function maj32$1(x, y, z) {
  return (x & y) ^ (x & z) ^ (y & z);
}
common$4.maj32 = maj32$1;

function p32(x, y, z) {
  return x ^ y ^ z;
}
common$4.p32 = p32;

function s0_256$1(x) {
  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}
common$4.s0_256 = s0_256$1;

function s1_256$1(x) {
  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}
common$4.s1_256 = s1_256$1;

function g0_256$1(x) {
  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
}
common$4.g0_256 = g0_256$1;

function g1_256$1(x) {
  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
}
common$4.g1_256 = g1_256$1;

var utils$7 = utils$a;
var common$3 = common$5;
var shaCommon$1 = common$4;

var rotl32$1 = utils$7.rotl32;
var sum32$2 = utils$7.sum32;
var sum32_5$1 = utils$7.sum32_5;
var ft_1 = shaCommon$1.ft_1;
var BlockHash$3 = common$3.BlockHash;

var sha1_K = [
  0x5A827999, 0x6ED9EBA1,
  0x8F1BBCDC, 0xCA62C1D6
];

function SHA1() {
  if (!(this instanceof SHA1))
    return new SHA1();

  BlockHash$3.call(this);
  this.h = [
    0x67452301, 0xefcdab89, 0x98badcfe,
    0x10325476, 0xc3d2e1f0 ];
  this.W = new Array(80);
}

utils$7.inherits(SHA1, BlockHash$3);
var _1 = SHA1;

SHA1.blockSize = 512;
SHA1.outSize = 160;
SHA1.hmacStrength = 80;
SHA1.padLength = 64;

SHA1.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];

  for(; i < W.length; i++)
    W[i] = rotl32$1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];

  for (i = 0; i < W.length; i++) {
    var s = ~~(i / 20);
    var t = sum32_5$1(rotl32$1(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
    e = d;
    d = c;
    c = rotl32$1(b, 30);
    b = a;
    a = t;
  }

  this.h[0] = sum32$2(this.h[0], a);
  this.h[1] = sum32$2(this.h[1], b);
  this.h[2] = sum32$2(this.h[2], c);
  this.h[3] = sum32$2(this.h[3], d);
  this.h[4] = sum32$2(this.h[4], e);
};

SHA1.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils$7.toHex32(this.h, 'big');
  else
    return utils$7.split32(this.h, 'big');
};

var utils$6 = utils$a;
var common$2 = common$5;
var shaCommon = common$4;
var assert$8 = minimalisticAssert$1;

var sum32$1 = utils$6.sum32;
var sum32_4$1 = utils$6.sum32_4;
var sum32_5 = utils$6.sum32_5;
var ch32 = shaCommon.ch32;
var maj32 = shaCommon.maj32;
var s0_256 = shaCommon.s0_256;
var s1_256 = shaCommon.s1_256;
var g0_256 = shaCommon.g0_256;
var g1_256 = shaCommon.g1_256;

var BlockHash$2 = common$2.BlockHash;

var sha256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function SHA256$1() {
  if (!(this instanceof SHA256$1))
    return new SHA256$1();

  BlockHash$2.call(this);
  this.h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  this.k = sha256_K;
  this.W = new Array(64);
}
utils$6.inherits(SHA256$1, BlockHash$2);
var _256 = SHA256$1;

SHA256$1.blockSize = 512;
SHA256$1.outSize = 256;
SHA256$1.hmacStrength = 192;
SHA256$1.padLength = 64;

SHA256$1.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i++)
    W[i] = sum32_4$1(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];
  var f = this.h[5];
  var g = this.h[6];
  var h = this.h[7];

  assert$8(this.k.length === W.length);
  for (i = 0; i < W.length; i++) {
    var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
    var T2 = sum32$1(s0_256(a), maj32(a, b, c));
    h = g;
    g = f;
    f = e;
    e = sum32$1(d, T1);
    d = c;
    c = b;
    b = a;
    a = sum32$1(T1, T2);
  }

  this.h[0] = sum32$1(this.h[0], a);
  this.h[1] = sum32$1(this.h[1], b);
  this.h[2] = sum32$1(this.h[2], c);
  this.h[3] = sum32$1(this.h[3], d);
  this.h[4] = sum32$1(this.h[4], e);
  this.h[5] = sum32$1(this.h[5], f);
  this.h[6] = sum32$1(this.h[6], g);
  this.h[7] = sum32$1(this.h[7], h);
};

SHA256$1.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils$6.toHex32(this.h, 'big');
  else
    return utils$6.split32(this.h, 'big');
};

var utils$5 = utils$a;
var SHA256 = _256;

function SHA224() {
  if (!(this instanceof SHA224))
    return new SHA224();

  SHA256.call(this);
  this.h = [
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4 ];
}
utils$5.inherits(SHA224, SHA256);
var _224 = SHA224;

SHA224.blockSize = 512;
SHA224.outSize = 224;
SHA224.hmacStrength = 192;
SHA224.padLength = 64;

SHA224.prototype._digest = function digest(enc) {
  // Just truncate output
  if (enc === 'hex')
    return utils$5.toHex32(this.h.slice(0, 7), 'big');
  else
    return utils$5.split32(this.h.slice(0, 7), 'big');
};

var utils$4 = utils$a;
var common$1 = common$5;
var assert$7 = minimalisticAssert$1;

var rotr64_hi = utils$4.rotr64_hi;
var rotr64_lo = utils$4.rotr64_lo;
var shr64_hi = utils$4.shr64_hi;
var shr64_lo = utils$4.shr64_lo;
var sum64 = utils$4.sum64;
var sum64_hi = utils$4.sum64_hi;
var sum64_lo = utils$4.sum64_lo;
var sum64_4_hi = utils$4.sum64_4_hi;
var sum64_4_lo = utils$4.sum64_4_lo;
var sum64_5_hi = utils$4.sum64_5_hi;
var sum64_5_lo = utils$4.sum64_5_lo;

var BlockHash$1 = common$1.BlockHash;

var sha512_K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function SHA512$1() {
  if (!(this instanceof SHA512$1))
    return new SHA512$1();

  BlockHash$1.call(this);
  this.h = [
    0x6a09e667, 0xf3bcc908,
    0xbb67ae85, 0x84caa73b,
    0x3c6ef372, 0xfe94f82b,
    0xa54ff53a, 0x5f1d36f1,
    0x510e527f, 0xade682d1,
    0x9b05688c, 0x2b3e6c1f,
    0x1f83d9ab, 0xfb41bd6b,
    0x5be0cd19, 0x137e2179 ];
  this.k = sha512_K;
  this.W = new Array(160);
}
utils$4.inherits(SHA512$1, BlockHash$1);
var _512 = SHA512$1;

SHA512$1.blockSize = 1024;
SHA512$1.outSize = 512;
SHA512$1.hmacStrength = 192;
SHA512$1.padLength = 128;

SHA512$1.prototype._prepareBlock = function _prepareBlock(msg, start) {
  var W = this.W;

  // 32 x 32bit words
  for (var i = 0; i < 32; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i += 2) {
    var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);  // i - 2
    var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
    var c1_hi = W[i - 14];  // i - 7
    var c1_lo = W[i - 13];
    var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);  // i - 15
    var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
    var c3_hi = W[i - 32];  // i - 16
    var c3_lo = W[i - 31];

    W[i] = sum64_4_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
    W[i + 1] = sum64_4_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
  }
};

SHA512$1.prototype._update = function _update(msg, start) {
  this._prepareBlock(msg, start);

  var W = this.W;

  var ah = this.h[0];
  var al = this.h[1];
  var bh = this.h[2];
  var bl = this.h[3];
  var ch = this.h[4];
  var cl = this.h[5];
  var dh = this.h[6];
  var dl = this.h[7];
  var eh = this.h[8];
  var el = this.h[9];
  var fh = this.h[10];
  var fl = this.h[11];
  var gh = this.h[12];
  var gl = this.h[13];
  var hh = this.h[14];
  var hl = this.h[15];

  assert$7(this.k.length === W.length);
  for (var i = 0; i < W.length; i += 2) {
    var c0_hi = hh;
    var c0_lo = hl;
    var c1_hi = s1_512_hi(eh, el);
    var c1_lo = s1_512_lo(eh, el);
    var c2_hi = ch64_hi(eh, el, fh, fl, gh);
    var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
    var c3_hi = this.k[i];
    var c3_lo = this.k[i + 1];
    var c4_hi = W[i];
    var c4_lo = W[i + 1];

    var T1_hi = sum64_5_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);
    var T1_lo = sum64_5_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);

    c0_hi = s0_512_hi(ah, al);
    c0_lo = s0_512_lo(ah, al);
    c1_hi = maj64_hi(ah, al, bh, bl, ch);
    c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);

    var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
    var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);

    hh = gh;
    hl = gl;

    gh = fh;
    gl = fl;

    fh = eh;
    fl = el;

    eh = sum64_hi(dh, dl, T1_hi, T1_lo);
    el = sum64_lo(dl, dl, T1_hi, T1_lo);

    dh = ch;
    dl = cl;

    ch = bh;
    cl = bl;

    bh = ah;
    bl = al;

    ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
    al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
  }

  sum64(this.h, 0, ah, al);
  sum64(this.h, 2, bh, bl);
  sum64(this.h, 4, ch, cl);
  sum64(this.h, 6, dh, dl);
  sum64(this.h, 8, eh, el);
  sum64(this.h, 10, fh, fl);
  sum64(this.h, 12, gh, gl);
  sum64(this.h, 14, hh, hl);
};

SHA512$1.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils$4.toHex32(this.h, 'big');
  else
    return utils$4.split32(this.h, 'big');
};

function ch64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ ((~xh) & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function ch64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ ((~xl) & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ (xh & zh) ^ (yh & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ (xl & zl) ^ (yl & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 28);
  var c1_hi = rotr64_hi(xl, xh, 2);  // 34
  var c2_hi = rotr64_hi(xl, xh, 7);  // 39

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 28);
  var c1_lo = rotr64_lo(xl, xh, 2);  // 34
  var c2_lo = rotr64_lo(xl, xh, 7);  // 39

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 14);
  var c1_hi = rotr64_hi(xh, xl, 18);
  var c2_hi = rotr64_hi(xl, xh, 9);  // 41

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 14);
  var c1_lo = rotr64_lo(xh, xl, 18);
  var c2_lo = rotr64_lo(xl, xh, 9);  // 41

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 1);
  var c1_hi = rotr64_hi(xh, xl, 8);
  var c2_hi = shr64_hi(xh, xl, 7);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 1);
  var c1_lo = rotr64_lo(xh, xl, 8);
  var c2_lo = shr64_lo(xh, xl, 7);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 19);
  var c1_hi = rotr64_hi(xl, xh, 29);  // 61
  var c2_hi = shr64_hi(xh, xl, 6);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 19);
  var c1_lo = rotr64_lo(xl, xh, 29);  // 61
  var c2_lo = shr64_lo(xh, xl, 6);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

var utils$3 = utils$a;

var SHA512 = _512;

function SHA384() {
  if (!(this instanceof SHA384))
    return new SHA384();

  SHA512.call(this);
  this.h = [
    0xcbbb9d5d, 0xc1059ed8,
    0x629a292a, 0x367cd507,
    0x9159015a, 0x3070dd17,
    0x152fecd8, 0xf70e5939,
    0x67332667, 0xffc00b31,
    0x8eb44a87, 0x68581511,
    0xdb0c2e0d, 0x64f98fa7,
    0x47b5481d, 0xbefa4fa4 ];
}
utils$3.inherits(SHA384, SHA512);
var _384 = SHA384;

SHA384.blockSize = 1024;
SHA384.outSize = 384;
SHA384.hmacStrength = 192;
SHA384.padLength = 128;

SHA384.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils$3.toHex32(this.h.slice(0, 12), 'big');
  else
    return utils$3.split32(this.h.slice(0, 12), 'big');
};

sha.sha1 = _1;
sha.sha224 = _224;
sha.sha256 = _256;
sha.sha384 = _384;
sha.sha512 = _512;

var ripemd = {};

var utils$2 = utils$a;
var common = common$5;

var rotl32 = utils$2.rotl32;
var sum32 = utils$2.sum32;
var sum32_3 = utils$2.sum32_3;
var sum32_4 = utils$2.sum32_4;
var BlockHash = common.BlockHash;

function RIPEMD160() {
  if (!(this instanceof RIPEMD160))
    return new RIPEMD160();

  BlockHash.call(this);

  this.h = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
  this.endian = 'little';
}
utils$2.inherits(RIPEMD160, BlockHash);
ripemd.ripemd160 = RIPEMD160;

RIPEMD160.blockSize = 512;
RIPEMD160.outSize = 160;
RIPEMD160.hmacStrength = 192;
RIPEMD160.padLength = 64;

RIPEMD160.prototype._update = function update(msg, start) {
  var A = this.h[0];
  var B = this.h[1];
  var C = this.h[2];
  var D = this.h[3];
  var E = this.h[4];
  var Ah = A;
  var Bh = B;
  var Ch = C;
  var Dh = D;
  var Eh = E;
  for (var j = 0; j < 80; j++) {
    var T = sum32(
      rotl32(
        sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)),
        s[j]),
      E);
    A = E;
    E = D;
    D = rotl32(C, 10);
    C = B;
    B = T;
    T = sum32(
      rotl32(
        sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
        sh[j]),
      Eh);
    Ah = Eh;
    Eh = Dh;
    Dh = rotl32(Ch, 10);
    Ch = Bh;
    Bh = T;
  }
  T = sum32_3(this.h[1], C, Dh);
  this.h[1] = sum32_3(this.h[2], D, Eh);
  this.h[2] = sum32_3(this.h[3], E, Ah);
  this.h[3] = sum32_3(this.h[4], A, Bh);
  this.h[4] = sum32_3(this.h[0], B, Ch);
  this.h[0] = T;
};

RIPEMD160.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils$2.toHex32(this.h, 'little');
  else
    return utils$2.split32(this.h, 'little');
};

function f(j, x, y, z) {
  if (j <= 15)
    return x ^ y ^ z;
  else if (j <= 31)
    return (x & y) | ((~x) & z);
  else if (j <= 47)
    return (x | (~y)) ^ z;
  else if (j <= 63)
    return (x & z) | (y & (~z));
  else
    return x ^ (y | (~z));
}

function K(j) {
  if (j <= 15)
    return 0x00000000;
  else if (j <= 31)
    return 0x5a827999;
  else if (j <= 47)
    return 0x6ed9eba1;
  else if (j <= 63)
    return 0x8f1bbcdc;
  else
    return 0xa953fd4e;
}

function Kh(j) {
  if (j <= 15)
    return 0x50a28be6;
  else if (j <= 31)
    return 0x5c4dd124;
  else if (j <= 47)
    return 0x6d703ef3;
  else if (j <= 63)
    return 0x7a6d76e9;
  else
    return 0x00000000;
}

var r = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];

var rh = [
  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];

var s = [
  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];

var sh = [
  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];

var utils$1 = utils$a;
var assert$6 = minimalisticAssert$1;

function Hmac(hash, key, enc) {
  if (!(this instanceof Hmac))
    return new Hmac(hash, key, enc);
  this.Hash = hash;
  this.blockSize = hash.blockSize / 8;
  this.outSize = hash.outSize / 8;
  this.inner = null;
  this.outer = null;

  this._init(utils$1.toArray(key, enc));
}
var hmac = Hmac;

Hmac.prototype._init = function init(key) {
  // Shorten key, if needed
  if (key.length > this.blockSize)
    key = new this.Hash().update(key).digest();
  assert$6(key.length <= this.blockSize);

  // Add padding to key
  for (var i = key.length; i < this.blockSize; i++)
    key.push(0);

  for (i = 0; i < key.length; i++)
    key[i] ^= 0x36;
  this.inner = new this.Hash().update(key);

  // 0x36 ^ 0x5c = 0x6a
  for (i = 0; i < key.length; i++)
    key[i] ^= 0x6a;
  this.outer = new this.Hash().update(key);
};

Hmac.prototype.update = function update(msg, enc) {
  this.inner.update(msg, enc);
  return this;
};

Hmac.prototype.digest = function digest(enc) {
  this.outer.update(this.inner.digest());
  return this.outer.digest(enc);
};

(function (exports) {
var hash = exports;

hash.utils = utils$a;
hash.common = common$5;
hash.sha = sha;
hash.ripemd = ripemd;
hash.hmac = hmac;

// Proxy hash functions to the main object
hash.sha1 = hash.sha.sha1;
hash.sha256 = hash.sha.sha256;
hash.sha224 = hash.sha.sha224;
hash.sha384 = hash.sha.sha384;
hash.sha512 = hash.sha.sha512;
hash.ripemd160 = hash.ripemd.ripemd160;
}(hash));

var SupportedAlgorithm;
(function (SupportedAlgorithm) {
    SupportedAlgorithm["sha256"] = "sha256";
    SupportedAlgorithm["sha512"] = "sha512";
})(SupportedAlgorithm || (SupportedAlgorithm = {}));

const version$c = "sha2/5.6.1";

const logger$c = new Logger(version$c);
function ripemd160(data) {
    return "0x" + (hash.ripemd160().update(arrayify(data)).digest("hex"));
}
function sha256$1(data) {
    return "0x" + (hash.sha256().update(arrayify(data)).digest("hex"));
}
function sha512(data) {
    return "0x" + (hash.sha512().update(arrayify(data)).digest("hex"));
}
function computeHmac(algorithm, key, data) {
    if (!SupportedAlgorithm[algorithm]) {
        logger$c.throwError("unsupported algorithm " + algorithm, Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "hmac",
            algorithm: algorithm
        });
    }
    return "0x" + hash.hmac(hash[algorithm], arrayify(key)).update(arrayify(data)).digest("hex");
}

var lib_esm$9 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    computeHmac: computeHmac,
    ripemd160: ripemd160,
    sha256: sha256$1,
    sha512: sha512,
    get SupportedAlgorithm () { return SupportedAlgorithm; }
});

function pbkdf2$1(password, salt, iterations, keylen, hashAlgorithm) {
    password = arrayify(password);
    salt = arrayify(salt);
    let hLen;
    let l = 1;
    const DK = new Uint8Array(keylen);
    const block1 = new Uint8Array(salt.length + 4);
    block1.set(salt);
    //salt.copy(block1, 0, 0, salt.length)
    let r;
    let T;
    for (let i = 1; i <= l; i++) {
        //block1.writeUInt32BE(i, salt.length)
        block1[salt.length] = (i >> 24) & 0xff;
        block1[salt.length + 1] = (i >> 16) & 0xff;
        block1[salt.length + 2] = (i >> 8) & 0xff;
        block1[salt.length + 3] = i & 0xff;
        //let U = createHmac(password).update(block1).digest();
        let U = arrayify(computeHmac(hashAlgorithm, password, block1));
        if (!hLen) {
            hLen = U.length;
            T = new Uint8Array(hLen);
            l = Math.ceil(keylen / hLen);
            r = keylen - (l - 1) * hLen;
        }
        //U.copy(T, 0, 0, hLen)
        T.set(U);
        for (let j = 1; j < iterations; j++) {
            //U = createHmac(password).update(U).digest();
            U = arrayify(computeHmac(hashAlgorithm, password, U));
            for (let k = 0; k < hLen; k++)
                T[k] ^= U[k];
        }
        const destPos = (i - 1) * hLen;
        const len = (i === l ? r : hLen);
        //T.copy(DK, destPos, 0, len)
        DK.set(arrayify(T).slice(0, len), destPos);
    }
    return hexlify(DK);
}

var bn = {exports: {}};

(function (module) {
(function (module, exports) {

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
      Buffer = window.Buffer;
    } else {
      Buffer = require('buffer').Buffer;
    }
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
      this.negative = 1;
    }

    if (start < number.length) {
      if (base === 16) {
        this._parseHex(number, start, endian);
      } else {
        this._parseBase(number, base, start);
        if (endian === 'le') {
          this._initArray(this.toArray(), base, endian);
        }
      }
    }
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [number & 0x3ffffff];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [0];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this._strip();
  };

  function parseHex4Bits (string, index) {
    var c = string.charCodeAt(index);
    // '0' - '9'
    if (c >= 48 && c <= 57) {
      return c - 48;
    // 'A' - 'F'
    } else if (c >= 65 && c <= 70) {
      return c - 55;
    // 'a' - 'f'
    } else if (c >= 97 && c <= 102) {
      return c - 87;
    } else {
      assert(false, 'Invalid character in ' + string);
    }
  }

  function parseHexByte (string, lowerBound, index) {
    var r = parseHex4Bits(string, index);
    if (index - 1 >= lowerBound) {
      r |= parseHex4Bits(string, index - 1) << 4;
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start, endian) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    // 24-bits chunks
    var off = 0;
    var j = 0;

    var w;
    if (endian === 'be') {
      for (i = number.length - 1; i >= start; i -= 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    } else {
      var parseLength = number.length - start;
      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    }

    this._strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var b = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        b = c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        b = c - 17 + 0xa;

      // '0' - '9'
      } else {
        b = c;
      }
      assert(c >= 0 && b < mul, 'Invalid character');
      r += b;
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [0];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    this._strip();
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  function move (dest, src) {
    dest.words = src.words;
    dest.length = src.length;
    dest.negative = src.negative;
    dest.red = src.red;
  }

  BN.prototype._move = function _move (dest) {
    move(dest, this);
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype._strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  // Check Symbol.for because not everywhere where Symbol defined
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility
  if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
    try {
      BN.prototype[Symbol.for('nodejs.util.inspect.custom')] = inspect;
    } catch (e) {
      BN.prototype.inspect = inspect;
    }
  } else {
    BN.prototype.inspect = inspect;
  }

  function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  }

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modrn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16, 2);
  };

  if (Buffer) {
    BN.prototype.toBuffer = function toBuffer (endian, length) {
      return this.toArrayLike(Buffer, endian, length);
    };
  }

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  var allocate = function allocate (ArrayType, size) {
    if (ArrayType.allocUnsafe) {
      return ArrayType.allocUnsafe(size);
    }
    return new ArrayType(size);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    this._strip();

    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    var res = allocate(ArrayType, reqLength);
    var postfix = endian === 'le' ? 'LE' : 'BE';
    this['_toArrayLike' + postfix](res, byteLength);
    return res;
  };

  BN.prototype._toArrayLikeLE = function _toArrayLikeLE (res, byteLength) {
    var position = 0;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position++] = word & 0xff;
      if (position < res.length) {
        res[position++] = (word >> 8) & 0xff;
      }
      if (position < res.length) {
        res[position++] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position < res.length) {
          res[position++] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position < res.length) {
      res[position++] = carry;

      while (position < res.length) {
        res[position++] = 0;
      }
    }
  };

  BN.prototype._toArrayLikeBE = function _toArrayLikeBE (res, byteLength) {
    var position = res.length - 1;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position--] = word & 0xff;
      if (position >= 0) {
        res[position--] = (word >> 8) & 0xff;
      }
      if (position >= 0) {
        res[position--] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position >= 0) {
          res[position--] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position >= 0) {
      res[position--] = carry;

      while (position >= 0) {
        res[position--] = 0;
      }
    }
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] >>> wbit) & 0x01;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this._strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this._strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this._strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this._strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this._strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this._strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out._strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out._strip();
  }

  function jumboMulTo (self, num, out) {
    // Temporary disable, see https://github.com/indutny/bn.js/issues/211
    // var fftm = new FFTM();
    // return fftm.mulp(self, num, out);
    return bigMulTo(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return isNegNum ? this.ineg() : this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this._strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) ; else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this._strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this._strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) <= num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this._strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this._strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this._strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q._strip();
    }
    a._strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modrn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modrn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || (r2 === 1 && cmp === 0)) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modrn = function modrn (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return isNegNum ? -acc : acc;
  };

  // WARNING: DEPRECATED
  BN.prototype.modn = function modn (num) {
    return this.modrn(num);
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    this._strip();
    return isNegNum ? this.ineg() : this;
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this._strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      if (r.strip !== undefined) {
        // r is a BN v4 instance
        r.strip();
      } else {
        // r is a BN v5 instance
        r._strip();
      }
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);

    move(a, a.umod(this.m)._forceRed(this));
    return a;
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(module, commonjsGlobal);
}(bn));

var BN = bn.exports;

function createCommonjsModule(fn, basedir, module) {
	return module = {
		path: basedir,
		exports: {},
		require: function (path, base) {
			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
		}
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var minimalisticAssert = assert;

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

assert.equal = function assertEqual(l, r, msg) {
  if (l != r)
    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
};

var utils_1 = createCommonjsModule(function (module, exports) {

var utils = exports;

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg !== 'string') {
    for (var i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
    return res;
  }
  if (enc === 'hex') {
    msg = msg.replace(/[^a-z0-9]+/ig, '');
    if (msg.length % 2 !== 0)
      msg = '0' + msg;
    for (var i = 0; i < msg.length; i += 2)
      res.push(parseInt(msg[i] + msg[i + 1], 16));
  } else {
    for (var i = 0; i < msg.length; i++) {
      var c = msg.charCodeAt(i);
      var hi = c >> 8;
      var lo = c & 0xff;
      if (hi)
        res.push(hi, lo);
      else
        res.push(lo);
    }
  }
  return res;
}
utils.toArray = toArray;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
utils.zero2 = zero2;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
utils.toHex = toHex;

utils.encode = function encode(arr, enc) {
  if (enc === 'hex')
    return toHex(arr);
  else
    return arr;
};
});

var utils_1$1 = createCommonjsModule(function (module, exports) {

var utils = exports;




utils.assert = minimalisticAssert;
utils.toArray = utils_1.toArray;
utils.zero2 = utils_1.zero2;
utils.toHex = utils_1.toHex;
utils.encode = utils_1.encode;

// Represent num in a w-NAF form
function getNAF(num, w, bits) {
  var naf = new Array(Math.max(num.bitLength(), bits) + 1);
  naf.fill(0);

  var ws = 1 << (w + 1);
  var k = num.clone();

  for (var i = 0; i < naf.length; i++) {
    var z;
    var mod = k.andln(ws - 1);
    if (k.isOdd()) {
      if (mod > (ws >> 1) - 1)
        z = (ws >> 1) - mod;
      else
        z = mod;
      k.isubn(z);
    } else {
      z = 0;
    }

    naf[i] = z;
    k.iushrn(1);
  }

  return naf;
}
utils.getNAF = getNAF;

// Represent k1, k2 in a Joint Sparse Form
function getJSF(k1, k2) {
  var jsf = [
    [],
    [],
  ];

  k1 = k1.clone();
  k2 = k2.clone();
  var d1 = 0;
  var d2 = 0;
  var m8;
  while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
    // First phase
    var m14 = (k1.andln(3) + d1) & 3;
    var m24 = (k2.andln(3) + d2) & 3;
    if (m14 === 3)
      m14 = -1;
    if (m24 === 3)
      m24 = -1;
    var u1;
    if ((m14 & 1) === 0) {
      u1 = 0;
    } else {
      m8 = (k1.andln(7) + d1) & 7;
      if ((m8 === 3 || m8 === 5) && m24 === 2)
        u1 = -m14;
      else
        u1 = m14;
    }
    jsf[0].push(u1);

    var u2;
    if ((m24 & 1) === 0) {
      u2 = 0;
    } else {
      m8 = (k2.andln(7) + d2) & 7;
      if ((m8 === 3 || m8 === 5) && m14 === 2)
        u2 = -m24;
      else
        u2 = m24;
    }
    jsf[1].push(u2);

    // Second phase
    if (2 * d1 === u1 + 1)
      d1 = 1 - d1;
    if (2 * d2 === u2 + 1)
      d2 = 1 - d2;
    k1.iushrn(1);
    k2.iushrn(1);
  }

  return jsf;
}
utils.getJSF = getJSF;

function cachedProperty(obj, name, computer) {
  var key = '_' + name;
  obj.prototype[name] = function cachedProperty() {
    return this[key] !== undefined ? this[key] :
      this[key] = computer.call(this);
  };
}
utils.cachedProperty = cachedProperty;

function parseBytes(bytes) {
  return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') :
    bytes;
}
utils.parseBytes = parseBytes;

function intFromLE(bytes) {
  return new BN(bytes, 'hex', 'le');
}
utils.intFromLE = intFromLE;
});



var getNAF = utils_1$1.getNAF;
var getJSF = utils_1$1.getJSF;
var assert$1 = utils_1$1.assert;

function BaseCurve(type, conf) {
  this.type = type;
  this.p = new BN(conf.p, 16);

  // Use Montgomery, when there is no fast reduction for the prime
  this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);

  // Useful for many curves
  this.zero = new BN(0).toRed(this.red);
  this.one = new BN(1).toRed(this.red);
  this.two = new BN(2).toRed(this.red);

  // Curve configuration, optional
  this.n = conf.n && new BN(conf.n, 16);
  this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);

  // Temporary arrays
  this._wnafT1 = new Array(4);
  this._wnafT2 = new Array(4);
  this._wnafT3 = new Array(4);
  this._wnafT4 = new Array(4);

  this._bitLength = this.n ? this.n.bitLength() : 0;

  // Generalized Greg Maxwell's trick
  var adjustCount = this.n && this.p.div(this.n);
  if (!adjustCount || adjustCount.cmpn(100) > 0) {
    this.redN = null;
  } else {
    this._maxwellTrick = true;
    this.redN = this.n.toRed(this.red);
  }
}
var base = BaseCurve;

BaseCurve.prototype.point = function point() {
  throw new Error('Not implemented');
};

BaseCurve.prototype.validate = function validate() {
  throw new Error('Not implemented');
};

BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
  assert$1(p.precomputed);
  var doubles = p._getDoubles();

  var naf = getNAF(k, 1, this._bitLength);
  var I = (1 << (doubles.step + 1)) - (doubles.step % 2 === 0 ? 2 : 1);
  I /= 3;

  // Translate into more windowed form
  var repr = [];
  var j;
  var nafW;
  for (j = 0; j < naf.length; j += doubles.step) {
    nafW = 0;
    for (var l = j + doubles.step - 1; l >= j; l--)
      nafW = (nafW << 1) + naf[l];
    repr.push(nafW);
  }

  var a = this.jpoint(null, null, null);
  var b = this.jpoint(null, null, null);
  for (var i = I; i > 0; i--) {
    for (j = 0; j < repr.length; j++) {
      nafW = repr[j];
      if (nafW === i)
        b = b.mixedAdd(doubles.points[j]);
      else if (nafW === -i)
        b = b.mixedAdd(doubles.points[j].neg());
    }
    a = a.add(b);
  }
  return a.toP();
};

BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
  var w = 4;

  // Precompute window
  var nafPoints = p._getNAFPoints(w);
  w = nafPoints.wnd;
  var wnd = nafPoints.points;

  // Get NAF form
  var naf = getNAF(k, w, this._bitLength);

  // Add `this`*(N+1) for every w-NAF index
  var acc = this.jpoint(null, null, null);
  for (var i = naf.length - 1; i >= 0; i--) {
    // Count zeroes
    for (var l = 0; i >= 0 && naf[i] === 0; i--)
      l++;
    if (i >= 0)
      l++;
    acc = acc.dblp(l);

    if (i < 0)
      break;
    var z = naf[i];
    assert$1(z !== 0);
    if (p.type === 'affine') {
      // J +- P
      if (z > 0)
        acc = acc.mixedAdd(wnd[(z - 1) >> 1]);
      else
        acc = acc.mixedAdd(wnd[(-z - 1) >> 1].neg());
    } else {
      // J +- J
      if (z > 0)
        acc = acc.add(wnd[(z - 1) >> 1]);
      else
        acc = acc.add(wnd[(-z - 1) >> 1].neg());
    }
  }
  return p.type === 'affine' ? acc.toP() : acc;
};

BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW,
  points,
  coeffs,
  len,
  jacobianResult) {
  var wndWidth = this._wnafT1;
  var wnd = this._wnafT2;
  var naf = this._wnafT3;

  // Fill all arrays
  var max = 0;
  var i;
  var j;
  var p;
  for (i = 0; i < len; i++) {
    p = points[i];
    var nafPoints = p._getNAFPoints(defW);
    wndWidth[i] = nafPoints.wnd;
    wnd[i] = nafPoints.points;
  }

  // Comb small window NAFs
  for (i = len - 1; i >= 1; i -= 2) {
    var a = i - 1;
    var b = i;
    if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
      naf[a] = getNAF(coeffs[a], wndWidth[a], this._bitLength);
      naf[b] = getNAF(coeffs[b], wndWidth[b], this._bitLength);
      max = Math.max(naf[a].length, max);
      max = Math.max(naf[b].length, max);
      continue;
    }

    var comb = [
      points[a], /* 1 */
      null, /* 3 */
      null, /* 5 */
      points[b], /* 7 */
    ];

    // Try to avoid Projective points, if possible
    if (points[a].y.cmp(points[b].y) === 0) {
      comb[1] = points[a].add(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].add(points[b].neg());
    } else {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    }

    var index = [
      -3, /* -1 -1 */
      -1, /* -1 0 */
      -5, /* -1 1 */
      -7, /* 0 -1 */
      0, /* 0 0 */
      7, /* 0 1 */
      5, /* 1 -1 */
      1, /* 1 0 */
      3,  /* 1 1 */
    ];

    var jsf = getJSF(coeffs[a], coeffs[b]);
    max = Math.max(jsf[0].length, max);
    naf[a] = new Array(max);
    naf[b] = new Array(max);
    for (j = 0; j < max; j++) {
      var ja = jsf[0][j] | 0;
      var jb = jsf[1][j] | 0;

      naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
      naf[b][j] = 0;
      wnd[a] = comb;
    }
  }

  var acc = this.jpoint(null, null, null);
  var tmp = this._wnafT4;
  for (i = max; i >= 0; i--) {
    var k = 0;

    while (i >= 0) {
      var zero = true;
      for (j = 0; j < len; j++) {
        tmp[j] = naf[j][i] | 0;
        if (tmp[j] !== 0)
          zero = false;
      }
      if (!zero)
        break;
      k++;
      i--;
    }
    if (i >= 0)
      k++;
    acc = acc.dblp(k);
    if (i < 0)
      break;

    for (j = 0; j < len; j++) {
      var z = tmp[j];
      if (z === 0)
        continue;
      else if (z > 0)
        p = wnd[j][(z - 1) >> 1];
      else if (z < 0)
        p = wnd[j][(-z - 1) >> 1].neg();

      if (p.type === 'affine')
        acc = acc.mixedAdd(p);
      else
        acc = acc.add(p);
    }
  }
  // Zeroify references
  for (i = 0; i < len; i++)
    wnd[i] = null;

  if (jacobianResult)
    return acc;
  else
    return acc.toP();
};

function BasePoint(curve, type) {
  this.curve = curve;
  this.type = type;
  this.precomputed = null;
}
BaseCurve.BasePoint = BasePoint;

BasePoint.prototype.eq = function eq(/*other*/) {
  throw new Error('Not implemented');
};

BasePoint.prototype.validate = function validate() {
  return this.curve.validate(this);
};

BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
  bytes = utils_1$1.toArray(bytes, enc);

  var len = this.p.byteLength();

  // uncompressed, hybrid-odd, hybrid-even
  if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) &&
      bytes.length - 1 === 2 * len) {
    if (bytes[0] === 0x06)
      assert$1(bytes[bytes.length - 1] % 2 === 0);
    else if (bytes[0] === 0x07)
      assert$1(bytes[bytes.length - 1] % 2 === 1);

    var res =  this.point(bytes.slice(1, 1 + len),
      bytes.slice(1 + len, 1 + 2 * len));

    return res;
  } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) &&
              bytes.length - 1 === len) {
    return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
  }
  throw new Error('Unknown point format');
};

BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
  return this.encode(enc, true);
};

BasePoint.prototype._encode = function _encode(compact) {
  var len = this.curve.p.byteLength();
  var x = this.getX().toArray('be', len);

  if (compact)
    return [ this.getY().isEven() ? 0x02 : 0x03 ].concat(x);

  return [ 0x04 ].concat(x, this.getY().toArray('be', len));
};

BasePoint.prototype.encode = function encode(enc, compact) {
  return utils_1$1.encode(this._encode(compact), enc);
};

BasePoint.prototype.precompute = function precompute(power) {
  if (this.precomputed)
    return this;

  var precomputed = {
    doubles: null,
    naf: null,
    beta: null,
  };
  precomputed.naf = this._getNAFPoints(8);
  precomputed.doubles = this._getDoubles(4, power);
  precomputed.beta = this._getBeta();
  this.precomputed = precomputed;

  return this;
};

BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
  if (!this.precomputed)
    return false;

  var doubles = this.precomputed.doubles;
  if (!doubles)
    return false;

  return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
};

BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
  if (this.precomputed && this.precomputed.doubles)
    return this.precomputed.doubles;

  var doubles = [ this ];
  var acc = this;
  for (var i = 0; i < power; i += step) {
    for (var j = 0; j < step; j++)
      acc = acc.dbl();
    doubles.push(acc);
  }
  return {
    step: step,
    points: doubles,
  };
};

BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
  if (this.precomputed && this.precomputed.naf)
    return this.precomputed.naf;

  var res = [ this ];
  var max = (1 << wnd) - 1;
  var dbl = max === 1 ? null : this.dbl();
  for (var i = 1; i < max; i++)
    res[i] = res[i - 1].add(dbl);
  return {
    wnd: wnd,
    points: res,
  };
};

BasePoint.prototype._getBeta = function _getBeta() {
  return null;
};

BasePoint.prototype.dblp = function dblp(k) {
  var r = this;
  for (var i = 0; i < k; i++)
    r = r.dbl();
  return r;
};

var inherits_browser = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}
});






var assert$2 = utils_1$1.assert;

function ShortCurve(conf) {
  base.call(this, 'short', conf);

  this.a = new BN(conf.a, 16).toRed(this.red);
  this.b = new BN(conf.b, 16).toRed(this.red);
  this.tinv = this.two.redInvm();

  this.zeroA = this.a.fromRed().cmpn(0) === 0;
  this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;

  // If the curve is endomorphic, precalculate beta and lambda
  this.endo = this._getEndomorphism(conf);
  this._endoWnafT1 = new Array(4);
  this._endoWnafT2 = new Array(4);
}
inherits_browser(ShortCurve, base);
var short_1 = ShortCurve;

ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
  // No efficient endomorphism
  if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1)
    return;

  // Compute beta and lambda, that lambda * P = (beta * Px; Py)
  var beta;
  var lambda;
  if (conf.beta) {
    beta = new BN(conf.beta, 16).toRed(this.red);
  } else {
    var betas = this._getEndoRoots(this.p);
    // Choose the smallest beta
    beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
    beta = beta.toRed(this.red);
  }
  if (conf.lambda) {
    lambda = new BN(conf.lambda, 16);
  } else {
    // Choose the lambda that is matching selected beta
    var lambdas = this._getEndoRoots(this.n);
    if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
      lambda = lambdas[0];
    } else {
      lambda = lambdas[1];
      assert$2(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
    }
  }

  // Get basis vectors, used for balanced length-two representation
  var basis;
  if (conf.basis) {
    basis = conf.basis.map(function(vec) {
      return {
        a: new BN(vec.a, 16),
        b: new BN(vec.b, 16),
      };
    });
  } else {
    basis = this._getEndoBasis(lambda);
  }

  return {
    beta: beta,
    lambda: lambda,
    basis: basis,
  };
};

ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
  // Find roots of for x^2 + x + 1 in F
  // Root = (-1 +- Sqrt(-3)) / 2
  //
  var red = num === this.p ? this.red : BN.mont(num);
  var tinv = new BN(2).toRed(red).redInvm();
  var ntinv = tinv.redNeg();

  var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);

  var l1 = ntinv.redAdd(s).fromRed();
  var l2 = ntinv.redSub(s).fromRed();
  return [ l1, l2 ];
};

ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
  // aprxSqrt >= sqrt(this.n)
  var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));

  // 3.74
  // Run EGCD, until r(L + 1) < aprxSqrt
  var u = lambda;
  var v = this.n.clone();
  var x1 = new BN(1);
  var y1 = new BN(0);
  var x2 = new BN(0);
  var y2 = new BN(1);

  // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)
  var a0;
  var b0;
  // First vector
  var a1;
  var b1;
  // Second vector
  var a2;
  var b2;

  var prevR;
  var i = 0;
  var r;
  var x;
  while (u.cmpn(0) !== 0) {
    var q = v.div(u);
    r = v.sub(q.mul(u));
    x = x2.sub(q.mul(x1));
    var y = y2.sub(q.mul(y1));

    if (!a1 && r.cmp(aprxSqrt) < 0) {
      a0 = prevR.neg();
      b0 = x1;
      a1 = r.neg();
      b1 = x;
    } else if (a1 && ++i === 2) {
      break;
    }
    prevR = r;

    v = u;
    u = r;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  a2 = r.neg();
  b2 = x;

  var len1 = a1.sqr().add(b1.sqr());
  var len2 = a2.sqr().add(b2.sqr());
  if (len2.cmp(len1) >= 0) {
    a2 = a0;
    b2 = b0;
  }

  // Normalize signs
  if (a1.negative) {
    a1 = a1.neg();
    b1 = b1.neg();
  }
  if (a2.negative) {
    a2 = a2.neg();
    b2 = b2.neg();
  }

  return [
    { a: a1, b: b1 },
    { a: a2, b: b2 },
  ];
};

ShortCurve.prototype._endoSplit = function _endoSplit(k) {
  var basis = this.endo.basis;
  var v1 = basis[0];
  var v2 = basis[1];

  var c1 = v2.b.mul(k).divRound(this.n);
  var c2 = v1.b.neg().mul(k).divRound(this.n);

  var p1 = c1.mul(v1.a);
  var p2 = c2.mul(v2.a);
  var q1 = c1.mul(v1.b);
  var q2 = c2.mul(v2.b);

  // Calculate answer
  var k1 = k.sub(p1).sub(p2);
  var k2 = q1.add(q2).neg();
  return { k1: k1, k2: k2 };
};

ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
  x = new BN(x, 16);
  if (!x.red)
    x = x.toRed(this.red);

  var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
  var y = y2.redSqrt();
  if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  // XXX Is there any way to tell if the number is odd without converting it
  // to non-red form?
  var isOdd = y.fromRed().isOdd();
  if (odd && !isOdd || !odd && isOdd)
    y = y.redNeg();

  return this.point(x, y);
};

ShortCurve.prototype.validate = function validate(point) {
  if (point.inf)
    return true;

  var x = point.x;
  var y = point.y;

  var ax = this.a.redMul(x);
  var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
  return y.redSqr().redISub(rhs).cmpn(0) === 0;
};

ShortCurve.prototype._endoWnafMulAdd =
    function _endoWnafMulAdd(points, coeffs, jacobianResult) {
      var npoints = this._endoWnafT1;
      var ncoeffs = this._endoWnafT2;
      for (var i = 0; i < points.length; i++) {
        var split = this._endoSplit(coeffs[i]);
        var p = points[i];
        var beta = p._getBeta();

        if (split.k1.negative) {
          split.k1.ineg();
          p = p.neg(true);
        }
        if (split.k2.negative) {
          split.k2.ineg();
          beta = beta.neg(true);
        }

        npoints[i * 2] = p;
        npoints[i * 2 + 1] = beta;
        ncoeffs[i * 2] = split.k1;
        ncoeffs[i * 2 + 1] = split.k2;
      }
      var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);

      // Clean-up references to points and coefficients
      for (var j = 0; j < i * 2; j++) {
        npoints[j] = null;
        ncoeffs[j] = null;
      }
      return res;
    };

function Point(curve, x, y, isRed) {
  base.BasePoint.call(this, curve, 'affine');
  if (x === null && y === null) {
    this.x = null;
    this.y = null;
    this.inf = true;
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    // Force redgomery representation when loading from JSON
    if (isRed) {
      this.x.forceRed(this.curve.red);
      this.y.forceRed(this.curve.red);
    }
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    this.inf = false;
  }
}
inherits_browser(Point, base.BasePoint);

ShortCurve.prototype.point = function point(x, y, isRed) {
  return new Point(this, x, y, isRed);
};

ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
  return Point.fromJSON(this, obj, red);
};

Point.prototype._getBeta = function _getBeta() {
  if (!this.curve.endo)
    return;

  var pre = this.precomputed;
  if (pre && pre.beta)
    return pre.beta;

  var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
  if (pre) {
    var curve = this.curve;
    var endoMul = function(p) {
      return curve.point(p.x.redMul(curve.endo.beta), p.y);
    };
    pre.beta = beta;
    beta.precomputed = {
      beta: null,
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(endoMul),
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(endoMul),
      },
    };
  }
  return beta;
};

Point.prototype.toJSON = function toJSON() {
  if (!this.precomputed)
    return [ this.x, this.y ];

  return [ this.x, this.y, this.precomputed && {
    doubles: this.precomputed.doubles && {
      step: this.precomputed.doubles.step,
      points: this.precomputed.doubles.points.slice(1),
    },
    naf: this.precomputed.naf && {
      wnd: this.precomputed.naf.wnd,
      points: this.precomputed.naf.points.slice(1),
    },
  } ];
};

Point.fromJSON = function fromJSON(curve, obj, red) {
  if (typeof obj === 'string')
    obj = JSON.parse(obj);
  var res = curve.point(obj[0], obj[1], red);
  if (!obj[2])
    return res;

  function obj2point(obj) {
    return curve.point(obj[0], obj[1], red);
  }

  var pre = obj[2];
  res.precomputed = {
    beta: null,
    doubles: pre.doubles && {
      step: pre.doubles.step,
      points: [ res ].concat(pre.doubles.points.map(obj2point)),
    },
    naf: pre.naf && {
      wnd: pre.naf.wnd,
      points: [ res ].concat(pre.naf.points.map(obj2point)),
    },
  };
  return res;
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' y: ' + this.y.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  return this.inf;
};

Point.prototype.add = function add(p) {
  // O + P = P
  if (this.inf)
    return p;

  // P + O = P
  if (p.inf)
    return this;

  // P + P = 2P
  if (this.eq(p))
    return this.dbl();

  // P + (-P) = O
  if (this.neg().eq(p))
    return this.curve.point(null, null);

  // P + Q = O
  if (this.x.cmp(p.x) === 0)
    return this.curve.point(null, null);

  var c = this.y.redSub(p.y);
  if (c.cmpn(0) !== 0)
    c = c.redMul(this.x.redSub(p.x).redInvm());
  var nx = c.redSqr().redISub(this.x).redISub(p.x);
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.dbl = function dbl() {
  if (this.inf)
    return this;

  // 2P = O
  var ys1 = this.y.redAdd(this.y);
  if (ys1.cmpn(0) === 0)
    return this.curve.point(null, null);

  var a = this.curve.a;

  var x2 = this.x.redSqr();
  var dyinv = ys1.redInvm();
  var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);

  var nx = c.redSqr().redISub(this.x.redAdd(this.x));
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.getX = function getX() {
  return this.x.fromRed();
};

Point.prototype.getY = function getY() {
  return this.y.fromRed();
};

Point.prototype.mul = function mul(k) {
  k = new BN(k, 16);
  if (this.isInfinity())
    return this;
  else if (this._hasDoubles(k))
    return this.curve._fixedNafMul(this, k);
  else if (this.curve.endo)
    return this.curve._endoWnafMulAdd([ this ], [ k ]);
  else
    return this.curve._wnafMul(this, k);
};

Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2);
};

Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs, true);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
};

Point.prototype.eq = function eq(p) {
  return this === p ||
         this.inf === p.inf &&
             (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
};

Point.prototype.neg = function neg(_precompute) {
  if (this.inf)
    return this;

  var res = this.curve.point(this.x, this.y.redNeg());
  if (_precompute && this.precomputed) {
    var pre = this.precomputed;
    var negate = function(p) {
      return p.neg();
    };
    res.precomputed = {
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(negate),
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(negate),
      },
    };
  }
  return res;
};

Point.prototype.toJ = function toJ() {
  if (this.inf)
    return this.curve.jpoint(null, null, null);

  var res = this.curve.jpoint(this.x, this.y, this.curve.one);
  return res;
};

function JPoint(curve, x, y, z) {
  base.BasePoint.call(this, curve, 'jacobian');
  if (x === null && y === null && z === null) {
    this.x = this.curve.one;
    this.y = this.curve.one;
    this.z = new BN(0);
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    this.z = new BN(z, 16);
  }
  if (!this.x.red)
    this.x = this.x.toRed(this.curve.red);
  if (!this.y.red)
    this.y = this.y.toRed(this.curve.red);
  if (!this.z.red)
    this.z = this.z.toRed(this.curve.red);

  this.zOne = this.z === this.curve.one;
}
inherits_browser(JPoint, base.BasePoint);

ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
  return new JPoint(this, x, y, z);
};

JPoint.prototype.toP = function toP() {
  if (this.isInfinity())
    return this.curve.point(null, null);

  var zinv = this.z.redInvm();
  var zinv2 = zinv.redSqr();
  var ax = this.x.redMul(zinv2);
  var ay = this.y.redMul(zinv2).redMul(zinv);

  return this.curve.point(ax, ay);
};

JPoint.prototype.neg = function neg() {
  return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
};

JPoint.prototype.add = function add(p) {
  // O + P = P
  if (this.isInfinity())
    return p;

  // P + O = P
  if (p.isInfinity())
    return this;

  // 12M + 4S + 7A
  var pz2 = p.z.redSqr();
  var z2 = this.z.redSqr();
  var u1 = this.x.redMul(pz2);
  var u2 = p.x.redMul(z2);
  var s1 = this.y.redMul(pz2.redMul(p.z));
  var s2 = p.y.redMul(z2.redMul(this.z));

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(p.z).redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mixedAdd = function mixedAdd(p) {
  // O + P = P
  if (this.isInfinity())
    return p.toJ();

  // P + O = P
  if (p.isInfinity())
    return this;

  // 8M + 3S + 7A
  var z2 = this.z.redSqr();
  var u1 = this.x;
  var u2 = p.x.redMul(z2);
  var s1 = this.y;
  var s2 = p.y.redMul(z2).redMul(this.z);

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.dblp = function dblp(pow) {
  if (pow === 0)
    return this;
  if (this.isInfinity())
    return this;
  if (!pow)
    return this.dbl();

  var i;
  if (this.curve.zeroA || this.curve.threeA) {
    var r = this;
    for (i = 0; i < pow; i++)
      r = r.dbl();
    return r;
  }

  // 1M + 2S + 1A + N * (4S + 5M + 8A)
  // N = 1 => 6M + 6S + 9A
  var a = this.curve.a;
  var tinv = this.curve.tinv;

  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  // Reuse results
  var jyd = jy.redAdd(jy);
  for (i = 0; i < pow; i++) {
    var jx2 = jx.redSqr();
    var jyd2 = jyd.redSqr();
    var jyd4 = jyd2.redSqr();
    var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

    var t1 = jx.redMul(jyd2);
    var nx = c.redSqr().redISub(t1.redAdd(t1));
    var t2 = t1.redISub(nx);
    var dny = c.redMul(t2);
    dny = dny.redIAdd(dny).redISub(jyd4);
    var nz = jyd.redMul(jz);
    if (i + 1 < pow)
      jz4 = jz4.redMul(jyd4);

    jx = nx;
    jz = nz;
    jyd = dny;
  }

  return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
};

JPoint.prototype.dbl = function dbl() {
  if (this.isInfinity())
    return this;

  if (this.curve.zeroA)
    return this._zeroDbl();
  else if (this.curve.threeA)
    return this._threeDbl();
  else
    return this._dbl();
};

JPoint.prototype._zeroDbl = function _zeroDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 14A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a; a = 0
    var m = xx.redAdd(xx).redIAdd(xx);
    // T = M ^ 2 - 2*S
    var t = m.redSqr().redISub(s).redISub(s);

    // 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);

    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2*Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-dbl-2009-l
    // 2M + 5S + 13A

    // A = X1^2
    var a = this.x.redSqr();
    // B = Y1^2
    var b = this.y.redSqr();
    // C = B^2
    var c = b.redSqr();
    // D = 2 * ((X1 + B)^2 - A - C)
    var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
    d = d.redIAdd(d);
    // E = 3 * A
    var e = a.redAdd(a).redIAdd(a);
    // F = E^2
    var f = e.redSqr();

    // 8 * C
    var c8 = c.redIAdd(c);
    c8 = c8.redIAdd(c8);
    c8 = c8.redIAdd(c8);

    // X3 = F - 2 * D
    nx = f.redISub(d).redISub(d);
    // Y3 = E * (D - X3) - 8 * C
    ny = e.redMul(d.redISub(nx)).redISub(c8);
    // Z3 = 2 * Y1 * Z1
    nz = this.y.redMul(this.z);
    nz = nz.redIAdd(nz);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._threeDbl = function _threeDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 15A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a
    var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
    // T = M^2 - 2 * S
    var t = m.redSqr().redISub(s).redISub(s);
    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2 * Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
    // 3M + 5S

    // delta = Z1^2
    var delta = this.z.redSqr();
    // gamma = Y1^2
    var gamma = this.y.redSqr();
    // beta = X1 * gamma
    var beta = this.x.redMul(gamma);
    // alpha = 3 * (X1 - delta) * (X1 + delta)
    var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
    alpha = alpha.redAdd(alpha).redIAdd(alpha);
    // X3 = alpha^2 - 8 * beta
    var beta4 = beta.redIAdd(beta);
    beta4 = beta4.redIAdd(beta4);
    var beta8 = beta4.redAdd(beta4);
    nx = alpha.redSqr().redISub(beta8);
    // Z3 = (Y1 + Z1)^2 - gamma - delta
    nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
    // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2
    var ggamma8 = gamma.redSqr();
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._dbl = function _dbl() {
  var a = this.curve.a;

  // 4M + 6S + 10A
  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  var jx2 = jx.redSqr();
  var jy2 = jy.redSqr();

  var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

  var jxd4 = jx.redAdd(jx);
  jxd4 = jxd4.redIAdd(jxd4);
  var t1 = jxd4.redMul(jy2);
  var nx = c.redSqr().redISub(t1.redAdd(t1));
  var t2 = t1.redISub(nx);

  var jyd8 = jy2.redSqr();
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  var ny = c.redMul(t2).redISub(jyd8);
  var nz = jy.redAdd(jy).redMul(jz);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.trpl = function trpl() {
  if (!this.curve.zeroA)
    return this.dbl().add(this);

  // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
  // 5M + 10S + ...

  // XX = X1^2
  var xx = this.x.redSqr();
  // YY = Y1^2
  var yy = this.y.redSqr();
  // ZZ = Z1^2
  var zz = this.z.redSqr();
  // YYYY = YY^2
  var yyyy = yy.redSqr();
  // M = 3 * XX + a * ZZ2; a = 0
  var m = xx.redAdd(xx).redIAdd(xx);
  // MM = M^2
  var mm = m.redSqr();
  // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM
  var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
  e = e.redIAdd(e);
  e = e.redAdd(e).redIAdd(e);
  e = e.redISub(mm);
  // EE = E^2
  var ee = e.redSqr();
  // T = 16*YYYY
  var t = yyyy.redIAdd(yyyy);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  // U = (M + E)^2 - MM - EE - T
  var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
  // X3 = 4 * (X1 * EE - 4 * YY * U)
  var yyu4 = yy.redMul(u);
  yyu4 = yyu4.redIAdd(yyu4);
  yyu4 = yyu4.redIAdd(yyu4);
  var nx = this.x.redMul(ee).redISub(yyu4);
  nx = nx.redIAdd(nx);
  nx = nx.redIAdd(nx);
  // Y3 = 8 * Y1 * (U * (T - U) - E * EE)
  var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  // Z3 = (Z1 + E)^2 - ZZ - EE
  var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mul = function mul(k, kbase) {
  k = new BN(k, kbase);

  return this.curve._wnafMul(this, k);
};

JPoint.prototype.eq = function eq(p) {
  if (p.type === 'affine')
    return this.eq(p.toJ());

  if (this === p)
    return true;

  // x1 * z2^2 == x2 * z1^2
  var z2 = this.z.redSqr();
  var pz2 = p.z.redSqr();
  if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0)
    return false;

  // y1 * z2^3 == y2 * z1^3
  var z3 = z2.redMul(this.z);
  var pz3 = pz2.redMul(p.z);
  return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
};

JPoint.prototype.eqXToP = function eqXToP(x) {
  var zs = this.z.redSqr();
  var rx = x.toRed(this.curve.red).redMul(zs);
  if (this.x.cmp(rx) === 0)
    return true;

  var xc = x.clone();
  var t = this.curve.redN.redMul(zs);
  for (;;) {
    xc.iadd(this.curve.n);
    if (xc.cmp(this.curve.p) >= 0)
      return false;

    rx.redIAdd(t);
    if (this.x.cmp(rx) === 0)
      return true;
  }
};

JPoint.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC JPoint Infinity>';
  return '<EC JPoint x: ' + this.x.toString(16, 2) +
      ' y: ' + this.y.toString(16, 2) +
      ' z: ' + this.z.toString(16, 2) + '>';
};

JPoint.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.z.cmpn(0) === 0;
};

var curve_1 = createCommonjsModule(function (module, exports) {

var curve = exports;

curve.base = base;
curve.short = short_1;
curve.mont = /*RicMoo:ethers:require(./mont)*/(null);
curve.edwards = /*RicMoo:ethers:require(./edwards)*/(null);
});

var curves_1 = createCommonjsModule(function (module, exports) {

var curves = exports;





var assert = utils_1$1.assert;

function PresetCurve(options) {
  if (options.type === 'short')
    this.curve = new curve_1.short(options);
  else if (options.type === 'edwards')
    this.curve = new curve_1.edwards(options);
  else
    this.curve = new curve_1.mont(options);
  this.g = this.curve.g;
  this.n = this.curve.n;
  this.hash = options.hash;

  assert(this.g.validate(), 'Invalid curve');
  assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
}
curves.PresetCurve = PresetCurve;

function defineCurve(name, options) {
  Object.defineProperty(curves, name, {
    configurable: true,
    enumerable: true,
    get: function() {
      var curve = new PresetCurve(options);
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        value: curve,
      });
      return curve;
    },
  });
}

defineCurve('p192', {
  type: 'short',
  prime: 'p192',
  p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
  b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
  n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
  hash: hash.sha256,
  gRed: false,
  g: [
    '188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012',
    '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811',
  ],
});

defineCurve('p224', {
  type: 'short',
  prime: 'p224',
  p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
  b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
  n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
  hash: hash.sha256,
  gRed: false,
  g: [
    'b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21',
    'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34',
  ],
});

defineCurve('p256', {
  type: 'short',
  prime: null,
  p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
  a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
  b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
  n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
  hash: hash.sha256,
  gRed: false,
  g: [
    '6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296',
    '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5',
  ],
});

defineCurve('p384', {
  type: 'short',
  prime: null,
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 ffffffff',
  a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 fffffffc',
  b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' +
     '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
  n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' +
     'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
  hash: hash.sha384,
  gRed: false,
  g: [
    'aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' +
    '5502f25d bf55296c 3a545e38 72760ab7',
    '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' +
    '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f',
  ],
});

defineCurve('p521', {
  type: 'short',
  prime: null,
  p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff',
  a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff fffffffc',
  b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' +
     '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' +
     '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
  n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' +
     'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
  hash: hash.sha512,
  gRed: false,
  g: [
    '000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' +
    '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' +
    'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66',
    '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' +
    '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' +
    '3fad0761 353c7086 a272c240 88be9476 9fd16650',
  ],
});

defineCurve('curve25519', {
  type: 'mont',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '76d06',
  b: '1',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '9',
  ],
});

defineCurve('ed25519', {
  type: 'edwards',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '-1',
  c: '1',
  // -121665 * (121666^(-1)) (mod P)
  d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a',

    // 4/5
    '6666666666666666666666666666666666666666666666666666666666666658',
  ],
});

var pre;
try {
  pre = /*RicMoo:ethers:require(./precomputed/secp256k1)*/(null).crash();
} catch (e) {
  pre = undefined;
}

defineCurve('secp256k1', {
  type: 'short',
  prime: 'k256',
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
  a: '0',
  b: '7',
  n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
  h: '1',
  hash: hash.sha256,

  // Precomputed endomorphism
  beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
  lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
  basis: [
    {
      a: '3086d221a7d46bcde86c90e49284eb15',
      b: '-e4437ed6010e88286f547fa90abfe4c3',
    },
    {
      a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
      b: '3086d221a7d46bcde86c90e49284eb15',
    },
  ],

  gRed: false,
  g: [
    '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    pre,
  ],
});
});





function HmacDRBG(options) {
  if (!(this instanceof HmacDRBG))
    return new HmacDRBG(options);
  this.hash = options.hash;
  this.predResist = !!options.predResist;

  this.outLen = this.hash.outSize;
  this.minEntropy = options.minEntropy || this.hash.hmacStrength;

  this._reseed = null;
  this.reseedInterval = null;
  this.K = null;
  this.V = null;

  var entropy = utils_1.toArray(options.entropy, options.entropyEnc || 'hex');
  var nonce = utils_1.toArray(options.nonce, options.nonceEnc || 'hex');
  var pers = utils_1.toArray(options.pers, options.persEnc || 'hex');
  minimalisticAssert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');
  this._init(entropy, nonce, pers);
}
var hmacDrbg = HmacDRBG;

HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
  var seed = entropy.concat(nonce).concat(pers);

  this.K = new Array(this.outLen / 8);
  this.V = new Array(this.outLen / 8);
  for (var i = 0; i < this.V.length; i++) {
    this.K[i] = 0x00;
    this.V[i] = 0x01;
  }

  this._update(seed);
  this._reseed = 1;
  this.reseedInterval = 0x1000000000000;  // 2^48
};

HmacDRBG.prototype._hmac = function hmac() {
  return new hash.hmac(this.hash, this.K);
};

HmacDRBG.prototype._update = function update(seed) {
  var kmac = this._hmac()
                 .update(this.V)
                 .update([ 0x00 ]);
  if (seed)
    kmac = kmac.update(seed);
  this.K = kmac.digest();
  this.V = this._hmac().update(this.V).digest();
  if (!seed)
    return;

  this.K = this._hmac()
               .update(this.V)
               .update([ 0x01 ])
               .update(seed)
               .digest();
  this.V = this._hmac().update(this.V).digest();
};

HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
  // Optional entropy enc
  if (typeof entropyEnc !== 'string') {
    addEnc = add;
    add = entropyEnc;
    entropyEnc = null;
  }

  entropy = utils_1.toArray(entropy, entropyEnc);
  add = utils_1.toArray(add, addEnc);

  minimalisticAssert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

  this._update(entropy.concat(add || []));
  this._reseed = 1;
};

HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
  if (this._reseed > this.reseedInterval)
    throw new Error('Reseed is required');

  // Optional encoding
  if (typeof enc !== 'string') {
    addEnc = add;
    add = enc;
    enc = null;
  }

  // Optional additional data
  if (add) {
    add = utils_1.toArray(add, addEnc || 'hex');
    this._update(add);
  }

  var temp = [];
  while (temp.length < len) {
    this.V = this._hmac().update(this.V).digest();
    temp = temp.concat(this.V);
  }

  var res = temp.slice(0, len);
  this._update(add);
  this._reseed++;
  return utils_1.encode(res, enc);
};



var assert$3 = utils_1$1.assert;

function KeyPair(ec, options) {
  this.ec = ec;
  this.priv = null;
  this.pub = null;

  // KeyPair(ec, { priv: ..., pub: ... })
  if (options.priv)
    this._importPrivate(options.priv, options.privEnc);
  if (options.pub)
    this._importPublic(options.pub, options.pubEnc);
}
var key = KeyPair;

KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
  if (pub instanceof KeyPair)
    return pub;

  return new KeyPair(ec, {
    pub: pub,
    pubEnc: enc,
  });
};

KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
  if (priv instanceof KeyPair)
    return priv;

  return new KeyPair(ec, {
    priv: priv,
    privEnc: enc,
  });
};

KeyPair.prototype.validate = function validate() {
  var pub = this.getPublic();

  if (pub.isInfinity())
    return { result: false, reason: 'Invalid public key' };
  if (!pub.validate())
    return { result: false, reason: 'Public key is not a point' };
  if (!pub.mul(this.ec.curve.n).isInfinity())
    return { result: false, reason: 'Public key * N != O' };

  return { result: true, reason: null };
};

KeyPair.prototype.getPublic = function getPublic(compact, enc) {
  // compact is optional argument
  if (typeof compact === 'string') {
    enc = compact;
    compact = null;
  }

  if (!this.pub)
    this.pub = this.ec.g.mul(this.priv);

  if (!enc)
    return this.pub;

  return this.pub.encode(enc, compact);
};

KeyPair.prototype.getPrivate = function getPrivate(enc) {
  if (enc === 'hex')
    return this.priv.toString(16, 2);
  else
    return this.priv;
};

KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
  this.priv = new BN(key, enc || 16);

  // Ensure that the priv won't be bigger than n, otherwise we may fail
  // in fixed multiplication method
  this.priv = this.priv.umod(this.ec.curve.n);
};

KeyPair.prototype._importPublic = function _importPublic(key, enc) {
  if (key.x || key.y) {
    // Montgomery points only have an `x` coordinate.
    // Weierstrass/Edwards points on the other hand have both `x` and
    // `y` coordinates.
    if (this.ec.curve.type === 'mont') {
      assert$3(key.x, 'Need x coordinate');
    } else if (this.ec.curve.type === 'short' ||
               this.ec.curve.type === 'edwards') {
      assert$3(key.x && key.y, 'Need both x and y coordinate');
    }
    this.pub = this.ec.curve.point(key.x, key.y);
    return;
  }
  this.pub = this.ec.curve.decodePoint(key, enc);
};

// ECDH
KeyPair.prototype.derive = function derive(pub) {
  if(!pub.validate()) {
    assert$3(pub.validate(), 'public point not validated');
  }
  return pub.mul(this.priv).getX();
};

// ECDSA
KeyPair.prototype.sign = function sign(msg, enc, options) {
  return this.ec.sign(msg, this, enc, options);
};

KeyPair.prototype.verify = function verify(msg, signature) {
  return this.ec.verify(msg, signature, this);
};

KeyPair.prototype.inspect = function inspect() {
  return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) +
         ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
};




var assert$4 = utils_1$1.assert;

function Signature(options, enc) {
  if (options instanceof Signature)
    return options;

  if (this._importDER(options, enc))
    return;

  assert$4(options.r && options.s, 'Signature without r or s');
  this.r = new BN(options.r, 16);
  this.s = new BN(options.s, 16);
  if (options.recoveryParam === undefined)
    this.recoveryParam = null;
  else
    this.recoveryParam = options.recoveryParam;
}
var signature = Signature;

function Position() {
  this.place = 0;
}

function getLength(buf, p) {
  var initial = buf[p.place++];
  if (!(initial & 0x80)) {
    return initial;
  }
  var octetLen = initial & 0xf;

  // Indefinite length or overflow
  if (octetLen === 0 || octetLen > 4) {
    return false;
  }

  var val = 0;
  for (var i = 0, off = p.place; i < octetLen; i++, off++) {
    val <<= 8;
    val |= buf[off];
    val >>>= 0;
  }

  // Leading zeroes
  if (val <= 0x7f) {
    return false;
  }

  p.place = off;
  return val;
}

function rmPadding(buf) {
  var i = 0;
  var len = buf.length - 1;
  while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
    i++;
  }
  if (i === 0) {
    return buf;
  }
  return buf.slice(i);
}

Signature.prototype._importDER = function _importDER(data, enc) {
  data = utils_1$1.toArray(data, enc);
  var p = new Position();
  if (data[p.place++] !== 0x30) {
    return false;
  }
  var len = getLength(data, p);
  if (len === false) {
    return false;
  }
  if ((len + p.place) !== data.length) {
    return false;
  }
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var rlen = getLength(data, p);
  if (rlen === false) {
    return false;
  }
  var r = data.slice(p.place, rlen + p.place);
  p.place += rlen;
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var slen = getLength(data, p);
  if (slen === false) {
    return false;
  }
  if (data.length !== slen + p.place) {
    return false;
  }
  var s = data.slice(p.place, slen + p.place);
  if (r[0] === 0) {
    if (r[1] & 0x80) {
      r = r.slice(1);
    } else {
      // Leading zeroes
      return false;
    }
  }
  if (s[0] === 0) {
    if (s[1] & 0x80) {
      s = s.slice(1);
    } else {
      // Leading zeroes
      return false;
    }
  }

  this.r = new BN(r);
  this.s = new BN(s);
  this.recoveryParam = null;

  return true;
};

function constructLength(arr, len) {
  if (len < 0x80) {
    arr.push(len);
    return;
  }
  var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
  arr.push(octets | 0x80);
  while (--octets) {
    arr.push((len >>> (octets << 3)) & 0xff);
  }
  arr.push(len);
}

Signature.prototype.toDER = function toDER(enc) {
  var r = this.r.toArray();
  var s = this.s.toArray();

  // Pad values
  if (r[0] & 0x80)
    r = [ 0 ].concat(r);
  // Pad values
  if (s[0] & 0x80)
    s = [ 0 ].concat(s);

  r = rmPadding(r);
  s = rmPadding(s);

  while (!s[0] && !(s[1] & 0x80)) {
    s = s.slice(1);
  }
  var arr = [ 0x02 ];
  constructLength(arr, r.length);
  arr = arr.concat(r);
  arr.push(0x02);
  constructLength(arr, s.length);
  var backHalf = arr.concat(s);
  var res = [ 0x30 ];
  constructLength(res, backHalf.length);
  res = res.concat(backHalf);
  return utils_1$1.encode(res, enc);
};





var rand = /*RicMoo:ethers:require(brorand)*/(function() { throw new Error('unsupported'); });
var assert$5 = utils_1$1.assert;




function EC(options) {
  if (!(this instanceof EC))
    return new EC(options);

  // Shortcut `elliptic.ec(curve-name)`
  if (typeof options === 'string') {
    assert$5(Object.prototype.hasOwnProperty.call(curves_1, options),
      'Unknown curve ' + options);

    options = curves_1[options];
  }

  // Shortcut for `elliptic.ec(elliptic.curves.curveName)`
  if (options instanceof curves_1.PresetCurve)
    options = { curve: options };

  this.curve = options.curve.curve;
  this.n = this.curve.n;
  this.nh = this.n.ushrn(1);
  this.g = this.curve.g;

  // Point on curve
  this.g = options.curve.g;
  this.g.precompute(options.curve.n.bitLength() + 1);

  // Hash for function for DRBG
  this.hash = options.hash || options.curve.hash;
}
var ec = EC;

EC.prototype.keyPair = function keyPair(options) {
  return new key(this, options);
};

EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
  return key.fromPrivate(this, priv, enc);
};

EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
  return key.fromPublic(this, pub, enc);
};

EC.prototype.genKeyPair = function genKeyPair(options) {
  if (!options)
    options = {};

  // Instantiate Hmac_DRBG
  var drbg = new hmacDrbg({
    hash: this.hash,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8',
    entropy: options.entropy || rand(this.hash.hmacStrength),
    entropyEnc: options.entropy && options.entropyEnc || 'utf8',
    nonce: this.n.toArray(),
  });

  var bytes = this.n.byteLength();
  var ns2 = this.n.sub(new BN(2));
  for (;;) {
    var priv = new BN(drbg.generate(bytes));
    if (priv.cmp(ns2) > 0)
      continue;

    priv.iaddn(1);
    return this.keyFromPrivate(priv);
  }
};

EC.prototype._truncateToN = function _truncateToN(msg, truncOnly) {
  var delta = msg.byteLength() * 8 - this.n.bitLength();
  if (delta > 0)
    msg = msg.ushrn(delta);
  if (!truncOnly && msg.cmp(this.n) >= 0)
    return msg.sub(this.n);
  else
    return msg;
};

EC.prototype.sign = function sign(msg, key, enc, options) {
  if (typeof enc === 'object') {
    options = enc;
    enc = null;
  }
  if (!options)
    options = {};

  key = this.keyFromPrivate(key, enc);
  msg = this._truncateToN(new BN(msg, 16));

  // Zero-extend key to provide enough entropy
  var bytes = this.n.byteLength();
  var bkey = key.getPrivate().toArray('be', bytes);

  // Zero-extend nonce to have the same byte size as N
  var nonce = msg.toArray('be', bytes);

  // Instantiate Hmac_DRBG
  var drbg = new hmacDrbg({
    hash: this.hash,
    entropy: bkey,
    nonce: nonce,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8',
  });

  // Number of bytes to generate
  var ns1 = this.n.sub(new BN(1));

  for (var iter = 0; ; iter++) {
    var k = options.k ?
      options.k(iter) :
      new BN(drbg.generate(this.n.byteLength()));
    k = this._truncateToN(k, true);
    if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0)
      continue;

    var kp = this.g.mul(k);
    if (kp.isInfinity())
      continue;

    var kpX = kp.getX();
    var r = kpX.umod(this.n);
    if (r.cmpn(0) === 0)
      continue;

    var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
    s = s.umod(this.n);
    if (s.cmpn(0) === 0)
      continue;

    var recoveryParam = (kp.getY().isOdd() ? 1 : 0) |
                        (kpX.cmp(r) !== 0 ? 2 : 0);

    // Use complement of `s`, if it is > `n / 2`
    if (options.canonical && s.cmp(this.nh) > 0) {
      s = this.n.sub(s);
      recoveryParam ^= 1;
    }

    return new signature({ r: r, s: s, recoveryParam: recoveryParam });
  }
};

EC.prototype.verify = function verify(msg, signature$1, key, enc) {
  msg = this._truncateToN(new BN(msg, 16));
  key = this.keyFromPublic(key, enc);
  signature$1 = new signature(signature$1, 'hex');

  // Perform primitive values validation
  var r = signature$1.r;
  var s = signature$1.s;
  if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0)
    return false;
  if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0)
    return false;

  // Validate signature
  var sinv = s.invm(this.n);
  var u1 = sinv.mul(msg).umod(this.n);
  var u2 = sinv.mul(r).umod(this.n);
  var p;

  if (!this.curve._maxwellTrick) {
    p = this.g.mulAdd(u1, key.getPublic(), u2);
    if (p.isInfinity())
      return false;

    return p.getX().umod(this.n).cmp(r) === 0;
  }

  // NOTE: Greg Maxwell's trick, inspired by:
  // https://git.io/vad3K

  p = this.g.jmulAdd(u1, key.getPublic(), u2);
  if (p.isInfinity())
    return false;

  // Compare `p.x` of Jacobian point with `r`,
  // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
  // inverse of `p.z^2`
  return p.eqXToP(r);
};

EC.prototype.recoverPubKey = function(msg, signature$1, j, enc) {
  assert$5((3 & j) === j, 'The recovery param is more than two bits');
  signature$1 = new signature(signature$1, enc);

  var n = this.n;
  var e = new BN(msg);
  var r = signature$1.r;
  var s = signature$1.s;

  // A set LSB signifies that the y-coordinate is odd
  var isYOdd = j & 1;
  var isSecondKey = j >> 1;
  if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey)
    throw new Error('Unable to find sencond key candinate');

  // 1.1. Let x = r + jn.
  if (isSecondKey)
    r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);
  else
    r = this.curve.pointFromX(r, isYOdd);

  var rInv = signature$1.r.invm(n);
  var s1 = n.sub(e).mul(rInv).umod(n);
  var s2 = s.mul(rInv).umod(n);

  // 1.6.1 Compute Q = r^-1 (sR -  eG)
  //               Q = r^-1 (sR + -eG)
  return this.g.mulAdd(s1, r, s2);
};

EC.prototype.getKeyRecoveryParam = function(e, signature$1, Q, enc) {
  signature$1 = new signature(signature$1, enc);
  if (signature$1.recoveryParam !== null)
    return signature$1.recoveryParam;

  for (var i = 0; i < 4; i++) {
    var Qprime;
    try {
      Qprime = this.recoverPubKey(e, signature$1, i);
    } catch (e) {
      continue;
    }

    if (Qprime.eq(Q))
      return i;
  }
  throw new Error('Unable to find valid recovery factor');
};

var elliptic_1 = createCommonjsModule(function (module, exports) {

var elliptic = exports;

elliptic.version = /*RicMoo:ethers*/{ version: "6.5.4" }.version;
elliptic.utils = utils_1$1;
elliptic.rand = /*RicMoo:ethers:require(brorand)*/(function() { throw new Error('unsupported'); });
elliptic.curve = curve_1;
elliptic.curves = curves_1;

// Protocols
elliptic.ec = ec;
elliptic.eddsa = /*RicMoo:ethers:require(./elliptic/eddsa)*/(null);
});

var EC$1 = elliptic_1.ec;

const version$b = "signing-key/5.6.2";

const logger$b = new Logger(version$b);
let _curve = null;
function getCurve() {
    if (!_curve) {
        _curve = new EC$1("secp256k1");
    }
    return _curve;
}
class SigningKey {
    constructor(privateKey) {
        defineReadOnly(this, "curve", "secp256k1");
        defineReadOnly(this, "privateKey", hexlify(privateKey));
        if (hexDataLength(this.privateKey) !== 32) {
            logger$b.throwArgumentError("invalid private key", "privateKey", "[[ REDACTED ]]");
        }
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        defineReadOnly(this, "publicKey", "0x" + keyPair.getPublic(false, "hex"));
        defineReadOnly(this, "compressedPublicKey", "0x" + keyPair.getPublic(true, "hex"));
        defineReadOnly(this, "_isSigningKey", true);
    }
    _addPoint(other) {
        const p0 = getCurve().keyFromPublic(arrayify(this.publicKey));
        const p1 = getCurve().keyFromPublic(arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
    }
    signDigest(digest) {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const digestBytes = arrayify(digest);
        if (digestBytes.length !== 32) {
            logger$b.throwArgumentError("bad digest length", "digest", digest);
        }
        const signature = keyPair.sign(digestBytes, { canonical: true });
        return splitSignature({
            recoveryParam: signature.recoveryParam,
            r: hexZeroPad("0x" + signature.r.toString(16), 32),
            s: hexZeroPad("0x" + signature.s.toString(16), 32),
        });
    }
    computeSharedSecret(otherKey) {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const otherKeyPair = getCurve().keyFromPublic(arrayify(computePublicKey(otherKey)));
        return hexZeroPad("0x" + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
    }
    static isSigningKey(value) {
        return !!(value && value._isSigningKey);
    }
}
function recoverPublicKey(digest, signature) {
    const sig = splitSignature(signature);
    const rs = { r: arrayify(sig.r), s: arrayify(sig.s) };
    return "0x" + getCurve().recoverPubKey(arrayify(digest), rs, sig.recoveryParam).encode("hex", false);
}
function computePublicKey(key, compressed) {
    const bytes = arrayify(key);
    if (bytes.length === 32) {
        const signingKey = new SigningKey(bytes);
        if (compressed) {
            return "0x" + getCurve().keyFromPrivate(bytes).getPublic(true, "hex");
        }
        return signingKey.publicKey;
    }
    else if (bytes.length === 33) {
        if (compressed) {
            return hexlify(bytes);
        }
        return "0x" + getCurve().keyFromPublic(bytes).getPublic(false, "hex");
    }
    else if (bytes.length === 65) {
        if (!compressed) {
            return hexlify(bytes);
        }
        return "0x" + getCurve().keyFromPublic(bytes).getPublic(true, "hex");
    }
    return logger$b.throwArgumentError("invalid public or private key", "key", "[REDACTED]");
}

var lib_esm$8 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    SigningKey: SigningKey,
    recoverPublicKey: recoverPublicKey,
    computePublicKey: computePublicKey
});

const version$a = "rlp/5.6.1";

const logger$a = new Logger(version$a);
function arrayifyInteger(value) {
    const result = [];
    while (value) {
        result.unshift(value & 0xff);
        value >>= 8;
    }
    return result;
}
function unarrayifyInteger(data, offset, length) {
    let result = 0;
    for (let i = 0; i < length; i++) {
        result = (result * 256) + data[offset + i];
    }
    return result;
}
function _encode(object) {
    if (Array.isArray(object)) {
        let payload = [];
        object.forEach(function (child) {
            payload = payload.concat(_encode(child));
        });
        if (payload.length <= 55) {
            payload.unshift(0xc0 + payload.length);
            return payload;
        }
        const length = arrayifyInteger(payload.length);
        length.unshift(0xf7 + length.length);
        return length.concat(payload);
    }
    if (!isBytesLike(object)) {
        logger$a.throwArgumentError("RLP object must be BytesLike", "object", object);
    }
    const data = Array.prototype.slice.call(arrayify(object));
    if (data.length === 1 && data[0] <= 0x7f) {
        return data;
    }
    else if (data.length <= 55) {
        data.unshift(0x80 + data.length);
        return data;
    }
    const length = arrayifyInteger(data.length);
    length.unshift(0xb7 + length.length);
    return length.concat(data);
}
function encode(object) {
    return hexlify(_encode(object));
}
function _decodeChildren(data, offset, childOffset, length) {
    const result = [];
    while (childOffset < offset + 1 + length) {
        const decoded = _decode(data, childOffset);
        result.push(decoded.result);
        childOffset += decoded.consumed;
        if (childOffset > offset + 1 + length) {
            logger$a.throwError("child data too short", Logger.errors.BUFFER_OVERRUN, {});
        }
    }
    return { consumed: (1 + length), result: result };
}
// returns { consumed: number, result: Object }
function _decode(data, offset) {
    if (data.length === 0) {
        logger$a.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    // Array with extra length prefix
    if (data[offset] >= 0xf8) {
        const lengthLength = data[offset] - 0xf7;
        if (offset + 1 + lengthLength > data.length) {
            logger$a.throwError("data short segment too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        const length = unarrayifyInteger(data, offset + 1, lengthLength);
        if (offset + 1 + lengthLength + length > data.length) {
            logger$a.throwError("data long segment too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length);
    }
    else if (data[offset] >= 0xc0) {
        const length = data[offset] - 0xc0;
        if (offset + 1 + length > data.length) {
            logger$a.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        return _decodeChildren(data, offset, offset + 1, length);
    }
    else if (data[offset] >= 0xb8) {
        const lengthLength = data[offset] - 0xb7;
        if (offset + 1 + lengthLength > data.length) {
            logger$a.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        const length = unarrayifyInteger(data, offset + 1, lengthLength);
        if (offset + 1 + lengthLength + length > data.length) {
            logger$a.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        const result = hexlify(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length));
        return { consumed: (1 + lengthLength + length), result: result };
    }
    else if (data[offset] >= 0x80) {
        const length = data[offset] - 0x80;
        if (offset + 1 + length > data.length) {
            logger$a.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
        }
        const result = hexlify(data.slice(offset + 1, offset + 1 + length));
        return { consumed: (1 + length), result: result };
    }
    return { consumed: 1, result: hexlify(data[offset]) };
}
function decode(data) {
    const bytes = arrayify(data);
    const decoded = _decode(bytes, 0);
    if (decoded.consumed !== bytes.length) {
        logger$a.throwArgumentError("invalid rlp data", "data", data);
    }
    return decoded.result;
}

var lib_esm$7 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    encode: encode,
    decode: decode
});

const version$9 = "transactions/5.6.2";

const logger$9 = new Logger(version$9);
var TransactionTypes;
(function (TransactionTypes) {
    TransactionTypes[TransactionTypes["legacy"] = 0] = "legacy";
    TransactionTypes[TransactionTypes["eip2930"] = 1] = "eip2930";
    TransactionTypes[TransactionTypes["eip1559"] = 2] = "eip1559";
})(TransactionTypes || (TransactionTypes = {}));
///////////////////////////////
function handleAddress(value) {
    if (value === "0x") {
        return null;
    }
    return getAddress(value);
}
function handleNumber(value) {
    if (value === "0x") {
        return Zero$1;
    }
    return BigNumber.from(value);
}
// Legacy Transaction Fields
const transactionFields = [
    { name: "nonce", maxLength: 32, numeric: true },
    { name: "gasPrice", maxLength: 32, numeric: true },
    { name: "gasLimit", maxLength: 32, numeric: true },
    { name: "to", length: 20 },
    { name: "value", maxLength: 32, numeric: true },
    { name: "data" },
];
const allowedTransactionKeys = {
    chainId: true, data: true, gasLimit: true, gasPrice: true, nonce: true, to: true, type: true, value: true
};
function computeAddress(key) {
    const publicKey = computePublicKey(key);
    return getAddress(hexDataSlice(keccak256$1(hexDataSlice(publicKey, 1)), 12));
}
function recoverAddress(digest, signature) {
    return computeAddress(recoverPublicKey(arrayify(digest), signature));
}
function formatNumber(value, name) {
    const result = stripZeros(BigNumber.from(value).toHexString());
    if (result.length > 32) {
        logger$9.throwArgumentError("invalid length for " + name, ("transaction:" + name), value);
    }
    return result;
}
function accessSetify(addr, storageKeys) {
    return {
        address: getAddress(addr),
        storageKeys: (storageKeys || []).map((storageKey, index) => {
            if (hexDataLength(storageKey) !== 32) {
                logger$9.throwArgumentError("invalid access list storageKey", `accessList[${addr}:${index}]`, storageKey);
            }
            return storageKey.toLowerCase();
        })
    };
}
function accessListify(value) {
    if (Array.isArray(value)) {
        return value.map((set, index) => {
            if (Array.isArray(set)) {
                if (set.length > 2) {
                    logger$9.throwArgumentError("access list expected to be [ address, storageKeys[] ]", `value[${index}]`, set);
                }
                return accessSetify(set[0], set[1]);
            }
            return accessSetify(set.address, set.storageKeys);
        });
    }
    const result = Object.keys(value).map((addr) => {
        const storageKeys = value[addr].reduce((accum, storageKey) => {
            accum[storageKey] = true;
            return accum;
        }, {});
        return accessSetify(addr, Object.keys(storageKeys).sort());
    });
    result.sort((a, b) => (a.address.localeCompare(b.address)));
    return result;
}
function formatAccessList(value) {
    return accessListify(value).map((set) => [set.address, set.storageKeys]);
}
function _serializeEip1559(transaction, signature) {
    // If there is an explicit gasPrice, make sure it matches the
    // EIP-1559 fees; otherwise they may not understand what they
    // think they are setting in terms of fee.
    if (transaction.gasPrice != null) {
        const gasPrice = BigNumber.from(transaction.gasPrice);
        const maxFeePerGas = BigNumber.from(transaction.maxFeePerGas || 0);
        if (!gasPrice.eq(maxFeePerGas)) {
            logger$9.throwArgumentError("mismatch EIP-1559 gasPrice != maxFeePerGas", "tx", {
                gasPrice, maxFeePerGas
            });
        }
    }
    const fields = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(transaction.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
        formatNumber(transaction.maxFeePerGas || 0, "maxFeePerGas"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        ((transaction.to != null) ? getAddress(transaction.to) : "0x"),
        formatNumber(transaction.value || 0, "value"),
        (transaction.data || "0x"),
        (formatAccessList(transaction.accessList || []))
    ];
    if (signature) {
        const sig = splitSignature(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push(stripZeros(sig.r));
        fields.push(stripZeros(sig.s));
    }
    return hexConcat(["0x02", encode(fields)]);
}
function _serializeEip2930(transaction, signature) {
    const fields = [
        formatNumber(transaction.chainId || 0, "chainId"),
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(transaction.gasPrice || 0, "gasPrice"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        ((transaction.to != null) ? getAddress(transaction.to) : "0x"),
        formatNumber(transaction.value || 0, "value"),
        (transaction.data || "0x"),
        (formatAccessList(transaction.accessList || []))
    ];
    if (signature) {
        const sig = splitSignature(signature);
        fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
        fields.push(stripZeros(sig.r));
        fields.push(stripZeros(sig.s));
    }
    return hexConcat(["0x01", encode(fields)]);
}
// Legacy Transactions and EIP-155
function _serialize(transaction, signature) {
    checkProperties(transaction, allowedTransactionKeys);
    const raw = [];
    transactionFields.forEach(function (fieldInfo) {
        let value = transaction[fieldInfo.name] || ([]);
        const options = {};
        if (fieldInfo.numeric) {
            options.hexPad = "left";
        }
        value = arrayify(hexlify(value, options));
        // Fixed-width field
        if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
            logger$9.throwArgumentError("invalid length for " + fieldInfo.name, ("transaction:" + fieldInfo.name), value);
        }
        // Variable-width (with a maximum)
        if (fieldInfo.maxLength) {
            value = stripZeros(value);
            if (value.length > fieldInfo.maxLength) {
                logger$9.throwArgumentError("invalid length for " + fieldInfo.name, ("transaction:" + fieldInfo.name), value);
            }
        }
        raw.push(hexlify(value));
    });
    let chainId = 0;
    if (transaction.chainId != null) {
        // A chainId was provided; if non-zero we'll use EIP-155
        chainId = transaction.chainId;
        if (typeof (chainId) !== "number") {
            logger$9.throwArgumentError("invalid transaction.chainId", "transaction", transaction);
        }
    }
    else if (signature && !isBytesLike(signature) && signature.v > 28) {
        // No chainId provided, but the signature is signing with EIP-155; derive chainId
        chainId = Math.floor((signature.v - 35) / 2);
    }
    // We have an EIP-155 transaction (chainId was specified and non-zero)
    if (chainId !== 0) {
        raw.push(hexlify(chainId)); // @TODO: hexValue?
        raw.push("0x");
        raw.push("0x");
    }
    // Requesting an unsigned transaction
    if (!signature) {
        return encode(raw);
    }
    // The splitSignature will ensure the transaction has a recoveryParam in the
    // case that the signTransaction function only adds a v.
    const sig = splitSignature(signature);
    // We pushed a chainId and null r, s on for hashing only; remove those
    let v = 27 + sig.recoveryParam;
    if (chainId !== 0) {
        raw.pop();
        raw.pop();
        raw.pop();
        v += chainId * 2 + 8;
        // If an EIP-155 v (directly or indirectly; maybe _vs) was provided, check it!
        if (sig.v > 28 && sig.v !== v) {
            logger$9.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature);
        }
    }
    else if (sig.v !== v) {
        logger$9.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature);
    }
    raw.push(hexlify(v));
    raw.push(stripZeros(arrayify(sig.r)));
    raw.push(stripZeros(arrayify(sig.s)));
    return encode(raw);
}
function serialize(transaction, signature) {
    // Legacy and EIP-155 Transactions
    if (transaction.type == null || transaction.type === 0) {
        if (transaction.accessList != null) {
            logger$9.throwArgumentError("untyped transactions do not support accessList; include type: 1", "transaction", transaction);
        }
        return _serialize(transaction, signature);
    }
    // Typed Transactions (EIP-2718)
    switch (transaction.type) {
        case 1:
            return _serializeEip2930(transaction, signature);
        case 2:
            return _serializeEip1559(transaction, signature);
    }
    return logger$9.throwError(`unsupported transaction type: ${transaction.type}`, Logger.errors.UNSUPPORTED_OPERATION, {
        operation: "serializeTransaction",
        transactionType: transaction.type
    });
}
function _parseEipSignature(tx, fields, serialize) {
    try {
        const recid = handleNumber(fields[0]).toNumber();
        if (recid !== 0 && recid !== 1) {
            throw new Error("bad recid");
        }
        tx.v = recid;
    }
    catch (error) {
        logger$9.throwArgumentError("invalid v for transaction type: 1", "v", fields[0]);
    }
    tx.r = hexZeroPad(fields[1], 32);
    tx.s = hexZeroPad(fields[2], 32);
    try {
        const digest = keccak256$1(serialize(tx));
        tx.from = recoverAddress(digest, { r: tx.r, s: tx.s, recoveryParam: tx.v });
    }
    catch (error) { }
}
function _parseEip1559(payload) {
    const transaction = decode(payload.slice(1));
    if (transaction.length !== 9 && transaction.length !== 12) {
        logger$9.throwArgumentError("invalid component count for transaction type: 2", "payload", hexlify(payload));
    }
    const maxPriorityFeePerGas = handleNumber(transaction[2]);
    const maxFeePerGas = handleNumber(transaction[3]);
    const tx = {
        type: 2,
        chainId: handleNumber(transaction[0]).toNumber(),
        nonce: handleNumber(transaction[1]).toNumber(),
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasPrice: null,
        gasLimit: handleNumber(transaction[4]),
        to: handleAddress(transaction[5]),
        value: handleNumber(transaction[6]),
        data: transaction[7],
        accessList: accessListify(transaction[8]),
    };
    // Unsigned EIP-1559 Transaction
    if (transaction.length === 9) {
        return tx;
    }
    tx.hash = keccak256$1(payload);
    _parseEipSignature(tx, transaction.slice(9), _serializeEip1559);
    return tx;
}
function _parseEip2930(payload) {
    const transaction = decode(payload.slice(1));
    if (transaction.length !== 8 && transaction.length !== 11) {
        logger$9.throwArgumentError("invalid component count for transaction type: 1", "payload", hexlify(payload));
    }
    const tx = {
        type: 1,
        chainId: handleNumber(transaction[0]).toNumber(),
        nonce: handleNumber(transaction[1]).toNumber(),
        gasPrice: handleNumber(transaction[2]),
        gasLimit: handleNumber(transaction[3]),
        to: handleAddress(transaction[4]),
        value: handleNumber(transaction[5]),
        data: transaction[6],
        accessList: accessListify(transaction[7])
    };
    // Unsigned EIP-2930 Transaction
    if (transaction.length === 8) {
        return tx;
    }
    tx.hash = keccak256$1(payload);
    _parseEipSignature(tx, transaction.slice(8), _serializeEip2930);
    return tx;
}
// Legacy Transactions and EIP-155
function _parse(rawTransaction) {
    const transaction = decode(rawTransaction);
    if (transaction.length !== 9 && transaction.length !== 6) {
        logger$9.throwArgumentError("invalid raw transaction", "rawTransaction", rawTransaction);
    }
    const tx = {
        nonce: handleNumber(transaction[0]).toNumber(),
        gasPrice: handleNumber(transaction[1]),
        gasLimit: handleNumber(transaction[2]),
        to: handleAddress(transaction[3]),
        value: handleNumber(transaction[4]),
        data: transaction[5],
        chainId: 0
    };
    // Legacy unsigned transaction
    if (transaction.length === 6) {
        return tx;
    }
    try {
        tx.v = BigNumber.from(transaction[6]).toNumber();
    }
    catch (error) {
        // @TODO: What makes snese to do? The v is too big
        return tx;
    }
    tx.r = hexZeroPad(transaction[7], 32);
    tx.s = hexZeroPad(transaction[8], 32);
    if (BigNumber.from(tx.r).isZero() && BigNumber.from(tx.s).isZero()) {
        // EIP-155 unsigned transaction
        tx.chainId = tx.v;
        tx.v = 0;
    }
    else {
        // Signed Transaction
        tx.chainId = Math.floor((tx.v - 35) / 2);
        if (tx.chainId < 0) {
            tx.chainId = 0;
        }
        let recoveryParam = tx.v - 27;
        const raw = transaction.slice(0, 6);
        if (tx.chainId !== 0) {
            raw.push(hexlify(tx.chainId));
            raw.push("0x");
            raw.push("0x");
            recoveryParam -= tx.chainId * 2 + 8;
        }
        const digest = keccak256$1(encode(raw));
        try {
            tx.from = recoverAddress(digest, { r: hexlify(tx.r), s: hexlify(tx.s), recoveryParam: recoveryParam });
        }
        catch (error) { }
        tx.hash = keccak256$1(rawTransaction);
    }
    tx.type = null;
    return tx;
}
function parse(rawTransaction) {
    const payload = arrayify(rawTransaction);
    // Legacy and EIP-155 Transactions
    if (payload[0] > 0x7f) {
        return _parse(payload);
    }
    // Typed Transaction (EIP-2718)
    switch (payload[0]) {
        case 1:
            return _parseEip2930(payload);
        case 2:
            return _parseEip1559(payload);
    }
    return logger$9.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
        operation: "parseTransaction",
        transactionType: payload[0]
    });
}

var lib_esm$6 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get TransactionTypes () { return TransactionTypes; },
    computeAddress: computeAddress,
    recoverAddress: recoverAddress,
    accessListify: accessListify,
    serialize: serialize,
    parse: parse
});

const version$8 = "wordlists/5.6.1";

const logger$8 = new Logger(version$8);
class Wordlist {
    constructor(locale) {
        logger$8.checkAbstract(new.target, Wordlist);
        defineReadOnly(this, "locale", locale);
    }
    // Subclasses may override this
    split(mnemonic) {
        return mnemonic.toLowerCase().split(/ +/g);
    }
    // Subclasses may override this
    join(words) {
        return words.join(" ");
    }
    static check(wordlist) {
        const words = [];
        for (let i = 0; i < 2048; i++) {
            const word = wordlist.getWord(i);
            /* istanbul ignore if */
            if (i !== wordlist.getWordIndex(word)) {
                return "0x";
            }
            words.push(word);
        }
        return id(words.join("\n") + "\n");
    }
    static register(lang, name) {
        if (!name) {
            name = lang.locale;
        }
    }
}

const words = "AbandonAbilityAbleAboutAboveAbsentAbsorbAbstractAbsurdAbuseAccessAccidentAccountAccuseAchieveAcidAcousticAcquireAcrossActActionActorActressActualAdaptAddAddictAddressAdjustAdmitAdultAdvanceAdviceAerobicAffairAffordAfraidAgainAgeAgentAgreeAheadAimAirAirportAisleAlarmAlbumAlcoholAlertAlienAllAlleyAllowAlmostAloneAlphaAlreadyAlsoAlterAlwaysAmateurAmazingAmongAmountAmusedAnalystAnchorAncientAngerAngleAngryAnimalAnkleAnnounceAnnualAnotherAnswerAntennaAntiqueAnxietyAnyApartApologyAppearAppleApproveAprilArchArcticAreaArenaArgueArmArmedArmorArmyAroundArrangeArrestArriveArrowArtArtefactArtistArtworkAskAspectAssaultAssetAssistAssumeAsthmaAthleteAtomAttackAttendAttitudeAttractAuctionAuditAugustAuntAuthorAutoAutumnAverageAvocadoAvoidAwakeAwareAwayAwesomeAwfulAwkwardAxisBabyBachelorBaconBadgeBagBalanceBalconyBallBambooBananaBannerBarBarelyBargainBarrelBaseBasicBasketBattleBeachBeanBeautyBecauseBecomeBeefBeforeBeginBehaveBehindBelieveBelowBeltBenchBenefitBestBetrayBetterBetweenBeyondBicycleBidBikeBindBiologyBirdBirthBitterBlackBladeBlameBlanketBlastBleakBlessBlindBloodBlossomBlouseBlueBlurBlushBoardBoatBodyBoilBombBoneBonusBookBoostBorderBoringBorrowBossBottomBounceBoxBoyBracketBrainBrandBrassBraveBreadBreezeBrickBridgeBriefBrightBringBriskBroccoliBrokenBronzeBroomBrotherBrownBrushBubbleBuddyBudgetBuffaloBuildBulbBulkBulletBundleBunkerBurdenBurgerBurstBusBusinessBusyButterBuyerBuzzCabbageCabinCableCactusCageCakeCallCalmCameraCampCanCanalCancelCandyCannonCanoeCanvasCanyonCapableCapitalCaptainCarCarbonCardCargoCarpetCarryCartCaseCashCasinoCastleCasualCatCatalogCatchCategoryCattleCaughtCauseCautionCaveCeilingCeleryCementCensusCenturyCerealCertainChairChalkChampionChangeChaosChapterChargeChaseChatCheapCheckCheeseChefCherryChestChickenChiefChildChimneyChoiceChooseChronicChuckleChunkChurnCigarCinnamonCircleCitizenCityCivilClaimClapClarifyClawClayCleanClerkCleverClickClientCliffClimbClinicClipClockClogCloseClothCloudClownClubClumpClusterClutchCoachCoastCoconutCodeCoffeeCoilCoinCollectColorColumnCombineComeComfortComicCommonCompanyConcertConductConfirmCongressConnectConsiderControlConvinceCookCoolCopperCopyCoralCoreCornCorrectCostCottonCouchCountryCoupleCourseCousinCoverCoyoteCrackCradleCraftCramCraneCrashCraterCrawlCrazyCreamCreditCreekCrewCricketCrimeCrispCriticCropCrossCrouchCrowdCrucialCruelCruiseCrumbleCrunchCrushCryCrystalCubeCultureCupCupboardCuriousCurrentCurtainCurveCushionCustomCuteCycleDadDamageDampDanceDangerDaringDashDaughterDawnDayDealDebateDebrisDecadeDecemberDecideDeclineDecorateDecreaseDeerDefenseDefineDefyDegreeDelayDeliverDemandDemiseDenialDentistDenyDepartDependDepositDepthDeputyDeriveDescribeDesertDesignDeskDespairDestroyDetailDetectDevelopDeviceDevoteDiagramDialDiamondDiaryDiceDieselDietDifferDigitalDignityDilemmaDinnerDinosaurDirectDirtDisagreeDiscoverDiseaseDishDismissDisorderDisplayDistanceDivertDivideDivorceDizzyDoctorDocumentDogDollDolphinDomainDonateDonkeyDonorDoorDoseDoubleDoveDraftDragonDramaDrasticDrawDreamDressDriftDrillDrinkDripDriveDropDrumDryDuckDumbDuneDuringDustDutchDutyDwarfDynamicEagerEagleEarlyEarnEarthEasilyEastEasyEchoEcologyEconomyEdgeEditEducateEffortEggEightEitherElbowElderElectricElegantElementElephantElevatorEliteElseEmbarkEmbodyEmbraceEmergeEmotionEmployEmpowerEmptyEnableEnactEndEndlessEndorseEnemyEnergyEnforceEngageEngineEnhanceEnjoyEnlistEnoughEnrichEnrollEnsureEnterEntireEntryEnvelopeEpisodeEqualEquipEraEraseErodeErosionErrorEruptEscapeEssayEssenceEstateEternalEthicsEvidenceEvilEvokeEvolveExactExampleExcessExchangeExciteExcludeExcuseExecuteExerciseExhaustExhibitExileExistExitExoticExpandExpectExpireExplainExposeExpressExtendExtraEyeEyebrowFabricFaceFacultyFadeFaintFaithFallFalseFameFamilyFamousFanFancyFantasyFarmFashionFatFatalFatherFatigueFaultFavoriteFeatureFebruaryFederalFeeFeedFeelFemaleFenceFestivalFetchFeverFewFiberFictionFieldFigureFileFilmFilterFinalFindFineFingerFinishFireFirmFirstFiscalFishFitFitnessFixFlagFlameFlashFlatFlavorFleeFlightFlipFloatFlockFloorFlowerFluidFlushFlyFoamFocusFogFoilFoldFollowFoodFootForceForestForgetForkFortuneForumForwardFossilFosterFoundFoxFragileFrameFrequentFreshFriendFringeFrogFrontFrostFrownFrozenFruitFuelFunFunnyFurnaceFuryFutureGadgetGainGalaxyGalleryGameGapGarageGarbageGardenGarlicGarmentGasGaspGateGatherGaugeGazeGeneralGeniusGenreGentleGenuineGestureGhostGiantGiftGiggleGingerGiraffeGirlGiveGladGlanceGlareGlassGlideGlimpseGlobeGloomGloryGloveGlowGlueGoatGoddessGoldGoodGooseGorillaGospelGossipGovernGownGrabGraceGrainGrantGrapeGrassGravityGreatGreenGridGriefGritGroceryGroupGrowGruntGuardGuessGuideGuiltGuitarGunGymHabitHairHalfHammerHamsterHandHappyHarborHardHarshHarvestHatHaveHawkHazardHeadHealthHeartHeavyHedgehogHeightHelloHelmetHelpHenHeroHiddenHighHillHintHipHireHistoryHobbyHockeyHoldHoleHolidayHollowHomeHoneyHoodHopeHornHorrorHorseHospitalHostHotelHourHoverHubHugeHumanHumbleHumorHundredHungryHuntHurdleHurryHurtHusbandHybridIceIconIdeaIdentifyIdleIgnoreIllIllegalIllnessImageImitateImmenseImmuneImpactImposeImproveImpulseInchIncludeIncomeIncreaseIndexIndicateIndoorIndustryInfantInflictInformInhaleInheritInitialInjectInjuryInmateInnerInnocentInputInquiryInsaneInsectInsideInspireInstallIntactInterestIntoInvestInviteInvolveIronIslandIsolateIssueItemIvoryJacketJaguarJarJazzJealousJeansJellyJewelJobJoinJokeJourneyJoyJudgeJuiceJumpJungleJuniorJunkJustKangarooKeenKeepKetchupKeyKickKidKidneyKindKingdomKissKitKitchenKiteKittenKiwiKneeKnifeKnockKnowLabLabelLaborLadderLadyLakeLampLanguageLaptopLargeLaterLatinLaughLaundryLavaLawLawnLawsuitLayerLazyLeaderLeafLearnLeaveLectureLeftLegLegalLegendLeisureLemonLendLengthLensLeopardLessonLetterLevelLiarLibertyLibraryLicenseLifeLiftLightLikeLimbLimitLinkLionLiquidListLittleLiveLizardLoadLoanLobsterLocalLockLogicLonelyLongLoopLotteryLoudLoungeLoveLoyalLuckyLuggageLumberLunarLunchLuxuryLyricsMachineMadMagicMagnetMaidMailMainMajorMakeMammalManManageMandateMangoMansionManualMapleMarbleMarchMarginMarineMarketMarriageMaskMassMasterMatchMaterialMathMatrixMatterMaximumMazeMeadowMeanMeasureMeatMechanicMedalMediaMelodyMeltMemberMemoryMentionMenuMercyMergeMeritMerryMeshMessageMetalMethodMiddleMidnightMilkMillionMimicMindMinimumMinorMinuteMiracleMirrorMiseryMissMistakeMixMixedMixtureMobileModelModifyMomMomentMonitorMonkeyMonsterMonthMoonMoralMoreMorningMosquitoMotherMotionMotorMountainMouseMoveMovieMuchMuffinMuleMultiplyMuscleMuseumMushroomMusicMustMutualMyselfMysteryMythNaiveNameNapkinNarrowNastyNationNatureNearNeckNeedNegativeNeglectNeitherNephewNerveNestNetNetworkNeutralNeverNewsNextNiceNightNobleNoiseNomineeNoodleNormalNorthNoseNotableNoteNothingNoticeNovelNowNuclearNumberNurseNutOakObeyObjectObligeObscureObserveObtainObviousOccurOceanOctoberOdorOffOfferOfficeOftenOilOkayOldOliveOlympicOmitOnceOneOnionOnlineOnlyOpenOperaOpinionOpposeOptionOrangeOrbitOrchardOrderOrdinaryOrganOrientOriginalOrphanOstrichOtherOutdoorOuterOutputOutsideOvalOvenOverOwnOwnerOxygenOysterOzonePactPaddlePagePairPalacePalmPandaPanelPanicPantherPaperParadeParentParkParrotPartyPassPatchPathPatientPatrolPatternPausePavePaymentPeacePeanutPearPeasantPelicanPenPenaltyPencilPeoplePepperPerfectPermitPersonPetPhonePhotoPhrasePhysicalPianoPicnicPicturePiecePigPigeonPillPilotPinkPioneerPipePistolPitchPizzaPlacePlanetPlasticPlatePlayPleasePledgePluckPlugPlungePoemPoetPointPolarPolePolicePondPonyPoolPopularPortionPositionPossiblePostPotatoPotteryPovertyPowderPowerPracticePraisePredictPreferPreparePresentPrettyPreventPricePridePrimaryPrintPriorityPrisonPrivatePrizeProblemProcessProduceProfitProgramProjectPromoteProofPropertyProsperProtectProudProvidePublicPuddingPullPulpPulsePumpkinPunchPupilPuppyPurchasePurityPurposePursePushPutPuzzlePyramidQualityQuantumQuarterQuestionQuickQuitQuizQuoteRabbitRaccoonRaceRackRadarRadioRailRainRaiseRallyRampRanchRandomRangeRapidRareRateRatherRavenRawRazorReadyRealReasonRebelRebuildRecallReceiveRecipeRecordRecycleReduceReflectReformRefuseRegionRegretRegularRejectRelaxReleaseReliefRelyRemainRememberRemindRemoveRenderRenewRentReopenRepairRepeatReplaceReportRequireRescueResembleResistResourceResponseResultRetireRetreatReturnReunionRevealReviewRewardRhythmRibRibbonRiceRichRideRidgeRifleRightRigidRingRiotRippleRiskRitualRivalRiverRoadRoastRobotRobustRocketRomanceRoofRookieRoomRoseRotateRoughRoundRouteRoyalRubberRudeRugRuleRunRunwayRuralSadSaddleSadnessSafeSailSaladSalmonSalonSaltSaluteSameSampleSandSatisfySatoshiSauceSausageSaveSayScaleScanScareScatterSceneSchemeSchoolScienceScissorsScorpionScoutScrapScreenScriptScrubSeaSearchSeasonSeatSecondSecretSectionSecuritySeedSeekSegmentSelectSellSeminarSeniorSenseSentenceSeriesServiceSessionSettleSetupSevenShadowShaftShallowShareShedShellSheriffShieldShiftShineShipShiverShockShoeShootShopShortShoulderShoveShrimpShrugShuffleShySiblingSickSideSiegeSightSignSilentSilkSillySilverSimilarSimpleSinceSingSirenSisterSituateSixSizeSkateSketchSkiSkillSkinSkirtSkullSlabSlamSleepSlenderSliceSlideSlightSlimSloganSlotSlowSlushSmallSmartSmileSmokeSmoothSnackSnakeSnapSniffSnowSoapSoccerSocialSockSodaSoftSolarSoldierSolidSolutionSolveSomeoneSongSoonSorrySortSoulSoundSoupSourceSouthSpaceSpareSpatialSpawnSpeakSpecialSpeedSpellSpendSphereSpiceSpiderSpikeSpinSpiritSplitSpoilSponsorSpoonSportSpotSpraySpreadSpringSpySquareSqueezeSquirrelStableStadiumStaffStageStairsStampStandStartStateStaySteakSteelStemStepStereoStickStillStingStockStomachStoneStoolStoryStoveStrategyStreetStrikeStrongStruggleStudentStuffStumbleStyleSubjectSubmitSubwaySuccessSuchSuddenSufferSugarSuggestSuitSummerSunSunnySunsetSuperSupplySupremeSureSurfaceSurgeSurpriseSurroundSurveySuspectSustainSwallowSwampSwapSwarmSwearSweetSwiftSwimSwingSwitchSwordSymbolSymptomSyrupSystemTableTackleTagTailTalentTalkTankTapeTargetTaskTasteTattooTaxiTeachTeamTellTenTenantTennisTentTermTestTextThankThatThemeThenTheoryThereTheyThingThisThoughtThreeThriveThrowThumbThunderTicketTideTigerTiltTimberTimeTinyTipTiredTissueTitleToastTobaccoTodayToddlerToeTogetherToiletTokenTomatoTomorrowToneTongueTonightToolToothTopTopicToppleTorchTornadoTortoiseTossTotalTouristTowardTowerTownToyTrackTradeTrafficTragicTrainTransferTrapTrashTravelTrayTreatTreeTrendTrialTribeTrickTriggerTrimTripTrophyTroubleTruckTrueTrulyTrumpetTrustTruthTryTubeTuitionTumbleTunaTunnelTurkeyTurnTurtleTwelveTwentyTwiceTwinTwistTwoTypeTypicalUglyUmbrellaUnableUnawareUncleUncoverUnderUndoUnfairUnfoldUnhappyUniformUniqueUnitUniverseUnknownUnlockUntilUnusualUnveilUpdateUpgradeUpholdUponUpperUpsetUrbanUrgeUsageUseUsedUsefulUselessUsualUtilityVacantVacuumVagueValidValleyValveVanVanishVaporVariousVastVaultVehicleVelvetVendorVentureVenueVerbVerifyVersionVeryVesselVeteranViableVibrantViciousVictoryVideoViewVillageVintageViolinVirtualVirusVisaVisitVisualVitalVividVocalVoiceVoidVolcanoVolumeVoteVoyageWageWagonWaitWalkWallWalnutWantWarfareWarmWarriorWashWaspWasteWaterWaveWayWealthWeaponWearWeaselWeatherWebWeddingWeekendWeirdWelcomeWestWetWhaleWhatWheatWheelWhenWhereWhipWhisperWideWidthWifeWildWillWinWindowWineWingWinkWinnerWinterWireWisdomWiseWishWitnessWolfWomanWonderWoodWoolWordWorkWorldWorryWorthWrapWreckWrestleWristWriteWrongYardYearYellowYouYoungYouthZebraZeroZoneZoo";
let wordlist = null;
function loadWords(lang) {
    if (wordlist != null) {
        return;
    }
    wordlist = words.replace(/([A-Z])/g, " $1").toLowerCase().substring(1).split(" ");
    // Verify the computed list matches the official list
    /* istanbul ignore if */
    if (Wordlist.check(lang) !== "0x3c8acc1e7b08d8e76f9fda015ef48dc8c710a73cb7e0f77b2c18a9b5a7adde60") {
        wordlist = null;
        throw new Error("BIP39 Wordlist for en (English) FAILED");
    }
}
class LangEn extends Wordlist {
    constructor() {
        super("en");
    }
    getWord(index) {
        loadWords(this);
        return wordlist[index];
    }
    getWordIndex(word) {
        loadWords(this);
        return wordlist.indexOf(word);
    }
}
const langEn = new LangEn();
Wordlist.register(langEn);

const wordlists = {
    en: langEn
};

const version$7 = "hdnode/5.6.2";

const logger$7 = new Logger(version$7);
const N = BigNumber.from("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
// "Bitcoin seed"
const MasterSecret = toUtf8Bytes("Bitcoin seed");
const HardenedBit = 0x80000000;
// Returns a byte with the MSB bits set
function getUpperMask(bits) {
    return ((1 << bits) - 1) << (8 - bits);
}
// Returns a byte with the LSB bits set
function getLowerMask(bits) {
    return (1 << bits) - 1;
}
function bytes32(value) {
    return hexZeroPad(hexlify(value), 32);
}
function base58check(data) {
    return Base58.encode(concat([data, hexDataSlice(sha256$1(sha256$1(data)), 0, 4)]));
}
function getWordlist(wordlist) {
    if (wordlist == null) {
        return wordlists["en"];
    }
    if (typeof (wordlist) === "string") {
        const words = wordlists[wordlist];
        if (words == null) {
            logger$7.throwArgumentError("unknown locale", "wordlist", wordlist);
        }
        return words;
    }
    return wordlist;
}
const _constructorGuard = {};
const defaultPath = "m/44'/60'/0'/0/0";
class HDNode {
    /**
     *  This constructor should not be called directly.
     *
     *  Please use:
     *   - fromMnemonic
     *   - fromSeed
     */
    constructor(constructorGuard, privateKey, publicKey, parentFingerprint, chainCode, index, depth, mnemonicOrPath) {
        /* istanbul ignore if */
        if (constructorGuard !== _constructorGuard) {
            throw new Error("HDNode constructor cannot be called directly");
        }
        if (privateKey) {
            const signingKey = new SigningKey(privateKey);
            defineReadOnly(this, "privateKey", signingKey.privateKey);
            defineReadOnly(this, "publicKey", signingKey.compressedPublicKey);
        }
        else {
            defineReadOnly(this, "privateKey", null);
            defineReadOnly(this, "publicKey", hexlify(publicKey));
        }
        defineReadOnly(this, "parentFingerprint", parentFingerprint);
        defineReadOnly(this, "fingerprint", hexDataSlice(ripemd160(sha256$1(this.publicKey)), 0, 4));
        defineReadOnly(this, "address", computeAddress(this.publicKey));
        defineReadOnly(this, "chainCode", chainCode);
        defineReadOnly(this, "index", index);
        defineReadOnly(this, "depth", depth);
        if (mnemonicOrPath == null) {
            // From a source that does not preserve the path (e.g. extended keys)
            defineReadOnly(this, "mnemonic", null);
            defineReadOnly(this, "path", null);
        }
        else if (typeof (mnemonicOrPath) === "string") {
            // From a source that does not preserve the mnemonic (e.g. neutered)
            defineReadOnly(this, "mnemonic", null);
            defineReadOnly(this, "path", mnemonicOrPath);
        }
        else {
            // From a fully qualified source
            defineReadOnly(this, "mnemonic", mnemonicOrPath);
            defineReadOnly(this, "path", mnemonicOrPath.path);
        }
    }
    get extendedKey() {
        // We only support the mainnet values for now, but if anyone needs
        // testnet values, let me know. I believe current sentiment is that
        // we should always use mainnet, and use BIP-44 to derive the network
        //   - Mainnet: public=0x0488B21E, private=0x0488ADE4
        //   - Testnet: public=0x043587CF, private=0x04358394
        if (this.depth >= 256) {
            throw new Error("Depth too large!");
        }
        return base58check(concat([
            ((this.privateKey != null) ? "0x0488ADE4" : "0x0488B21E"),
            hexlify(this.depth),
            this.parentFingerprint,
            hexZeroPad(hexlify(this.index), 4),
            this.chainCode,
            ((this.privateKey != null) ? concat(["0x00", this.privateKey]) : this.publicKey),
        ]));
    }
    neuter() {
        return new HDNode(_constructorGuard, null, this.publicKey, this.parentFingerprint, this.chainCode, this.index, this.depth, this.path);
    }
    _derive(index) {
        if (index > 0xffffffff) {
            throw new Error("invalid index - " + String(index));
        }
        // Base path
        let path = this.path;
        if (path) {
            path += "/" + (index & ~HardenedBit);
        }
        const data = new Uint8Array(37);
        if (index & HardenedBit) {
            if (!this.privateKey) {
                throw new Error("cannot derive child of neutered node");
            }
            // Data = 0x00 || ser_256(k_par)
            data.set(arrayify(this.privateKey), 1);
            // Hardened path
            if (path) {
                path += "'";
            }
        }
        else {
            // Data = ser_p(point(k_par))
            data.set(arrayify(this.publicKey));
        }
        // Data += ser_32(i)
        for (let i = 24; i >= 0; i -= 8) {
            data[33 + (i >> 3)] = ((index >> (24 - i)) & 0xff);
        }
        const I = arrayify(computeHmac(SupportedAlgorithm.sha512, this.chainCode, data));
        const IL = I.slice(0, 32);
        const IR = I.slice(32);
        // The private key
        let ki = null;
        // The public key
        let Ki = null;
        if (this.privateKey) {
            ki = bytes32(BigNumber.from(IL).add(this.privateKey).mod(N));
        }
        else {
            const ek = new SigningKey(hexlify(IL));
            Ki = ek._addPoint(this.publicKey);
        }
        let mnemonicOrPath = path;
        const srcMnemonic = this.mnemonic;
        if (srcMnemonic) {
            mnemonicOrPath = Object.freeze({
                phrase: srcMnemonic.phrase,
                path: path,
                locale: (srcMnemonic.locale || "en")
            });
        }
        return new HDNode(_constructorGuard, ki, Ki, this.fingerprint, bytes32(IR), index, this.depth + 1, mnemonicOrPath);
    }
    derivePath(path) {
        const components = path.split("/");
        if (components.length === 0 || (components[0] === "m" && this.depth !== 0)) {
            throw new Error("invalid path - " + path);
        }
        if (components[0] === "m") {
            components.shift();
        }
        let result = this;
        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            if (component.match(/^[0-9]+'$/)) {
                const index = parseInt(component.substring(0, component.length - 1));
                if (index >= HardenedBit) {
                    throw new Error("invalid path index - " + component);
                }
                result = result._derive(HardenedBit + index);
            }
            else if (component.match(/^[0-9]+$/)) {
                const index = parseInt(component);
                if (index >= HardenedBit) {
                    throw new Error("invalid path index - " + component);
                }
                result = result._derive(index);
            }
            else {
                throw new Error("invalid path component - " + component);
            }
        }
        return result;
    }
    static _fromSeed(seed, mnemonic) {
        const seedArray = arrayify(seed);
        if (seedArray.length < 16 || seedArray.length > 64) {
            throw new Error("invalid seed");
        }
        const I = arrayify(computeHmac(SupportedAlgorithm.sha512, MasterSecret, seedArray));
        return new HDNode(_constructorGuard, bytes32(I.slice(0, 32)), null, "0x00000000", bytes32(I.slice(32)), 0, 0, mnemonic);
    }
    static fromMnemonic(mnemonic, password, wordlist) {
        // If a locale name was passed in, find the associated wordlist
        wordlist = getWordlist(wordlist);
        // Normalize the case and spacing in the mnemonic (throws if the mnemonic is invalid)
        mnemonic = entropyToMnemonic(mnemonicToEntropy(mnemonic, wordlist), wordlist);
        return HDNode._fromSeed(mnemonicToSeed(mnemonic, password), {
            phrase: mnemonic,
            path: "m",
            locale: wordlist.locale
        });
    }
    static fromSeed(seed) {
        return HDNode._fromSeed(seed, null);
    }
    static fromExtendedKey(extendedKey) {
        const bytes = Base58.decode(extendedKey);
        if (bytes.length !== 82 || base58check(bytes.slice(0, 78)) !== extendedKey) {
            logger$7.throwArgumentError("invalid extended key", "extendedKey", "[REDACTED]");
        }
        const depth = bytes[4];
        const parentFingerprint = hexlify(bytes.slice(5, 9));
        const index = parseInt(hexlify(bytes.slice(9, 13)).substring(2), 16);
        const chainCode = hexlify(bytes.slice(13, 45));
        const key = bytes.slice(45, 78);
        switch (hexlify(bytes.slice(0, 4))) {
            // Public Key
            case "0x0488b21e":
            case "0x043587cf":
                return new HDNode(_constructorGuard, null, hexlify(key), parentFingerprint, chainCode, index, depth, null);
            // Private Key
            case "0x0488ade4":
            case "0x04358394 ":
                if (key[0] !== 0) {
                    break;
                }
                return new HDNode(_constructorGuard, hexlify(key.slice(1)), null, parentFingerprint, chainCode, index, depth, null);
        }
        return logger$7.throwArgumentError("invalid extended key", "extendedKey", "[REDACTED]");
    }
}
function mnemonicToSeed(mnemonic, password) {
    if (!password) {
        password = "";
    }
    const salt = toUtf8Bytes("mnemonic" + password, UnicodeNormalizationForm.NFKD);
    return pbkdf2$1(toUtf8Bytes(mnemonic, UnicodeNormalizationForm.NFKD), salt, 2048, 64, "sha512");
}
function mnemonicToEntropy(mnemonic, wordlist) {
    wordlist = getWordlist(wordlist);
    logger$7.checkNormalize();
    const words = wordlist.split(mnemonic);
    if ((words.length % 3) !== 0) {
        throw new Error("invalid mnemonic");
    }
    const entropy = arrayify(new Uint8Array(Math.ceil(11 * words.length / 8)));
    let offset = 0;
    for (let i = 0; i < words.length; i++) {
        let index = wordlist.getWordIndex(words[i].normalize("NFKD"));
        if (index === -1) {
            throw new Error("invalid mnemonic");
        }
        for (let bit = 0; bit < 11; bit++) {
            if (index & (1 << (10 - bit))) {
                entropy[offset >> 3] |= (1 << (7 - (offset % 8)));
            }
            offset++;
        }
    }
    const entropyBits = 32 * words.length / 3;
    const checksumBits = words.length / 3;
    const checksumMask = getUpperMask(checksumBits);
    const checksum = arrayify(sha256$1(entropy.slice(0, entropyBits / 8)))[0] & checksumMask;
    if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
        throw new Error("invalid checksum");
    }
    return hexlify(entropy.slice(0, entropyBits / 8));
}
function entropyToMnemonic(entropy, wordlist) {
    wordlist = getWordlist(wordlist);
    entropy = arrayify(entropy);
    if ((entropy.length % 4) !== 0 || entropy.length < 16 || entropy.length > 32) {
        throw new Error("invalid entropy");
    }
    const indices = [0];
    let remainingBits = 11;
    for (let i = 0; i < entropy.length; i++) {
        // Consume the whole byte (with still more to go)
        if (remainingBits > 8) {
            indices[indices.length - 1] <<= 8;
            indices[indices.length - 1] |= entropy[i];
            remainingBits -= 8;
            // This byte will complete an 11-bit index
        }
        else {
            indices[indices.length - 1] <<= remainingBits;
            indices[indices.length - 1] |= entropy[i] >> (8 - remainingBits);
            // Start the next word
            indices.push(entropy[i] & getLowerMask(8 - remainingBits));
            remainingBits += 3;
        }
    }
    // Compute the checksum bits
    const checksumBits = entropy.length / 4;
    const checksum = arrayify(sha256$1(entropy))[0] & getUpperMask(checksumBits);
    // Shift the checksum into the word indices
    indices[indices.length - 1] <<= checksumBits;
    indices[indices.length - 1] |= (checksum >> (8 - checksumBits));
    return wordlist.join(indices.map((index) => wordlist.getWord(index)));
}
function isValidMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
        return true;
    }
    catch (error) { }
    return false;
}
function getAccountPath(index) {
    if (typeof (index) !== "number" || index < 0 || index >= HardenedBit || index % 1) {
        logger$7.throwArgumentError("invalid account index", "index", index);
    }
    return `m/44'/60'/${index}'/0/0`;
}

var lib_esm$5 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    defaultPath: defaultPath,
    HDNode: HDNode,
    mnemonicToSeed: mnemonicToSeed,
    mnemonicToEntropy: mnemonicToEntropy,
    entropyToMnemonic: entropyToMnemonic,
    isValidMnemonic: isValidMnemonic,
    getAccountPath: getAccountPath
});

var require$$6 = /*@__PURE__*/getAugmentedNamespace(lib_esm$5);

var aesJs = {exports: {}};

(function (module, exports) {

(function(root) {

    function checkInt(value) {
        return (parseInt(value) === value);
    }

    function checkInts(arrayish) {
        if (!checkInt(arrayish.length)) { return false; }

        for (var i = 0; i < arrayish.length; i++) {
            if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
                return false;
            }
        }

        return true;
    }

    function coerceArray(arg, copy) {

        // ArrayBuffer view
        if (arg.buffer && ArrayBuffer.isView(arg) && arg.name === 'Uint8Array') {

            if (copy) {
                if (arg.slice) {
                    arg = arg.slice();
                } else {
                    arg = Array.prototype.slice.call(arg);
                }
            }

            return arg;
        }

        // It's an array; check it is a valid representation of a byte
        if (Array.isArray(arg)) {
            if (!checkInts(arg)) {
                throw new Error('Array contains invalid value: ' + arg);
            }

            return new Uint8Array(arg);
        }

        // Something else, but behaves like an array (maybe a Buffer? Arguments?)
        if (checkInt(arg.length) && checkInts(arg)) {
            return new Uint8Array(arg);
        }

        throw new Error('unsupported array-like object');
    }

    function createArray(length) {
        return new Uint8Array(length);
    }

    function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
        if (sourceStart != null || sourceEnd != null) {
            if (sourceArray.slice) {
                sourceArray = sourceArray.slice(sourceStart, sourceEnd);
            } else {
                sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd);
            }
        }
        targetArray.set(sourceArray, targetStart);
    }



    var convertUtf8 = (function() {
        function toBytes(text) {
            var result = [], i = 0;
            text = encodeURI(text);
            while (i < text.length) {
                var c = text.charCodeAt(i++);

                // if it is a % sign, encode the following 2 bytes as a hex value
                if (c === 37) {
                    result.push(parseInt(text.substr(i, 2), 16));
                    i += 2;

                // otherwise, just the actual byte
                } else {
                    result.push(c);
                }
            }

            return coerceArray(result);
        }

        function fromBytes(bytes) {
            var result = [], i = 0;

            while (i < bytes.length) {
                var c = bytes[i];

                if (c < 128) {
                    result.push(String.fromCharCode(c));
                    i++;
                } else if (c > 191 && c < 224) {
                    result.push(String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f)));
                    i += 2;
                } else {
                    result.push(String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)));
                    i += 3;
                }
            }

            return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();

    var convertHex = (function() {
        function toBytes(text) {
            var result = [];
            for (var i = 0; i < text.length; i += 2) {
                result.push(parseInt(text.substr(i, 2), 16));
            }

            return result;
        }

        // http://ixti.net/development/javascript/2011/11/11/base64-encodedecode-of-utf8-in-browser-with-js.html
        var Hex = '0123456789abcdef';

        function fromBytes(bytes) {
                var result = [];
                for (var i = 0; i < bytes.length; i++) {
                    var v = bytes[i];
                    result.push(Hex[(v & 0xf0) >> 4] + Hex[v & 0x0f]);
                }
                return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();


    // Number of rounds by keysize
    var numberOfRounds = {16: 10, 24: 12, 32: 14};

    // Round constant words
    var rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91];

    // S-box and Inverse S-box (S is for Substitution)
    var S = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16];
    var Si =[0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d];

    // Transformations for encryption
    var T1 = [0xc66363a5, 0xf87c7c84, 0xee777799, 0xf67b7b8d, 0xfff2f20d, 0xd66b6bbd, 0xde6f6fb1, 0x91c5c554, 0x60303050, 0x02010103, 0xce6767a9, 0x562b2b7d, 0xe7fefe19, 0xb5d7d762, 0x4dababe6, 0xec76769a, 0x8fcaca45, 0x1f82829d, 0x89c9c940, 0xfa7d7d87, 0xeffafa15, 0xb25959eb, 0x8e4747c9, 0xfbf0f00b, 0x41adadec, 0xb3d4d467, 0x5fa2a2fd, 0x45afafea, 0x239c9cbf, 0x53a4a4f7, 0xe4727296, 0x9bc0c05b, 0x75b7b7c2, 0xe1fdfd1c, 0x3d9393ae, 0x4c26266a, 0x6c36365a, 0x7e3f3f41, 0xf5f7f702, 0x83cccc4f, 0x6834345c, 0x51a5a5f4, 0xd1e5e534, 0xf9f1f108, 0xe2717193, 0xabd8d873, 0x62313153, 0x2a15153f, 0x0804040c, 0x95c7c752, 0x46232365, 0x9dc3c35e, 0x30181828, 0x379696a1, 0x0a05050f, 0x2f9a9ab5, 0x0e070709, 0x24121236, 0x1b80809b, 0xdfe2e23d, 0xcdebeb26, 0x4e272769, 0x7fb2b2cd, 0xea75759f, 0x1209091b, 0x1d83839e, 0x582c2c74, 0x341a1a2e, 0x361b1b2d, 0xdc6e6eb2, 0xb45a5aee, 0x5ba0a0fb, 0xa45252f6, 0x763b3b4d, 0xb7d6d661, 0x7db3b3ce, 0x5229297b, 0xdde3e33e, 0x5e2f2f71, 0x13848497, 0xa65353f5, 0xb9d1d168, 0x00000000, 0xc1eded2c, 0x40202060, 0xe3fcfc1f, 0x79b1b1c8, 0xb65b5bed, 0xd46a6abe, 0x8dcbcb46, 0x67bebed9, 0x7239394b, 0x944a4ade, 0x984c4cd4, 0xb05858e8, 0x85cfcf4a, 0xbbd0d06b, 0xc5efef2a, 0x4faaaae5, 0xedfbfb16, 0x864343c5, 0x9a4d4dd7, 0x66333355, 0x11858594, 0x8a4545cf, 0xe9f9f910, 0x04020206, 0xfe7f7f81, 0xa05050f0, 0x783c3c44, 0x259f9fba, 0x4ba8a8e3, 0xa25151f3, 0x5da3a3fe, 0x804040c0, 0x058f8f8a, 0x3f9292ad, 0x219d9dbc, 0x70383848, 0xf1f5f504, 0x63bcbcdf, 0x77b6b6c1, 0xafdada75, 0x42212163, 0x20101030, 0xe5ffff1a, 0xfdf3f30e, 0xbfd2d26d, 0x81cdcd4c, 0x180c0c14, 0x26131335, 0xc3ecec2f, 0xbe5f5fe1, 0x359797a2, 0x884444cc, 0x2e171739, 0x93c4c457, 0x55a7a7f2, 0xfc7e7e82, 0x7a3d3d47, 0xc86464ac, 0xba5d5de7, 0x3219192b, 0xe6737395, 0xc06060a0, 0x19818198, 0x9e4f4fd1, 0xa3dcdc7f, 0x44222266, 0x542a2a7e, 0x3b9090ab, 0x0b888883, 0x8c4646ca, 0xc7eeee29, 0x6bb8b8d3, 0x2814143c, 0xa7dede79, 0xbc5e5ee2, 0x160b0b1d, 0xaddbdb76, 0xdbe0e03b, 0x64323256, 0x743a3a4e, 0x140a0a1e, 0x924949db, 0x0c06060a, 0x4824246c, 0xb85c5ce4, 0x9fc2c25d, 0xbdd3d36e, 0x43acacef, 0xc46262a6, 0x399191a8, 0x319595a4, 0xd3e4e437, 0xf279798b, 0xd5e7e732, 0x8bc8c843, 0x6e373759, 0xda6d6db7, 0x018d8d8c, 0xb1d5d564, 0x9c4e4ed2, 0x49a9a9e0, 0xd86c6cb4, 0xac5656fa, 0xf3f4f407, 0xcfeaea25, 0xca6565af, 0xf47a7a8e, 0x47aeaee9, 0x10080818, 0x6fbabad5, 0xf0787888, 0x4a25256f, 0x5c2e2e72, 0x381c1c24, 0x57a6a6f1, 0x73b4b4c7, 0x97c6c651, 0xcbe8e823, 0xa1dddd7c, 0xe874749c, 0x3e1f1f21, 0x964b4bdd, 0x61bdbddc, 0x0d8b8b86, 0x0f8a8a85, 0xe0707090, 0x7c3e3e42, 0x71b5b5c4, 0xcc6666aa, 0x904848d8, 0x06030305, 0xf7f6f601, 0x1c0e0e12, 0xc26161a3, 0x6a35355f, 0xae5757f9, 0x69b9b9d0, 0x17868691, 0x99c1c158, 0x3a1d1d27, 0x279e9eb9, 0xd9e1e138, 0xebf8f813, 0x2b9898b3, 0x22111133, 0xd26969bb, 0xa9d9d970, 0x078e8e89, 0x339494a7, 0x2d9b9bb6, 0x3c1e1e22, 0x15878792, 0xc9e9e920, 0x87cece49, 0xaa5555ff, 0x50282878, 0xa5dfdf7a, 0x038c8c8f, 0x59a1a1f8, 0x09898980, 0x1a0d0d17, 0x65bfbfda, 0xd7e6e631, 0x844242c6, 0xd06868b8, 0x824141c3, 0x299999b0, 0x5a2d2d77, 0x1e0f0f11, 0x7bb0b0cb, 0xa85454fc, 0x6dbbbbd6, 0x2c16163a];
    var T2 = [0xa5c66363, 0x84f87c7c, 0x99ee7777, 0x8df67b7b, 0x0dfff2f2, 0xbdd66b6b, 0xb1de6f6f, 0x5491c5c5, 0x50603030, 0x03020101, 0xa9ce6767, 0x7d562b2b, 0x19e7fefe, 0x62b5d7d7, 0xe64dabab, 0x9aec7676, 0x458fcaca, 0x9d1f8282, 0x4089c9c9, 0x87fa7d7d, 0x15effafa, 0xebb25959, 0xc98e4747, 0x0bfbf0f0, 0xec41adad, 0x67b3d4d4, 0xfd5fa2a2, 0xea45afaf, 0xbf239c9c, 0xf753a4a4, 0x96e47272, 0x5b9bc0c0, 0xc275b7b7, 0x1ce1fdfd, 0xae3d9393, 0x6a4c2626, 0x5a6c3636, 0x417e3f3f, 0x02f5f7f7, 0x4f83cccc, 0x5c683434, 0xf451a5a5, 0x34d1e5e5, 0x08f9f1f1, 0x93e27171, 0x73abd8d8, 0x53623131, 0x3f2a1515, 0x0c080404, 0x5295c7c7, 0x65462323, 0x5e9dc3c3, 0x28301818, 0xa1379696, 0x0f0a0505, 0xb52f9a9a, 0x090e0707, 0x36241212, 0x9b1b8080, 0x3ddfe2e2, 0x26cdebeb, 0x694e2727, 0xcd7fb2b2, 0x9fea7575, 0x1b120909, 0x9e1d8383, 0x74582c2c, 0x2e341a1a, 0x2d361b1b, 0xb2dc6e6e, 0xeeb45a5a, 0xfb5ba0a0, 0xf6a45252, 0x4d763b3b, 0x61b7d6d6, 0xce7db3b3, 0x7b522929, 0x3edde3e3, 0x715e2f2f, 0x97138484, 0xf5a65353, 0x68b9d1d1, 0x00000000, 0x2cc1eded, 0x60402020, 0x1fe3fcfc, 0xc879b1b1, 0xedb65b5b, 0xbed46a6a, 0x468dcbcb, 0xd967bebe, 0x4b723939, 0xde944a4a, 0xd4984c4c, 0xe8b05858, 0x4a85cfcf, 0x6bbbd0d0, 0x2ac5efef, 0xe54faaaa, 0x16edfbfb, 0xc5864343, 0xd79a4d4d, 0x55663333, 0x94118585, 0xcf8a4545, 0x10e9f9f9, 0x06040202, 0x81fe7f7f, 0xf0a05050, 0x44783c3c, 0xba259f9f, 0xe34ba8a8, 0xf3a25151, 0xfe5da3a3, 0xc0804040, 0x8a058f8f, 0xad3f9292, 0xbc219d9d, 0x48703838, 0x04f1f5f5, 0xdf63bcbc, 0xc177b6b6, 0x75afdada, 0x63422121, 0x30201010, 0x1ae5ffff, 0x0efdf3f3, 0x6dbfd2d2, 0x4c81cdcd, 0x14180c0c, 0x35261313, 0x2fc3ecec, 0xe1be5f5f, 0xa2359797, 0xcc884444, 0x392e1717, 0x5793c4c4, 0xf255a7a7, 0x82fc7e7e, 0x477a3d3d, 0xacc86464, 0xe7ba5d5d, 0x2b321919, 0x95e67373, 0xa0c06060, 0x98198181, 0xd19e4f4f, 0x7fa3dcdc, 0x66442222, 0x7e542a2a, 0xab3b9090, 0x830b8888, 0xca8c4646, 0x29c7eeee, 0xd36bb8b8, 0x3c281414, 0x79a7dede, 0xe2bc5e5e, 0x1d160b0b, 0x76addbdb, 0x3bdbe0e0, 0x56643232, 0x4e743a3a, 0x1e140a0a, 0xdb924949, 0x0a0c0606, 0x6c482424, 0xe4b85c5c, 0x5d9fc2c2, 0x6ebdd3d3, 0xef43acac, 0xa6c46262, 0xa8399191, 0xa4319595, 0x37d3e4e4, 0x8bf27979, 0x32d5e7e7, 0x438bc8c8, 0x596e3737, 0xb7da6d6d, 0x8c018d8d, 0x64b1d5d5, 0xd29c4e4e, 0xe049a9a9, 0xb4d86c6c, 0xfaac5656, 0x07f3f4f4, 0x25cfeaea, 0xafca6565, 0x8ef47a7a, 0xe947aeae, 0x18100808, 0xd56fbaba, 0x88f07878, 0x6f4a2525, 0x725c2e2e, 0x24381c1c, 0xf157a6a6, 0xc773b4b4, 0x5197c6c6, 0x23cbe8e8, 0x7ca1dddd, 0x9ce87474, 0x213e1f1f, 0xdd964b4b, 0xdc61bdbd, 0x860d8b8b, 0x850f8a8a, 0x90e07070, 0x427c3e3e, 0xc471b5b5, 0xaacc6666, 0xd8904848, 0x05060303, 0x01f7f6f6, 0x121c0e0e, 0xa3c26161, 0x5f6a3535, 0xf9ae5757, 0xd069b9b9, 0x91178686, 0x5899c1c1, 0x273a1d1d, 0xb9279e9e, 0x38d9e1e1, 0x13ebf8f8, 0xb32b9898, 0x33221111, 0xbbd26969, 0x70a9d9d9, 0x89078e8e, 0xa7339494, 0xb62d9b9b, 0x223c1e1e, 0x92158787, 0x20c9e9e9, 0x4987cece, 0xffaa5555, 0x78502828, 0x7aa5dfdf, 0x8f038c8c, 0xf859a1a1, 0x80098989, 0x171a0d0d, 0xda65bfbf, 0x31d7e6e6, 0xc6844242, 0xb8d06868, 0xc3824141, 0xb0299999, 0x775a2d2d, 0x111e0f0f, 0xcb7bb0b0, 0xfca85454, 0xd66dbbbb, 0x3a2c1616];
    var T3 = [0x63a5c663, 0x7c84f87c, 0x7799ee77, 0x7b8df67b, 0xf20dfff2, 0x6bbdd66b, 0x6fb1de6f, 0xc55491c5, 0x30506030, 0x01030201, 0x67a9ce67, 0x2b7d562b, 0xfe19e7fe, 0xd762b5d7, 0xabe64dab, 0x769aec76, 0xca458fca, 0x829d1f82, 0xc94089c9, 0x7d87fa7d, 0xfa15effa, 0x59ebb259, 0x47c98e47, 0xf00bfbf0, 0xadec41ad, 0xd467b3d4, 0xa2fd5fa2, 0xafea45af, 0x9cbf239c, 0xa4f753a4, 0x7296e472, 0xc05b9bc0, 0xb7c275b7, 0xfd1ce1fd, 0x93ae3d93, 0x266a4c26, 0x365a6c36, 0x3f417e3f, 0xf702f5f7, 0xcc4f83cc, 0x345c6834, 0xa5f451a5, 0xe534d1e5, 0xf108f9f1, 0x7193e271, 0xd873abd8, 0x31536231, 0x153f2a15, 0x040c0804, 0xc75295c7, 0x23654623, 0xc35e9dc3, 0x18283018, 0x96a13796, 0x050f0a05, 0x9ab52f9a, 0x07090e07, 0x12362412, 0x809b1b80, 0xe23ddfe2, 0xeb26cdeb, 0x27694e27, 0xb2cd7fb2, 0x759fea75, 0x091b1209, 0x839e1d83, 0x2c74582c, 0x1a2e341a, 0x1b2d361b, 0x6eb2dc6e, 0x5aeeb45a, 0xa0fb5ba0, 0x52f6a452, 0x3b4d763b, 0xd661b7d6, 0xb3ce7db3, 0x297b5229, 0xe33edde3, 0x2f715e2f, 0x84971384, 0x53f5a653, 0xd168b9d1, 0x00000000, 0xed2cc1ed, 0x20604020, 0xfc1fe3fc, 0xb1c879b1, 0x5bedb65b, 0x6abed46a, 0xcb468dcb, 0xbed967be, 0x394b7239, 0x4ade944a, 0x4cd4984c, 0x58e8b058, 0xcf4a85cf, 0xd06bbbd0, 0xef2ac5ef, 0xaae54faa, 0xfb16edfb, 0x43c58643, 0x4dd79a4d, 0x33556633, 0x85941185, 0x45cf8a45, 0xf910e9f9, 0x02060402, 0x7f81fe7f, 0x50f0a050, 0x3c44783c, 0x9fba259f, 0xa8e34ba8, 0x51f3a251, 0xa3fe5da3, 0x40c08040, 0x8f8a058f, 0x92ad3f92, 0x9dbc219d, 0x38487038, 0xf504f1f5, 0xbcdf63bc, 0xb6c177b6, 0xda75afda, 0x21634221, 0x10302010, 0xff1ae5ff, 0xf30efdf3, 0xd26dbfd2, 0xcd4c81cd, 0x0c14180c, 0x13352613, 0xec2fc3ec, 0x5fe1be5f, 0x97a23597, 0x44cc8844, 0x17392e17, 0xc45793c4, 0xa7f255a7, 0x7e82fc7e, 0x3d477a3d, 0x64acc864, 0x5de7ba5d, 0x192b3219, 0x7395e673, 0x60a0c060, 0x81981981, 0x4fd19e4f, 0xdc7fa3dc, 0x22664422, 0x2a7e542a, 0x90ab3b90, 0x88830b88, 0x46ca8c46, 0xee29c7ee, 0xb8d36bb8, 0x143c2814, 0xde79a7de, 0x5ee2bc5e, 0x0b1d160b, 0xdb76addb, 0xe03bdbe0, 0x32566432, 0x3a4e743a, 0x0a1e140a, 0x49db9249, 0x060a0c06, 0x246c4824, 0x5ce4b85c, 0xc25d9fc2, 0xd36ebdd3, 0xacef43ac, 0x62a6c462, 0x91a83991, 0x95a43195, 0xe437d3e4, 0x798bf279, 0xe732d5e7, 0xc8438bc8, 0x37596e37, 0x6db7da6d, 0x8d8c018d, 0xd564b1d5, 0x4ed29c4e, 0xa9e049a9, 0x6cb4d86c, 0x56faac56, 0xf407f3f4, 0xea25cfea, 0x65afca65, 0x7a8ef47a, 0xaee947ae, 0x08181008, 0xbad56fba, 0x7888f078, 0x256f4a25, 0x2e725c2e, 0x1c24381c, 0xa6f157a6, 0xb4c773b4, 0xc65197c6, 0xe823cbe8, 0xdd7ca1dd, 0x749ce874, 0x1f213e1f, 0x4bdd964b, 0xbddc61bd, 0x8b860d8b, 0x8a850f8a, 0x7090e070, 0x3e427c3e, 0xb5c471b5, 0x66aacc66, 0x48d89048, 0x03050603, 0xf601f7f6, 0x0e121c0e, 0x61a3c261, 0x355f6a35, 0x57f9ae57, 0xb9d069b9, 0x86911786, 0xc15899c1, 0x1d273a1d, 0x9eb9279e, 0xe138d9e1, 0xf813ebf8, 0x98b32b98, 0x11332211, 0x69bbd269, 0xd970a9d9, 0x8e89078e, 0x94a73394, 0x9bb62d9b, 0x1e223c1e, 0x87921587, 0xe920c9e9, 0xce4987ce, 0x55ffaa55, 0x28785028, 0xdf7aa5df, 0x8c8f038c, 0xa1f859a1, 0x89800989, 0x0d171a0d, 0xbfda65bf, 0xe631d7e6, 0x42c68442, 0x68b8d068, 0x41c38241, 0x99b02999, 0x2d775a2d, 0x0f111e0f, 0xb0cb7bb0, 0x54fca854, 0xbbd66dbb, 0x163a2c16];
    var T4 = [0x6363a5c6, 0x7c7c84f8, 0x777799ee, 0x7b7b8df6, 0xf2f20dff, 0x6b6bbdd6, 0x6f6fb1de, 0xc5c55491, 0x30305060, 0x01010302, 0x6767a9ce, 0x2b2b7d56, 0xfefe19e7, 0xd7d762b5, 0xababe64d, 0x76769aec, 0xcaca458f, 0x82829d1f, 0xc9c94089, 0x7d7d87fa, 0xfafa15ef, 0x5959ebb2, 0x4747c98e, 0xf0f00bfb, 0xadadec41, 0xd4d467b3, 0xa2a2fd5f, 0xafafea45, 0x9c9cbf23, 0xa4a4f753, 0x727296e4, 0xc0c05b9b, 0xb7b7c275, 0xfdfd1ce1, 0x9393ae3d, 0x26266a4c, 0x36365a6c, 0x3f3f417e, 0xf7f702f5, 0xcccc4f83, 0x34345c68, 0xa5a5f451, 0xe5e534d1, 0xf1f108f9, 0x717193e2, 0xd8d873ab, 0x31315362, 0x15153f2a, 0x04040c08, 0xc7c75295, 0x23236546, 0xc3c35e9d, 0x18182830, 0x9696a137, 0x05050f0a, 0x9a9ab52f, 0x0707090e, 0x12123624, 0x80809b1b, 0xe2e23ddf, 0xebeb26cd, 0x2727694e, 0xb2b2cd7f, 0x75759fea, 0x09091b12, 0x83839e1d, 0x2c2c7458, 0x1a1a2e34, 0x1b1b2d36, 0x6e6eb2dc, 0x5a5aeeb4, 0xa0a0fb5b, 0x5252f6a4, 0x3b3b4d76, 0xd6d661b7, 0xb3b3ce7d, 0x29297b52, 0xe3e33edd, 0x2f2f715e, 0x84849713, 0x5353f5a6, 0xd1d168b9, 0x00000000, 0xeded2cc1, 0x20206040, 0xfcfc1fe3, 0xb1b1c879, 0x5b5bedb6, 0x6a6abed4, 0xcbcb468d, 0xbebed967, 0x39394b72, 0x4a4ade94, 0x4c4cd498, 0x5858e8b0, 0xcfcf4a85, 0xd0d06bbb, 0xefef2ac5, 0xaaaae54f, 0xfbfb16ed, 0x4343c586, 0x4d4dd79a, 0x33335566, 0x85859411, 0x4545cf8a, 0xf9f910e9, 0x02020604, 0x7f7f81fe, 0x5050f0a0, 0x3c3c4478, 0x9f9fba25, 0xa8a8e34b, 0x5151f3a2, 0xa3a3fe5d, 0x4040c080, 0x8f8f8a05, 0x9292ad3f, 0x9d9dbc21, 0x38384870, 0xf5f504f1, 0xbcbcdf63, 0xb6b6c177, 0xdada75af, 0x21216342, 0x10103020, 0xffff1ae5, 0xf3f30efd, 0xd2d26dbf, 0xcdcd4c81, 0x0c0c1418, 0x13133526, 0xecec2fc3, 0x5f5fe1be, 0x9797a235, 0x4444cc88, 0x1717392e, 0xc4c45793, 0xa7a7f255, 0x7e7e82fc, 0x3d3d477a, 0x6464acc8, 0x5d5de7ba, 0x19192b32, 0x737395e6, 0x6060a0c0, 0x81819819, 0x4f4fd19e, 0xdcdc7fa3, 0x22226644, 0x2a2a7e54, 0x9090ab3b, 0x8888830b, 0x4646ca8c, 0xeeee29c7, 0xb8b8d36b, 0x14143c28, 0xdede79a7, 0x5e5ee2bc, 0x0b0b1d16, 0xdbdb76ad, 0xe0e03bdb, 0x32325664, 0x3a3a4e74, 0x0a0a1e14, 0x4949db92, 0x06060a0c, 0x24246c48, 0x5c5ce4b8, 0xc2c25d9f, 0xd3d36ebd, 0xacacef43, 0x6262a6c4, 0x9191a839, 0x9595a431, 0xe4e437d3, 0x79798bf2, 0xe7e732d5, 0xc8c8438b, 0x3737596e, 0x6d6db7da, 0x8d8d8c01, 0xd5d564b1, 0x4e4ed29c, 0xa9a9e049, 0x6c6cb4d8, 0x5656faac, 0xf4f407f3, 0xeaea25cf, 0x6565afca, 0x7a7a8ef4, 0xaeaee947, 0x08081810, 0xbabad56f, 0x787888f0, 0x25256f4a, 0x2e2e725c, 0x1c1c2438, 0xa6a6f157, 0xb4b4c773, 0xc6c65197, 0xe8e823cb, 0xdddd7ca1, 0x74749ce8, 0x1f1f213e, 0x4b4bdd96, 0xbdbddc61, 0x8b8b860d, 0x8a8a850f, 0x707090e0, 0x3e3e427c, 0xb5b5c471, 0x6666aacc, 0x4848d890, 0x03030506, 0xf6f601f7, 0x0e0e121c, 0x6161a3c2, 0x35355f6a, 0x5757f9ae, 0xb9b9d069, 0x86869117, 0xc1c15899, 0x1d1d273a, 0x9e9eb927, 0xe1e138d9, 0xf8f813eb, 0x9898b32b, 0x11113322, 0x6969bbd2, 0xd9d970a9, 0x8e8e8907, 0x9494a733, 0x9b9bb62d, 0x1e1e223c, 0x87879215, 0xe9e920c9, 0xcece4987, 0x5555ffaa, 0x28287850, 0xdfdf7aa5, 0x8c8c8f03, 0xa1a1f859, 0x89898009, 0x0d0d171a, 0xbfbfda65, 0xe6e631d7, 0x4242c684, 0x6868b8d0, 0x4141c382, 0x9999b029, 0x2d2d775a, 0x0f0f111e, 0xb0b0cb7b, 0x5454fca8, 0xbbbbd66d, 0x16163a2c];

    // Transformations for decryption
    var T5 = [0x51f4a750, 0x7e416553, 0x1a17a4c3, 0x3a275e96, 0x3bab6bcb, 0x1f9d45f1, 0xacfa58ab, 0x4be30393, 0x2030fa55, 0xad766df6, 0x88cc7691, 0xf5024c25, 0x4fe5d7fc, 0xc52acbd7, 0x26354480, 0xb562a38f, 0xdeb15a49, 0x25ba1b67, 0x45ea0e98, 0x5dfec0e1, 0xc32f7502, 0x814cf012, 0x8d4697a3, 0x6bd3f9c6, 0x038f5fe7, 0x15929c95, 0xbf6d7aeb, 0x955259da, 0xd4be832d, 0x587421d3, 0x49e06929, 0x8ec9c844, 0x75c2896a, 0xf48e7978, 0x99583e6b, 0x27b971dd, 0xbee14fb6, 0xf088ad17, 0xc920ac66, 0x7dce3ab4, 0x63df4a18, 0xe51a3182, 0x97513360, 0x62537f45, 0xb16477e0, 0xbb6bae84, 0xfe81a01c, 0xf9082b94, 0x70486858, 0x8f45fd19, 0x94de6c87, 0x527bf8b7, 0xab73d323, 0x724b02e2, 0xe31f8f57, 0x6655ab2a, 0xb2eb2807, 0x2fb5c203, 0x86c57b9a, 0xd33708a5, 0x302887f2, 0x23bfa5b2, 0x02036aba, 0xed16825c, 0x8acf1c2b, 0xa779b492, 0xf307f2f0, 0x4e69e2a1, 0x65daf4cd, 0x0605bed5, 0xd134621f, 0xc4a6fe8a, 0x342e539d, 0xa2f355a0, 0x058ae132, 0xa4f6eb75, 0x0b83ec39, 0x4060efaa, 0x5e719f06, 0xbd6e1051, 0x3e218af9, 0x96dd063d, 0xdd3e05ae, 0x4de6bd46, 0x91548db5, 0x71c45d05, 0x0406d46f, 0x605015ff, 0x1998fb24, 0xd6bde997, 0x894043cc, 0x67d99e77, 0xb0e842bd, 0x07898b88, 0xe7195b38, 0x79c8eedb, 0xa17c0a47, 0x7c420fe9, 0xf8841ec9, 0x00000000, 0x09808683, 0x322bed48, 0x1e1170ac, 0x6c5a724e, 0xfd0efffb, 0x0f853856, 0x3daed51e, 0x362d3927, 0x0a0fd964, 0x685ca621, 0x9b5b54d1, 0x24362e3a, 0x0c0a67b1, 0x9357e70f, 0xb4ee96d2, 0x1b9b919e, 0x80c0c54f, 0x61dc20a2, 0x5a774b69, 0x1c121a16, 0xe293ba0a, 0xc0a02ae5, 0x3c22e043, 0x121b171d, 0x0e090d0b, 0xf28bc7ad, 0x2db6a8b9, 0x141ea9c8, 0x57f11985, 0xaf75074c, 0xee99ddbb, 0xa37f60fd, 0xf701269f, 0x5c72f5bc, 0x44663bc5, 0x5bfb7e34, 0x8b432976, 0xcb23c6dc, 0xb6edfc68, 0xb8e4f163, 0xd731dcca, 0x42638510, 0x13972240, 0x84c61120, 0x854a247d, 0xd2bb3df8, 0xaef93211, 0xc729a16d, 0x1d9e2f4b, 0xdcb230f3, 0x0d8652ec, 0x77c1e3d0, 0x2bb3166c, 0xa970b999, 0x119448fa, 0x47e96422, 0xa8fc8cc4, 0xa0f03f1a, 0x567d2cd8, 0x223390ef, 0x87494ec7, 0xd938d1c1, 0x8ccaa2fe, 0x98d40b36, 0xa6f581cf, 0xa57ade28, 0xdab78e26, 0x3fadbfa4, 0x2c3a9de4, 0x5078920d, 0x6a5fcc9b, 0x547e4662, 0xf68d13c2, 0x90d8b8e8, 0x2e39f75e, 0x82c3aff5, 0x9f5d80be, 0x69d0937c, 0x6fd52da9, 0xcf2512b3, 0xc8ac993b, 0x10187da7, 0xe89c636e, 0xdb3bbb7b, 0xcd267809, 0x6e5918f4, 0xec9ab701, 0x834f9aa8, 0xe6956e65, 0xaaffe67e, 0x21bccf08, 0xef15e8e6, 0xbae79bd9, 0x4a6f36ce, 0xea9f09d4, 0x29b07cd6, 0x31a4b2af, 0x2a3f2331, 0xc6a59430, 0x35a266c0, 0x744ebc37, 0xfc82caa6, 0xe090d0b0, 0x33a7d815, 0xf104984a, 0x41ecdaf7, 0x7fcd500e, 0x1791f62f, 0x764dd68d, 0x43efb04d, 0xccaa4d54, 0xe49604df, 0x9ed1b5e3, 0x4c6a881b, 0xc12c1fb8, 0x4665517f, 0x9d5eea04, 0x018c355d, 0xfa877473, 0xfb0b412e, 0xb3671d5a, 0x92dbd252, 0xe9105633, 0x6dd64713, 0x9ad7618c, 0x37a10c7a, 0x59f8148e, 0xeb133c89, 0xcea927ee, 0xb761c935, 0xe11ce5ed, 0x7a47b13c, 0x9cd2df59, 0x55f2733f, 0x1814ce79, 0x73c737bf, 0x53f7cdea, 0x5ffdaa5b, 0xdf3d6f14, 0x7844db86, 0xcaaff381, 0xb968c43e, 0x3824342c, 0xc2a3405f, 0x161dc372, 0xbce2250c, 0x283c498b, 0xff0d9541, 0x39a80171, 0x080cb3de, 0xd8b4e49c, 0x6456c190, 0x7bcb8461, 0xd532b670, 0x486c5c74, 0xd0b85742];
    var T6 = [0x5051f4a7, 0x537e4165, 0xc31a17a4, 0x963a275e, 0xcb3bab6b, 0xf11f9d45, 0xabacfa58, 0x934be303, 0x552030fa, 0xf6ad766d, 0x9188cc76, 0x25f5024c, 0xfc4fe5d7, 0xd7c52acb, 0x80263544, 0x8fb562a3, 0x49deb15a, 0x6725ba1b, 0x9845ea0e, 0xe15dfec0, 0x02c32f75, 0x12814cf0, 0xa38d4697, 0xc66bd3f9, 0xe7038f5f, 0x9515929c, 0xebbf6d7a, 0xda955259, 0x2dd4be83, 0xd3587421, 0x2949e069, 0x448ec9c8, 0x6a75c289, 0x78f48e79, 0x6b99583e, 0xdd27b971, 0xb6bee14f, 0x17f088ad, 0x66c920ac, 0xb47dce3a, 0x1863df4a, 0x82e51a31, 0x60975133, 0x4562537f, 0xe0b16477, 0x84bb6bae, 0x1cfe81a0, 0x94f9082b, 0x58704868, 0x198f45fd, 0x8794de6c, 0xb7527bf8, 0x23ab73d3, 0xe2724b02, 0x57e31f8f, 0x2a6655ab, 0x07b2eb28, 0x032fb5c2, 0x9a86c57b, 0xa5d33708, 0xf2302887, 0xb223bfa5, 0xba02036a, 0x5ced1682, 0x2b8acf1c, 0x92a779b4, 0xf0f307f2, 0xa14e69e2, 0xcd65daf4, 0xd50605be, 0x1fd13462, 0x8ac4a6fe, 0x9d342e53, 0xa0a2f355, 0x32058ae1, 0x75a4f6eb, 0x390b83ec, 0xaa4060ef, 0x065e719f, 0x51bd6e10, 0xf93e218a, 0x3d96dd06, 0xaedd3e05, 0x464de6bd, 0xb591548d, 0x0571c45d, 0x6f0406d4, 0xff605015, 0x241998fb, 0x97d6bde9, 0xcc894043, 0x7767d99e, 0xbdb0e842, 0x8807898b, 0x38e7195b, 0xdb79c8ee, 0x47a17c0a, 0xe97c420f, 0xc9f8841e, 0x00000000, 0x83098086, 0x48322bed, 0xac1e1170, 0x4e6c5a72, 0xfbfd0eff, 0x560f8538, 0x1e3daed5, 0x27362d39, 0x640a0fd9, 0x21685ca6, 0xd19b5b54, 0x3a24362e, 0xb10c0a67, 0x0f9357e7, 0xd2b4ee96, 0x9e1b9b91, 0x4f80c0c5, 0xa261dc20, 0x695a774b, 0x161c121a, 0x0ae293ba, 0xe5c0a02a, 0x433c22e0, 0x1d121b17, 0x0b0e090d, 0xadf28bc7, 0xb92db6a8, 0xc8141ea9, 0x8557f119, 0x4caf7507, 0xbbee99dd, 0xfda37f60, 0x9ff70126, 0xbc5c72f5, 0xc544663b, 0x345bfb7e, 0x768b4329, 0xdccb23c6, 0x68b6edfc, 0x63b8e4f1, 0xcad731dc, 0x10426385, 0x40139722, 0x2084c611, 0x7d854a24, 0xf8d2bb3d, 0x11aef932, 0x6dc729a1, 0x4b1d9e2f, 0xf3dcb230, 0xec0d8652, 0xd077c1e3, 0x6c2bb316, 0x99a970b9, 0xfa119448, 0x2247e964, 0xc4a8fc8c, 0x1aa0f03f, 0xd8567d2c, 0xef223390, 0xc787494e, 0xc1d938d1, 0xfe8ccaa2, 0x3698d40b, 0xcfa6f581, 0x28a57ade, 0x26dab78e, 0xa43fadbf, 0xe42c3a9d, 0x0d507892, 0x9b6a5fcc, 0x62547e46, 0xc2f68d13, 0xe890d8b8, 0x5e2e39f7, 0xf582c3af, 0xbe9f5d80, 0x7c69d093, 0xa96fd52d, 0xb3cf2512, 0x3bc8ac99, 0xa710187d, 0x6ee89c63, 0x7bdb3bbb, 0x09cd2678, 0xf46e5918, 0x01ec9ab7, 0xa8834f9a, 0x65e6956e, 0x7eaaffe6, 0x0821bccf, 0xe6ef15e8, 0xd9bae79b, 0xce4a6f36, 0xd4ea9f09, 0xd629b07c, 0xaf31a4b2, 0x312a3f23, 0x30c6a594, 0xc035a266, 0x37744ebc, 0xa6fc82ca, 0xb0e090d0, 0x1533a7d8, 0x4af10498, 0xf741ecda, 0x0e7fcd50, 0x2f1791f6, 0x8d764dd6, 0x4d43efb0, 0x54ccaa4d, 0xdfe49604, 0xe39ed1b5, 0x1b4c6a88, 0xb8c12c1f, 0x7f466551, 0x049d5eea, 0x5d018c35, 0x73fa8774, 0x2efb0b41, 0x5ab3671d, 0x5292dbd2, 0x33e91056, 0x136dd647, 0x8c9ad761, 0x7a37a10c, 0x8e59f814, 0x89eb133c, 0xeecea927, 0x35b761c9, 0xede11ce5, 0x3c7a47b1, 0x599cd2df, 0x3f55f273, 0x791814ce, 0xbf73c737, 0xea53f7cd, 0x5b5ffdaa, 0x14df3d6f, 0x867844db, 0x81caaff3, 0x3eb968c4, 0x2c382434, 0x5fc2a340, 0x72161dc3, 0x0cbce225, 0x8b283c49, 0x41ff0d95, 0x7139a801, 0xde080cb3, 0x9cd8b4e4, 0x906456c1, 0x617bcb84, 0x70d532b6, 0x74486c5c, 0x42d0b857];
    var T7 = [0xa75051f4, 0x65537e41, 0xa4c31a17, 0x5e963a27, 0x6bcb3bab, 0x45f11f9d, 0x58abacfa, 0x03934be3, 0xfa552030, 0x6df6ad76, 0x769188cc, 0x4c25f502, 0xd7fc4fe5, 0xcbd7c52a, 0x44802635, 0xa38fb562, 0x5a49deb1, 0x1b6725ba, 0x0e9845ea, 0xc0e15dfe, 0x7502c32f, 0xf012814c, 0x97a38d46, 0xf9c66bd3, 0x5fe7038f, 0x9c951592, 0x7aebbf6d, 0x59da9552, 0x832dd4be, 0x21d35874, 0x692949e0, 0xc8448ec9, 0x896a75c2, 0x7978f48e, 0x3e6b9958, 0x71dd27b9, 0x4fb6bee1, 0xad17f088, 0xac66c920, 0x3ab47dce, 0x4a1863df, 0x3182e51a, 0x33609751, 0x7f456253, 0x77e0b164, 0xae84bb6b, 0xa01cfe81, 0x2b94f908, 0x68587048, 0xfd198f45, 0x6c8794de, 0xf8b7527b, 0xd323ab73, 0x02e2724b, 0x8f57e31f, 0xab2a6655, 0x2807b2eb, 0xc2032fb5, 0x7b9a86c5, 0x08a5d337, 0x87f23028, 0xa5b223bf, 0x6aba0203, 0x825ced16, 0x1c2b8acf, 0xb492a779, 0xf2f0f307, 0xe2a14e69, 0xf4cd65da, 0xbed50605, 0x621fd134, 0xfe8ac4a6, 0x539d342e, 0x55a0a2f3, 0xe132058a, 0xeb75a4f6, 0xec390b83, 0xefaa4060, 0x9f065e71, 0x1051bd6e, 0x8af93e21, 0x063d96dd, 0x05aedd3e, 0xbd464de6, 0x8db59154, 0x5d0571c4, 0xd46f0406, 0x15ff6050, 0xfb241998, 0xe997d6bd, 0x43cc8940, 0x9e7767d9, 0x42bdb0e8, 0x8b880789, 0x5b38e719, 0xeedb79c8, 0x0a47a17c, 0x0fe97c42, 0x1ec9f884, 0x00000000, 0x86830980, 0xed48322b, 0x70ac1e11, 0x724e6c5a, 0xfffbfd0e, 0x38560f85, 0xd51e3dae, 0x3927362d, 0xd9640a0f, 0xa621685c, 0x54d19b5b, 0x2e3a2436, 0x67b10c0a, 0xe70f9357, 0x96d2b4ee, 0x919e1b9b, 0xc54f80c0, 0x20a261dc, 0x4b695a77, 0x1a161c12, 0xba0ae293, 0x2ae5c0a0, 0xe0433c22, 0x171d121b, 0x0d0b0e09, 0xc7adf28b, 0xa8b92db6, 0xa9c8141e, 0x198557f1, 0x074caf75, 0xddbbee99, 0x60fda37f, 0x269ff701, 0xf5bc5c72, 0x3bc54466, 0x7e345bfb, 0x29768b43, 0xc6dccb23, 0xfc68b6ed, 0xf163b8e4, 0xdccad731, 0x85104263, 0x22401397, 0x112084c6, 0x247d854a, 0x3df8d2bb, 0x3211aef9, 0xa16dc729, 0x2f4b1d9e, 0x30f3dcb2, 0x52ec0d86, 0xe3d077c1, 0x166c2bb3, 0xb999a970, 0x48fa1194, 0x642247e9, 0x8cc4a8fc, 0x3f1aa0f0, 0x2cd8567d, 0x90ef2233, 0x4ec78749, 0xd1c1d938, 0xa2fe8cca, 0x0b3698d4, 0x81cfa6f5, 0xde28a57a, 0x8e26dab7, 0xbfa43fad, 0x9de42c3a, 0x920d5078, 0xcc9b6a5f, 0x4662547e, 0x13c2f68d, 0xb8e890d8, 0xf75e2e39, 0xaff582c3, 0x80be9f5d, 0x937c69d0, 0x2da96fd5, 0x12b3cf25, 0x993bc8ac, 0x7da71018, 0x636ee89c, 0xbb7bdb3b, 0x7809cd26, 0x18f46e59, 0xb701ec9a, 0x9aa8834f, 0x6e65e695, 0xe67eaaff, 0xcf0821bc, 0xe8e6ef15, 0x9bd9bae7, 0x36ce4a6f, 0x09d4ea9f, 0x7cd629b0, 0xb2af31a4, 0x23312a3f, 0x9430c6a5, 0x66c035a2, 0xbc37744e, 0xcaa6fc82, 0xd0b0e090, 0xd81533a7, 0x984af104, 0xdaf741ec, 0x500e7fcd, 0xf62f1791, 0xd68d764d, 0xb04d43ef, 0x4d54ccaa, 0x04dfe496, 0xb5e39ed1, 0x881b4c6a, 0x1fb8c12c, 0x517f4665, 0xea049d5e, 0x355d018c, 0x7473fa87, 0x412efb0b, 0x1d5ab367, 0xd25292db, 0x5633e910, 0x47136dd6, 0x618c9ad7, 0x0c7a37a1, 0x148e59f8, 0x3c89eb13, 0x27eecea9, 0xc935b761, 0xe5ede11c, 0xb13c7a47, 0xdf599cd2, 0x733f55f2, 0xce791814, 0x37bf73c7, 0xcdea53f7, 0xaa5b5ffd, 0x6f14df3d, 0xdb867844, 0xf381caaf, 0xc43eb968, 0x342c3824, 0x405fc2a3, 0xc372161d, 0x250cbce2, 0x498b283c, 0x9541ff0d, 0x017139a8, 0xb3de080c, 0xe49cd8b4, 0xc1906456, 0x84617bcb, 0xb670d532, 0x5c74486c, 0x5742d0b8];
    var T8 = [0xf4a75051, 0x4165537e, 0x17a4c31a, 0x275e963a, 0xab6bcb3b, 0x9d45f11f, 0xfa58abac, 0xe303934b, 0x30fa5520, 0x766df6ad, 0xcc769188, 0x024c25f5, 0xe5d7fc4f, 0x2acbd7c5, 0x35448026, 0x62a38fb5, 0xb15a49de, 0xba1b6725, 0xea0e9845, 0xfec0e15d, 0x2f7502c3, 0x4cf01281, 0x4697a38d, 0xd3f9c66b, 0x8f5fe703, 0x929c9515, 0x6d7aebbf, 0x5259da95, 0xbe832dd4, 0x7421d358, 0xe0692949, 0xc9c8448e, 0xc2896a75, 0x8e7978f4, 0x583e6b99, 0xb971dd27, 0xe14fb6be, 0x88ad17f0, 0x20ac66c9, 0xce3ab47d, 0xdf4a1863, 0x1a3182e5, 0x51336097, 0x537f4562, 0x6477e0b1, 0x6bae84bb, 0x81a01cfe, 0x082b94f9, 0x48685870, 0x45fd198f, 0xde6c8794, 0x7bf8b752, 0x73d323ab, 0x4b02e272, 0x1f8f57e3, 0x55ab2a66, 0xeb2807b2, 0xb5c2032f, 0xc57b9a86, 0x3708a5d3, 0x2887f230, 0xbfa5b223, 0x036aba02, 0x16825ced, 0xcf1c2b8a, 0x79b492a7, 0x07f2f0f3, 0x69e2a14e, 0xdaf4cd65, 0x05bed506, 0x34621fd1, 0xa6fe8ac4, 0x2e539d34, 0xf355a0a2, 0x8ae13205, 0xf6eb75a4, 0x83ec390b, 0x60efaa40, 0x719f065e, 0x6e1051bd, 0x218af93e, 0xdd063d96, 0x3e05aedd, 0xe6bd464d, 0x548db591, 0xc45d0571, 0x06d46f04, 0x5015ff60, 0x98fb2419, 0xbde997d6, 0x4043cc89, 0xd99e7767, 0xe842bdb0, 0x898b8807, 0x195b38e7, 0xc8eedb79, 0x7c0a47a1, 0x420fe97c, 0x841ec9f8, 0x00000000, 0x80868309, 0x2bed4832, 0x1170ac1e, 0x5a724e6c, 0x0efffbfd, 0x8538560f, 0xaed51e3d, 0x2d392736, 0x0fd9640a, 0x5ca62168, 0x5b54d19b, 0x362e3a24, 0x0a67b10c, 0x57e70f93, 0xee96d2b4, 0x9b919e1b, 0xc0c54f80, 0xdc20a261, 0x774b695a, 0x121a161c, 0x93ba0ae2, 0xa02ae5c0, 0x22e0433c, 0x1b171d12, 0x090d0b0e, 0x8bc7adf2, 0xb6a8b92d, 0x1ea9c814, 0xf1198557, 0x75074caf, 0x99ddbbee, 0x7f60fda3, 0x01269ff7, 0x72f5bc5c, 0x663bc544, 0xfb7e345b, 0x4329768b, 0x23c6dccb, 0xedfc68b6, 0xe4f163b8, 0x31dccad7, 0x63851042, 0x97224013, 0xc6112084, 0x4a247d85, 0xbb3df8d2, 0xf93211ae, 0x29a16dc7, 0x9e2f4b1d, 0xb230f3dc, 0x8652ec0d, 0xc1e3d077, 0xb3166c2b, 0x70b999a9, 0x9448fa11, 0xe9642247, 0xfc8cc4a8, 0xf03f1aa0, 0x7d2cd856, 0x3390ef22, 0x494ec787, 0x38d1c1d9, 0xcaa2fe8c, 0xd40b3698, 0xf581cfa6, 0x7ade28a5, 0xb78e26da, 0xadbfa43f, 0x3a9de42c, 0x78920d50, 0x5fcc9b6a, 0x7e466254, 0x8d13c2f6, 0xd8b8e890, 0x39f75e2e, 0xc3aff582, 0x5d80be9f, 0xd0937c69, 0xd52da96f, 0x2512b3cf, 0xac993bc8, 0x187da710, 0x9c636ee8, 0x3bbb7bdb, 0x267809cd, 0x5918f46e, 0x9ab701ec, 0x4f9aa883, 0x956e65e6, 0xffe67eaa, 0xbccf0821, 0x15e8e6ef, 0xe79bd9ba, 0x6f36ce4a, 0x9f09d4ea, 0xb07cd629, 0xa4b2af31, 0x3f23312a, 0xa59430c6, 0xa266c035, 0x4ebc3774, 0x82caa6fc, 0x90d0b0e0, 0xa7d81533, 0x04984af1, 0xecdaf741, 0xcd500e7f, 0x91f62f17, 0x4dd68d76, 0xefb04d43, 0xaa4d54cc, 0x9604dfe4, 0xd1b5e39e, 0x6a881b4c, 0x2c1fb8c1, 0x65517f46, 0x5eea049d, 0x8c355d01, 0x877473fa, 0x0b412efb, 0x671d5ab3, 0xdbd25292, 0x105633e9, 0xd647136d, 0xd7618c9a, 0xa10c7a37, 0xf8148e59, 0x133c89eb, 0xa927eece, 0x61c935b7, 0x1ce5ede1, 0x47b13c7a, 0xd2df599c, 0xf2733f55, 0x14ce7918, 0xc737bf73, 0xf7cdea53, 0xfdaa5b5f, 0x3d6f14df, 0x44db8678, 0xaff381ca, 0x68c43eb9, 0x24342c38, 0xa3405fc2, 0x1dc37216, 0xe2250cbc, 0x3c498b28, 0x0d9541ff, 0xa8017139, 0x0cb3de08, 0xb4e49cd8, 0x56c19064, 0xcb84617b, 0x32b670d5, 0x6c5c7448, 0xb85742d0];

    // Transformations for decryption key expansion
    var U1 = [0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28, 0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b, 0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742, 0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd, 0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba, 0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f, 0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3];
    var U2 = [0x00000000, 0x0b0e090d, 0x161c121a, 0x1d121b17, 0x2c382434, 0x27362d39, 0x3a24362e, 0x312a3f23, 0x58704868, 0x537e4165, 0x4e6c5a72, 0x4562537f, 0x74486c5c, 0x7f466551, 0x62547e46, 0x695a774b, 0xb0e090d0, 0xbbee99dd, 0xa6fc82ca, 0xadf28bc7, 0x9cd8b4e4, 0x97d6bde9, 0x8ac4a6fe, 0x81caaff3, 0xe890d8b8, 0xe39ed1b5, 0xfe8ccaa2, 0xf582c3af, 0xc4a8fc8c, 0xcfa6f581, 0xd2b4ee96, 0xd9bae79b, 0x7bdb3bbb, 0x70d532b6, 0x6dc729a1, 0x66c920ac, 0x57e31f8f, 0x5ced1682, 0x41ff0d95, 0x4af10498, 0x23ab73d3, 0x28a57ade, 0x35b761c9, 0x3eb968c4, 0x0f9357e7, 0x049d5eea, 0x198f45fd, 0x12814cf0, 0xcb3bab6b, 0xc035a266, 0xdd27b971, 0xd629b07c, 0xe7038f5f, 0xec0d8652, 0xf11f9d45, 0xfa119448, 0x934be303, 0x9845ea0e, 0x8557f119, 0x8e59f814, 0xbf73c737, 0xb47dce3a, 0xa96fd52d, 0xa261dc20, 0xf6ad766d, 0xfda37f60, 0xe0b16477, 0xebbf6d7a, 0xda955259, 0xd19b5b54, 0xcc894043, 0xc787494e, 0xaedd3e05, 0xa5d33708, 0xb8c12c1f, 0xb3cf2512, 0x82e51a31, 0x89eb133c, 0x94f9082b, 0x9ff70126, 0x464de6bd, 0x4d43efb0, 0x5051f4a7, 0x5b5ffdaa, 0x6a75c289, 0x617bcb84, 0x7c69d093, 0x7767d99e, 0x1e3daed5, 0x1533a7d8, 0x0821bccf, 0x032fb5c2, 0x32058ae1, 0x390b83ec, 0x241998fb, 0x2f1791f6, 0x8d764dd6, 0x867844db, 0x9b6a5fcc, 0x906456c1, 0xa14e69e2, 0xaa4060ef, 0xb7527bf8, 0xbc5c72f5, 0xd50605be, 0xde080cb3, 0xc31a17a4, 0xc8141ea9, 0xf93e218a, 0xf2302887, 0xef223390, 0xe42c3a9d, 0x3d96dd06, 0x3698d40b, 0x2b8acf1c, 0x2084c611, 0x11aef932, 0x1aa0f03f, 0x07b2eb28, 0x0cbce225, 0x65e6956e, 0x6ee89c63, 0x73fa8774, 0x78f48e79, 0x49deb15a, 0x42d0b857, 0x5fc2a340, 0x54ccaa4d, 0xf741ecda, 0xfc4fe5d7, 0xe15dfec0, 0xea53f7cd, 0xdb79c8ee, 0xd077c1e3, 0xcd65daf4, 0xc66bd3f9, 0xaf31a4b2, 0xa43fadbf, 0xb92db6a8, 0xb223bfa5, 0x83098086, 0x8807898b, 0x9515929c, 0x9e1b9b91, 0x47a17c0a, 0x4caf7507, 0x51bd6e10, 0x5ab3671d, 0x6b99583e, 0x60975133, 0x7d854a24, 0x768b4329, 0x1fd13462, 0x14df3d6f, 0x09cd2678, 0x02c32f75, 0x33e91056, 0x38e7195b, 0x25f5024c, 0x2efb0b41, 0x8c9ad761, 0x8794de6c, 0x9a86c57b, 0x9188cc76, 0xa0a2f355, 0xabacfa58, 0xb6bee14f, 0xbdb0e842, 0xd4ea9f09, 0xdfe49604, 0xc2f68d13, 0xc9f8841e, 0xf8d2bb3d, 0xf3dcb230, 0xeecea927, 0xe5c0a02a, 0x3c7a47b1, 0x37744ebc, 0x2a6655ab, 0x21685ca6, 0x10426385, 0x1b4c6a88, 0x065e719f, 0x0d507892, 0x640a0fd9, 0x6f0406d4, 0x72161dc3, 0x791814ce, 0x48322bed, 0x433c22e0, 0x5e2e39f7, 0x552030fa, 0x01ec9ab7, 0x0ae293ba, 0x17f088ad, 0x1cfe81a0, 0x2dd4be83, 0x26dab78e, 0x3bc8ac99, 0x30c6a594, 0x599cd2df, 0x5292dbd2, 0x4f80c0c5, 0x448ec9c8, 0x75a4f6eb, 0x7eaaffe6, 0x63b8e4f1, 0x68b6edfc, 0xb10c0a67, 0xba02036a, 0xa710187d, 0xac1e1170, 0x9d342e53, 0x963a275e, 0x8b283c49, 0x80263544, 0xe97c420f, 0xe2724b02, 0xff605015, 0xf46e5918, 0xc544663b, 0xce4a6f36, 0xd3587421, 0xd8567d2c, 0x7a37a10c, 0x7139a801, 0x6c2bb316, 0x6725ba1b, 0x560f8538, 0x5d018c35, 0x40139722, 0x4b1d9e2f, 0x2247e964, 0x2949e069, 0x345bfb7e, 0x3f55f273, 0x0e7fcd50, 0x0571c45d, 0x1863df4a, 0x136dd647, 0xcad731dc, 0xc1d938d1, 0xdccb23c6, 0xd7c52acb, 0xe6ef15e8, 0xede11ce5, 0xf0f307f2, 0xfbfd0eff, 0x92a779b4, 0x99a970b9, 0x84bb6bae, 0x8fb562a3, 0xbe9f5d80, 0xb591548d, 0xa8834f9a, 0xa38d4697];
    var U3 = [0x00000000, 0x0d0b0e09, 0x1a161c12, 0x171d121b, 0x342c3824, 0x3927362d, 0x2e3a2436, 0x23312a3f, 0x68587048, 0x65537e41, 0x724e6c5a, 0x7f456253, 0x5c74486c, 0x517f4665, 0x4662547e, 0x4b695a77, 0xd0b0e090, 0xddbbee99, 0xcaa6fc82, 0xc7adf28b, 0xe49cd8b4, 0xe997d6bd, 0xfe8ac4a6, 0xf381caaf, 0xb8e890d8, 0xb5e39ed1, 0xa2fe8cca, 0xaff582c3, 0x8cc4a8fc, 0x81cfa6f5, 0x96d2b4ee, 0x9bd9bae7, 0xbb7bdb3b, 0xb670d532, 0xa16dc729, 0xac66c920, 0x8f57e31f, 0x825ced16, 0x9541ff0d, 0x984af104, 0xd323ab73, 0xde28a57a, 0xc935b761, 0xc43eb968, 0xe70f9357, 0xea049d5e, 0xfd198f45, 0xf012814c, 0x6bcb3bab, 0x66c035a2, 0x71dd27b9, 0x7cd629b0, 0x5fe7038f, 0x52ec0d86, 0x45f11f9d, 0x48fa1194, 0x03934be3, 0x0e9845ea, 0x198557f1, 0x148e59f8, 0x37bf73c7, 0x3ab47dce, 0x2da96fd5, 0x20a261dc, 0x6df6ad76, 0x60fda37f, 0x77e0b164, 0x7aebbf6d, 0x59da9552, 0x54d19b5b, 0x43cc8940, 0x4ec78749, 0x05aedd3e, 0x08a5d337, 0x1fb8c12c, 0x12b3cf25, 0x3182e51a, 0x3c89eb13, 0x2b94f908, 0x269ff701, 0xbd464de6, 0xb04d43ef, 0xa75051f4, 0xaa5b5ffd, 0x896a75c2, 0x84617bcb, 0x937c69d0, 0x9e7767d9, 0xd51e3dae, 0xd81533a7, 0xcf0821bc, 0xc2032fb5, 0xe132058a, 0xec390b83, 0xfb241998, 0xf62f1791, 0xd68d764d, 0xdb867844, 0xcc9b6a5f, 0xc1906456, 0xe2a14e69, 0xefaa4060, 0xf8b7527b, 0xf5bc5c72, 0xbed50605, 0xb3de080c, 0xa4c31a17, 0xa9c8141e, 0x8af93e21, 0x87f23028, 0x90ef2233, 0x9de42c3a, 0x063d96dd, 0x0b3698d4, 0x1c2b8acf, 0x112084c6, 0x3211aef9, 0x3f1aa0f0, 0x2807b2eb, 0x250cbce2, 0x6e65e695, 0x636ee89c, 0x7473fa87, 0x7978f48e, 0x5a49deb1, 0x5742d0b8, 0x405fc2a3, 0x4d54ccaa, 0xdaf741ec, 0xd7fc4fe5, 0xc0e15dfe, 0xcdea53f7, 0xeedb79c8, 0xe3d077c1, 0xf4cd65da, 0xf9c66bd3, 0xb2af31a4, 0xbfa43fad, 0xa8b92db6, 0xa5b223bf, 0x86830980, 0x8b880789, 0x9c951592, 0x919e1b9b, 0x0a47a17c, 0x074caf75, 0x1051bd6e, 0x1d5ab367, 0x3e6b9958, 0x33609751, 0x247d854a, 0x29768b43, 0x621fd134, 0x6f14df3d, 0x7809cd26, 0x7502c32f, 0x5633e910, 0x5b38e719, 0x4c25f502, 0x412efb0b, 0x618c9ad7, 0x6c8794de, 0x7b9a86c5, 0x769188cc, 0x55a0a2f3, 0x58abacfa, 0x4fb6bee1, 0x42bdb0e8, 0x09d4ea9f, 0x04dfe496, 0x13c2f68d, 0x1ec9f884, 0x3df8d2bb, 0x30f3dcb2, 0x27eecea9, 0x2ae5c0a0, 0xb13c7a47, 0xbc37744e, 0xab2a6655, 0xa621685c, 0x85104263, 0x881b4c6a, 0x9f065e71, 0x920d5078, 0xd9640a0f, 0xd46f0406, 0xc372161d, 0xce791814, 0xed48322b, 0xe0433c22, 0xf75e2e39, 0xfa552030, 0xb701ec9a, 0xba0ae293, 0xad17f088, 0xa01cfe81, 0x832dd4be, 0x8e26dab7, 0x993bc8ac, 0x9430c6a5, 0xdf599cd2, 0xd25292db, 0xc54f80c0, 0xc8448ec9, 0xeb75a4f6, 0xe67eaaff, 0xf163b8e4, 0xfc68b6ed, 0x67b10c0a, 0x6aba0203, 0x7da71018, 0x70ac1e11, 0x539d342e, 0x5e963a27, 0x498b283c, 0x44802635, 0x0fe97c42, 0x02e2724b, 0x15ff6050, 0x18f46e59, 0x3bc54466, 0x36ce4a6f, 0x21d35874, 0x2cd8567d, 0x0c7a37a1, 0x017139a8, 0x166c2bb3, 0x1b6725ba, 0x38560f85, 0x355d018c, 0x22401397, 0x2f4b1d9e, 0x642247e9, 0x692949e0, 0x7e345bfb, 0x733f55f2, 0x500e7fcd, 0x5d0571c4, 0x4a1863df, 0x47136dd6, 0xdccad731, 0xd1c1d938, 0xc6dccb23, 0xcbd7c52a, 0xe8e6ef15, 0xe5ede11c, 0xf2f0f307, 0xfffbfd0e, 0xb492a779, 0xb999a970, 0xae84bb6b, 0xa38fb562, 0x80be9f5d, 0x8db59154, 0x9aa8834f, 0x97a38d46];
    var U4 = [0x00000000, 0x090d0b0e, 0x121a161c, 0x1b171d12, 0x24342c38, 0x2d392736, 0x362e3a24, 0x3f23312a, 0x48685870, 0x4165537e, 0x5a724e6c, 0x537f4562, 0x6c5c7448, 0x65517f46, 0x7e466254, 0x774b695a, 0x90d0b0e0, 0x99ddbbee, 0x82caa6fc, 0x8bc7adf2, 0xb4e49cd8, 0xbde997d6, 0xa6fe8ac4, 0xaff381ca, 0xd8b8e890, 0xd1b5e39e, 0xcaa2fe8c, 0xc3aff582, 0xfc8cc4a8, 0xf581cfa6, 0xee96d2b4, 0xe79bd9ba, 0x3bbb7bdb, 0x32b670d5, 0x29a16dc7, 0x20ac66c9, 0x1f8f57e3, 0x16825ced, 0x0d9541ff, 0x04984af1, 0x73d323ab, 0x7ade28a5, 0x61c935b7, 0x68c43eb9, 0x57e70f93, 0x5eea049d, 0x45fd198f, 0x4cf01281, 0xab6bcb3b, 0xa266c035, 0xb971dd27, 0xb07cd629, 0x8f5fe703, 0x8652ec0d, 0x9d45f11f, 0x9448fa11, 0xe303934b, 0xea0e9845, 0xf1198557, 0xf8148e59, 0xc737bf73, 0xce3ab47d, 0xd52da96f, 0xdc20a261, 0x766df6ad, 0x7f60fda3, 0x6477e0b1, 0x6d7aebbf, 0x5259da95, 0x5b54d19b, 0x4043cc89, 0x494ec787, 0x3e05aedd, 0x3708a5d3, 0x2c1fb8c1, 0x2512b3cf, 0x1a3182e5, 0x133c89eb, 0x082b94f9, 0x01269ff7, 0xe6bd464d, 0xefb04d43, 0xf4a75051, 0xfdaa5b5f, 0xc2896a75, 0xcb84617b, 0xd0937c69, 0xd99e7767, 0xaed51e3d, 0xa7d81533, 0xbccf0821, 0xb5c2032f, 0x8ae13205, 0x83ec390b, 0x98fb2419, 0x91f62f17, 0x4dd68d76, 0x44db8678, 0x5fcc9b6a, 0x56c19064, 0x69e2a14e, 0x60efaa40, 0x7bf8b752, 0x72f5bc5c, 0x05bed506, 0x0cb3de08, 0x17a4c31a, 0x1ea9c814, 0x218af93e, 0x2887f230, 0x3390ef22, 0x3a9de42c, 0xdd063d96, 0xd40b3698, 0xcf1c2b8a, 0xc6112084, 0xf93211ae, 0xf03f1aa0, 0xeb2807b2, 0xe2250cbc, 0x956e65e6, 0x9c636ee8, 0x877473fa, 0x8e7978f4, 0xb15a49de, 0xb85742d0, 0xa3405fc2, 0xaa4d54cc, 0xecdaf741, 0xe5d7fc4f, 0xfec0e15d, 0xf7cdea53, 0xc8eedb79, 0xc1e3d077, 0xdaf4cd65, 0xd3f9c66b, 0xa4b2af31, 0xadbfa43f, 0xb6a8b92d, 0xbfa5b223, 0x80868309, 0x898b8807, 0x929c9515, 0x9b919e1b, 0x7c0a47a1, 0x75074caf, 0x6e1051bd, 0x671d5ab3, 0x583e6b99, 0x51336097, 0x4a247d85, 0x4329768b, 0x34621fd1, 0x3d6f14df, 0x267809cd, 0x2f7502c3, 0x105633e9, 0x195b38e7, 0x024c25f5, 0x0b412efb, 0xd7618c9a, 0xde6c8794, 0xc57b9a86, 0xcc769188, 0xf355a0a2, 0xfa58abac, 0xe14fb6be, 0xe842bdb0, 0x9f09d4ea, 0x9604dfe4, 0x8d13c2f6, 0x841ec9f8, 0xbb3df8d2, 0xb230f3dc, 0xa927eece, 0xa02ae5c0, 0x47b13c7a, 0x4ebc3774, 0x55ab2a66, 0x5ca62168, 0x63851042, 0x6a881b4c, 0x719f065e, 0x78920d50, 0x0fd9640a, 0x06d46f04, 0x1dc37216, 0x14ce7918, 0x2bed4832, 0x22e0433c, 0x39f75e2e, 0x30fa5520, 0x9ab701ec, 0x93ba0ae2, 0x88ad17f0, 0x81a01cfe, 0xbe832dd4, 0xb78e26da, 0xac993bc8, 0xa59430c6, 0xd2df599c, 0xdbd25292, 0xc0c54f80, 0xc9c8448e, 0xf6eb75a4, 0xffe67eaa, 0xe4f163b8, 0xedfc68b6, 0x0a67b10c, 0x036aba02, 0x187da710, 0x1170ac1e, 0x2e539d34, 0x275e963a, 0x3c498b28, 0x35448026, 0x420fe97c, 0x4b02e272, 0x5015ff60, 0x5918f46e, 0x663bc544, 0x6f36ce4a, 0x7421d358, 0x7d2cd856, 0xa10c7a37, 0xa8017139, 0xb3166c2b, 0xba1b6725, 0x8538560f, 0x8c355d01, 0x97224013, 0x9e2f4b1d, 0xe9642247, 0xe0692949, 0xfb7e345b, 0xf2733f55, 0xcd500e7f, 0xc45d0571, 0xdf4a1863, 0xd647136d, 0x31dccad7, 0x38d1c1d9, 0x23c6dccb, 0x2acbd7c5, 0x15e8e6ef, 0x1ce5ede1, 0x07f2f0f3, 0x0efffbfd, 0x79b492a7, 0x70b999a9, 0x6bae84bb, 0x62a38fb5, 0x5d80be9f, 0x548db591, 0x4f9aa883, 0x4697a38d];

    function convertToInt32(bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i += 4) {
            result.push(
                (bytes[i    ] << 24) |
                (bytes[i + 1] << 16) |
                (bytes[i + 2] <<  8) |
                 bytes[i + 3]
            );
        }
        return result;
    }

    var AES = function(key) {
        if (!(this instanceof AES)) {
            throw Error('AES must be instanitated with `new`');
        }

        Object.defineProperty(this, 'key', {
            value: coerceArray(key, true)
        });

        this._prepare();
    };


    AES.prototype._prepare = function() {

        var rounds = numberOfRounds[this.key.length];
        if (rounds == null) {
            throw new Error('invalid key size (must be 16, 24 or 32 bytes)');
        }

        // encryption round keys
        this._Ke = [];

        // decryption round keys
        this._Kd = [];

        for (var i = 0; i <= rounds; i++) {
            this._Ke.push([0, 0, 0, 0]);
            this._Kd.push([0, 0, 0, 0]);
        }

        var roundKeyCount = (rounds + 1) * 4;
        var KC = this.key.length / 4;

        // convert the key into ints
        var tk = convertToInt32(this.key);

        // copy values into round key arrays
        var index;
        for (var i = 0; i < KC; i++) {
            index = i >> 2;
            this._Ke[index][i % 4] = tk[i];
            this._Kd[rounds - index][i % 4] = tk[i];
        }

        // key expansion (fips-197 section 5.2)
        var rconpointer = 0;
        var t = KC, tt;
        while (t < roundKeyCount) {
            tt = tk[KC - 1];
            tk[0] ^= ((S[(tt >> 16) & 0xFF] << 24) ^
                      (S[(tt >>  8) & 0xFF] << 16) ^
                      (S[ tt        & 0xFF] <<  8) ^
                       S[(tt >> 24) & 0xFF]        ^
                      (rcon[rconpointer] << 24));
            rconpointer += 1;

            // key expansion (for non-256 bit)
            if (KC != 8) {
                for (var i = 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }

            // key expansion for 256-bit keys is "slightly different" (fips-197)
            } else {
                for (var i = 1; i < (KC / 2); i++) {
                    tk[i] ^= tk[i - 1];
                }
                tt = tk[(KC / 2) - 1];

                tk[KC / 2] ^= (S[ tt        & 0xFF]        ^
                              (S[(tt >>  8) & 0xFF] <<  8) ^
                              (S[(tt >> 16) & 0xFF] << 16) ^
                              (S[(tt >> 24) & 0xFF] << 24));

                for (var i = (KC / 2) + 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }
            }

            // copy values into round key arrays
            var i = 0, r, c;
            while (i < KC && t < roundKeyCount) {
                r = t >> 2;
                c = t % 4;
                this._Ke[r][c] = tk[i];
                this._Kd[rounds - r][c] = tk[i++];
                t++;
            }
        }

        // inverse-cipher-ify the decryption round key (fips-197 section 5.3)
        for (var r = 1; r < rounds; r++) {
            for (var c = 0; c < 4; c++) {
                tt = this._Kd[r][c];
                this._Kd[r][c] = (U1[(tt >> 24) & 0xFF] ^
                                  U2[(tt >> 16) & 0xFF] ^
                                  U3[(tt >>  8) & 0xFF] ^
                                  U4[ tt        & 0xFF]);
            }
        }
    };

    AES.prototype.encrypt = function(plaintext) {
        if (plaintext.length != 16) {
            throw new Error('invalid plaintext size (must be 16 bytes)');
        }

        var rounds = this._Ke.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(plaintext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Ke[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T1[(t[ i         ] >> 24) & 0xff] ^
                        T2[(t[(i + 1) % 4] >> 16) & 0xff] ^
                        T3[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T4[ t[(i + 3) % 4]        & 0xff] ^
                        this._Ke[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Ke[rounds][i];
            result[4 * i    ] = (S[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (S[(t[(i + 1) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (S[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (S[ t[(i + 3) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    };

    AES.prototype.decrypt = function(ciphertext) {
        if (ciphertext.length != 16) {
            throw new Error('invalid ciphertext size (must be 16 bytes)');
        }

        var rounds = this._Kd.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(ciphertext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Kd[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T5[(t[ i          ] >> 24) & 0xff] ^
                        T6[(t[(i + 3) % 4] >> 16) & 0xff] ^
                        T7[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T8[ t[(i + 1) % 4]        & 0xff] ^
                        this._Kd[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Kd[rounds][i];
            result[4 * i    ] = (Si[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (Si[(t[(i + 3) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (Si[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (Si[ t[(i + 1) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    };


    /**
     *  Mode Of Operation - Electonic Codebook (ECB)
     */
    var ModeOfOperationECB = function(key) {
        if (!(this instanceof ModeOfOperationECB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Electronic Code Block";
        this.name = "ecb";

        this._aes = new AES(key);
    };

    ModeOfOperationECB.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);
            block = this._aes.encrypt(block);
            copyArray(block, ciphertext, i);
        }

        return ciphertext;
    };

    ModeOfOperationECB.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);
            copyArray(block, plaintext, i);
        }

        return plaintext;
    };


    /**
     *  Mode Of Operation - Cipher Block Chaining (CBC)
     */
    var ModeOfOperationCBC = function(key, iv) {
        if (!(this instanceof ModeOfOperationCBC)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Block Chaining";
        this.name = "cbc";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastCipherblock = coerceArray(iv, true);

        this._aes = new AES(key);
    };

    ModeOfOperationCBC.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);

            for (var j = 0; j < 16; j++) {
                block[j] ^= this._lastCipherblock[j];
            }

            this._lastCipherblock = this._aes.encrypt(block);
            copyArray(this._lastCipherblock, ciphertext, i);
        }

        return ciphertext;
    };

    ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);

            for (var j = 0; j < 16; j++) {
                plaintext[i + j] = block[j] ^ this._lastCipherblock[j];
            }

            copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16);
        }

        return plaintext;
    };


    /**
     *  Mode Of Operation - Cipher Feedback (CFB)
     */
    var ModeOfOperationCFB = function(key, iv, segmentSize) {
        if (!(this instanceof ModeOfOperationCFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Feedback";
        this.name = "cfb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 size)');
        }

        if (!segmentSize) { segmentSize = 1; }

        this.segmentSize = segmentSize;

        this._shiftRegister = coerceArray(iv, true);

        this._aes = new AES(key);
    };

    ModeOfOperationCFB.prototype.encrypt = function(plaintext) {
        if ((plaintext.length % this.segmentSize) != 0) {
            throw new Error('invalid plaintext size (must be segmentSize bytes)');
        }

        var encrypted = coerceArray(plaintext, true);

        var xorSegment;
        for (var i = 0; i < encrypted.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);
            for (var j = 0; j < this.segmentSize; j++) {
                encrypted[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(encrypted, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return encrypted;
    };

    ModeOfOperationCFB.prototype.decrypt = function(ciphertext) {
        if ((ciphertext.length % this.segmentSize) != 0) {
            throw new Error('invalid ciphertext size (must be segmentSize bytes)');
        }

        var plaintext = coerceArray(ciphertext, true);

        var xorSegment;
        for (var i = 0; i < plaintext.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);

            for (var j = 0; j < this.segmentSize; j++) {
                plaintext[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(ciphertext, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return plaintext;
    };

    /**
     *  Mode Of Operation - Output Feedback (OFB)
     */
    var ModeOfOperationOFB = function(key, iv) {
        if (!(this instanceof ModeOfOperationOFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Output Feedback";
        this.name = "ofb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastPrecipher = coerceArray(iv, true);
        this._lastPrecipherIndex = 16;

        this._aes = new AES(key);
    };

    ModeOfOperationOFB.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._lastPrecipherIndex === 16) {
                this._lastPrecipher = this._aes.encrypt(this._lastPrecipher);
                this._lastPrecipherIndex = 0;
            }
            encrypted[i] ^= this._lastPrecipher[this._lastPrecipherIndex++];
        }

        return encrypted;
    };

    // Decryption is symetric
    ModeOfOperationOFB.prototype.decrypt = ModeOfOperationOFB.prototype.encrypt;


    /**
     *  Counter object for CTR common mode of operation
     */
    var Counter = function(initialValue) {
        if (!(this instanceof Counter)) {
            throw Error('Counter must be instanitated with `new`');
        }

        // We allow 0, but anything false-ish uses the default 1
        if (initialValue !== 0 && !initialValue) { initialValue = 1; }

        if (typeof(initialValue) === 'number') {
            this._counter = createArray(16);
            this.setValue(initialValue);

        } else {
            this.setBytes(initialValue);
        }
    };

    Counter.prototype.setValue = function(value) {
        if (typeof(value) !== 'number' || parseInt(value) != value) {
            throw new Error('invalid counter value (must be an integer)');
        }

        for (var index = 15; index >= 0; --index) {
            this._counter[index] = value % 256;
            value = value >> 8;
        }
    };

    Counter.prototype.setBytes = function(bytes) {
        bytes = coerceArray(bytes, true);

        if (bytes.length != 16) {
            throw new Error('invalid counter bytes size (must be 16 bytes)');
        }

        this._counter = bytes;
    };

    Counter.prototype.increment = function() {
        for (var i = 15; i >= 0; i--) {
            if (this._counter[i] === 255) {
                this._counter[i] = 0;
            } else {
                this._counter[i]++;
                break;
            }
        }
    };


    /**
     *  Mode Of Operation - Counter (CTR)
     */
    var ModeOfOperationCTR = function(key, counter) {
        if (!(this instanceof ModeOfOperationCTR)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Counter";
        this.name = "ctr";

        if (!(counter instanceof Counter)) {
            counter = new Counter(counter);
        }

        this._counter = counter;

        this._remainingCounter = null;
        this._remainingCounterIndex = 16;

        this._aes = new AES(key);
    };

    ModeOfOperationCTR.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._remainingCounterIndex === 16) {
                this._remainingCounter = this._aes.encrypt(this._counter._counter);
                this._remainingCounterIndex = 0;
                this._counter.increment();
            }
            encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++];
        }

        return encrypted;
    };

    // Decryption is symetric
    ModeOfOperationCTR.prototype.decrypt = ModeOfOperationCTR.prototype.encrypt;


    ///////////////////////
    // Padding

    // See:https://tools.ietf.org/html/rfc2315
    function pkcs7pad(data) {
        data = coerceArray(data, true);
        var padder = 16 - (data.length % 16);
        var result = createArray(data.length + padder);
        copyArray(data, result);
        for (var i = data.length; i < result.length; i++) {
            result[i] = padder;
        }
        return result;
    }

    function pkcs7strip(data) {
        data = coerceArray(data, true);
        if (data.length < 16) { throw new Error('PKCS#7 invalid length'); }

        var padder = data[data.length - 1];
        if (padder > 16) { throw new Error('PKCS#7 padding byte out of range'); }

        var length = data.length - padder;
        for (var i = 0; i < padder; i++) {
            if (data[length + i] !== padder) {
                throw new Error('PKCS#7 invalid padding byte');
            }
        }

        var result = createArray(length);
        copyArray(data, result, 0, 0, length);
        return result;
    }

    ///////////////////////
    // Exporting


    // The block cipher
    var aesjs = {
        AES: AES,
        Counter: Counter,

        ModeOfOperation: {
            ecb: ModeOfOperationECB,
            cbc: ModeOfOperationCBC,
            cfb: ModeOfOperationCFB,
            ofb: ModeOfOperationOFB,
            ctr: ModeOfOperationCTR
        },

        utils: {
            hex: convertHex,
            utf8: convertUtf8
        },

        padding: {
            pkcs7: {
                pad: pkcs7pad,
                strip: pkcs7strip
            }
        },

        _arrayTest: {
            coerceArray: coerceArray,
            createArray: createArray,
            copyArray: copyArray,
        }
    };


    // node.js
    {
        module.exports = aesjs;

    // RequireJS/AMD
    // http://www.requirejs.org/docs/api.html
    // https://github.com/amdjs/amdjs-api/wiki/AMD
    }


})();
}(aesJs));

var aes = aesJs.exports;

const version$6 = "json-wallets/5.6.1";

function looseArrayify(hexString) {
    if (typeof (hexString) === 'string' && hexString.substring(0, 2) !== '0x') {
        hexString = '0x' + hexString;
    }
    return arrayify(hexString);
}
function zpad(value, length) {
    value = String(value);
    while (value.length < length) {
        value = '0' + value;
    }
    return value;
}
function getPassword(password) {
    if (typeof (password) === 'string') {
        return toUtf8Bytes(password, UnicodeNormalizationForm.NFKC);
    }
    return arrayify(password);
}
function searchPath(object, path) {
    let currentChild = object;
    const comps = path.toLowerCase().split('/');
    for (let i = 0; i < comps.length; i++) {
        // Search for a child object with a case-insensitive matching key
        let matchingChild = null;
        for (const key in currentChild) {
            if (key.toLowerCase() === comps[i]) {
                matchingChild = currentChild[key];
                break;
            }
        }
        // Didn't find one. :'(
        if (matchingChild === null) {
            return null;
        }
        // Now check this child...
        currentChild = matchingChild;
    }
    return currentChild;
}
// See: https://www.ietf.org/rfc/rfc4122.txt (Section 4.4)
function uuidV4(randomBytes) {
    const bytes = arrayify(randomBytes);
    // Section: 4.1.3:
    // - time_hi_and_version[12:16] = 0b0100
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Section 4.4
    // - clock_seq_hi_and_reserved[6] = 0b0
    // - clock_seq_hi_and_reserved[7] = 0b1
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = hexlify(bytes);
    return [
        value.substring(2, 10),
        value.substring(10, 14),
        value.substring(14, 18),
        value.substring(18, 22),
        value.substring(22, 34),
    ].join("-");
}

const logger$6 = new Logger(version$6);
class CrowdsaleAccount extends Description {
    isCrowdsaleAccount(value) {
        return !!(value && value._isCrowdsaleAccount);
    }
}
// See: https://github.com/ethereum/pyethsaletool
function decrypt$1(json, password) {
    const data = JSON.parse(json);
    password = getPassword(password);
    // Ethereum Address
    const ethaddr = getAddress(searchPath(data, "ethaddr"));
    // Encrypted Seed
    const encseed = looseArrayify(searchPath(data, "encseed"));
    if (!encseed || (encseed.length % 16) !== 0) {
        logger$6.throwArgumentError("invalid encseed", "json", json);
    }
    const key = arrayify(pbkdf2$1(password, password, 2000, 32, "sha256")).slice(0, 16);
    const iv = encseed.slice(0, 16);
    const encryptedSeed = encseed.slice(16);
    // Decrypt the seed
    const aesCbc = new aes.ModeOfOperation.cbc(key, iv);
    const seed = aes.padding.pkcs7.strip(arrayify(aesCbc.decrypt(encryptedSeed)));
    // This wallet format is weird... Convert the binary encoded hex to a string.
    let seedHex = "";
    for (let i = 0; i < seed.length; i++) {
        seedHex += String.fromCharCode(seed[i]);
    }
    const seedHexBytes = toUtf8Bytes(seedHex);
    const privateKey = keccak256$1(seedHexBytes);
    return new CrowdsaleAccount({
        _isCrowdsaleAccount: true,
        address: ethaddr,
        privateKey: privateKey
    });
}

function isCrowdsaleWallet(json) {
    let data = null;
    try {
        data = JSON.parse(json);
    }
    catch (error) {
        return false;
    }
    return (data.encseed && data.ethaddr);
}
function isKeystoreWallet(json) {
    let data = null;
    try {
        data = JSON.parse(json);
    }
    catch (error) {
        return false;
    }
    if (!data.version || parseInt(data.version) !== data.version || parseInt(data.version) !== 3) {
        return false;
    }
    // @TODO: Put more checks to make sure it has kdf, iv and all that good stuff
    return true;
}
//export function isJsonWallet(json: string): boolean {
//    return (isSecretStorageWallet(json) || isCrowdsaleWallet(json));
//}
function getJsonWalletAddress(json) {
    if (isCrowdsaleWallet(json)) {
        try {
            return getAddress(JSON.parse(json).ethaddr);
        }
        catch (error) {
            return null;
        }
    }
    if (isKeystoreWallet(json)) {
        try {
            return getAddress(JSON.parse(json).address);
        }
        catch (error) {
            return null;
        }
    }
    return null;
}

var scrypt$1 = {exports: {}};

(function (module, exports) {

(function(root) {
    const MAX_VALUE = 0x7fffffff;

    // The SHA256 and PBKDF2 implementation are from scrypt-async-js:
    // See: https://github.com/dchest/scrypt-async-js
    function SHA256(m) {
        const K = new Uint32Array([
           0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
           0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
           0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
           0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
           0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
           0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
           0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
           0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
           0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
           0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
           0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
           0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
           0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
       ]);

        let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        const w = new Uint32Array(64);

        function blocks(p) {
            let off = 0, len = p.length;
            while (len >= 64) {
                let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i, j, t1, t2;

                for (i = 0; i < 16; i++) {
                    j = off + i*4;
                    w[i] = ((p[j] & 0xff)<<24) | ((p[j+1] & 0xff)<<16) |
                    ((p[j+2] & 0xff)<<8) | (p[j+3] & 0xff);
                }

                for (i = 16; i < 64; i++) {
                    u = w[i-2];
                    t1 = ((u>>>17) | (u<<(32-17))) ^ ((u>>>19) | (u<<(32-19))) ^ (u>>>10);

                    u = w[i-15];
                    t2 = ((u>>>7) | (u<<(32-7))) ^ ((u>>>18) | (u<<(32-18))) ^ (u>>>3);

                    w[i] = (((t1 + w[i-7]) | 0) + ((t2 + w[i-16]) | 0)) | 0;
                }

                for (i = 0; i < 64; i++) {
                    t1 = ((((((e>>>6) | (e<<(32-6))) ^ ((e>>>11) | (e<<(32-11))) ^
                             ((e>>>25) | (e<<(32-25)))) + ((e & f) ^ (~e & g))) | 0) +
                          ((h + ((K[i] + w[i]) | 0)) | 0)) | 0;

                    t2 = ((((a>>>2) | (a<<(32-2))) ^ ((a>>>13) | (a<<(32-13))) ^
                           ((a>>>22) | (a<<(32-22)))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

                    h = g;
                    g = f;
                    f = e;
                    e = (d + t1) | 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (t1 + t2) | 0;
                }

                h0 = (h0 + a) | 0;
                h1 = (h1 + b) | 0;
                h2 = (h2 + c) | 0;
                h3 = (h3 + d) | 0;
                h4 = (h4 + e) | 0;
                h5 = (h5 + f) | 0;
                h6 = (h6 + g) | 0;
                h7 = (h7 + h) | 0;

                off += 64;
                len -= 64;
            }
        }

        blocks(m);

        let i, bytesLeft = m.length % 64,
        bitLenHi = (m.length / 0x20000000) | 0,
        bitLenLo = m.length << 3,
        numZeros = (bytesLeft < 56) ? 56 : 120,
        p = m.slice(m.length - bytesLeft, m.length);

        p.push(0x80);
        for (i = bytesLeft + 1; i < numZeros; i++) { p.push(0); }
        p.push((bitLenHi >>> 24) & 0xff);
        p.push((bitLenHi >>> 16) & 0xff);
        p.push((bitLenHi >>> 8)  & 0xff);
        p.push((bitLenHi >>> 0)  & 0xff);
        p.push((bitLenLo >>> 24) & 0xff);
        p.push((bitLenLo >>> 16) & 0xff);
        p.push((bitLenLo >>> 8)  & 0xff);
        p.push((bitLenLo >>> 0)  & 0xff);

        blocks(p);

        return [
            (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, (h0 >>> 0) & 0xff,
            (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, (h1 >>> 0) & 0xff,
            (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, (h2 >>> 0) & 0xff,
            (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, (h3 >>> 0) & 0xff,
            (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, (h4 >>> 0) & 0xff,
            (h5 >>> 24) & 0xff, (h5 >>> 16) & 0xff, (h5 >>> 8) & 0xff, (h5 >>> 0) & 0xff,
            (h6 >>> 24) & 0xff, (h6 >>> 16) & 0xff, (h6 >>> 8) & 0xff, (h6 >>> 0) & 0xff,
            (h7 >>> 24) & 0xff, (h7 >>> 16) & 0xff, (h7 >>> 8) & 0xff, (h7 >>> 0) & 0xff
        ];
    }

    function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
        // compress password if it's longer than hash block length
        password = (password.length <= 64) ? password : SHA256(password);

        const innerLen = 64 + salt.length + 4;
        const inner = new Array(innerLen);
        const outerKey = new Array(64);

        let i;
        let dk = [];

        // inner = (password ^ ipad) || salt || counter
        for (i = 0; i < 64; i++) { inner[i] = 0x36; }
        for (i = 0; i < password.length; i++) { inner[i] ^= password[i]; }
        for (i = 0; i < salt.length; i++) { inner[64 + i] = salt[i]; }
        for (i = innerLen - 4; i < innerLen; i++) { inner[i] = 0; }

        // outerKey = password ^ opad
        for (i = 0; i < 64; i++) outerKey[i] = 0x5c;
        for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];

        // increments counter inside inner
        function incrementCounter() {
            for (let i = innerLen - 1; i >= innerLen - 4; i--) {
                inner[i]++;
                if (inner[i] <= 0xff) return;
                inner[i] = 0;
            }
        }

        // output blocks = SHA256(outerKey || SHA256(inner)) ...
        while (dkLen >= 32) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
            dkLen -= 32;
        }
        if (dkLen > 0) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
        }

        return dk;
    }

    // The following is an adaptation of scryptsy
    // See: https://www.npmjs.com/package/scryptsy
    function blockmix_salsa8(BY, Yi, r, x, _X) {
        let i;

        arraycopy(BY, (2 * r - 1) * 16, _X, 0, 16);
        for (i = 0; i < 2 * r; i++) {
            blockxor(BY, i * 16, _X, 16);
            salsa20_8(_X, x);
            arraycopy(_X, 0, BY, Yi + (i * 16), 16);
        }

        for (i = 0; i < r; i++) {
            arraycopy(BY, Yi + (i * 2) * 16, BY, (i * 16), 16);
        }

        for (i = 0; i < r; i++) {
            arraycopy(BY, Yi + (i * 2 + 1) * 16, BY, (i + r) * 16, 16);
        }
    }

    function R(a, b) {
        return (a << b) | (a >>> (32 - b));
    }

    function salsa20_8(B, x) {
        arraycopy(B, 0, x, 0, 16);

        for (let i = 8; i > 0; i -= 2) {
            x[ 4] ^= R(x[ 0] + x[12], 7);
            x[ 8] ^= R(x[ 4] + x[ 0], 9);
            x[12] ^= R(x[ 8] + x[ 4], 13);
            x[ 0] ^= R(x[12] + x[ 8], 18);
            x[ 9] ^= R(x[ 5] + x[ 1], 7);
            x[13] ^= R(x[ 9] + x[ 5], 9);
            x[ 1] ^= R(x[13] + x[ 9], 13);
            x[ 5] ^= R(x[ 1] + x[13], 18);
            x[14] ^= R(x[10] + x[ 6], 7);
            x[ 2] ^= R(x[14] + x[10], 9);
            x[ 6] ^= R(x[ 2] + x[14], 13);
            x[10] ^= R(x[ 6] + x[ 2], 18);
            x[ 3] ^= R(x[15] + x[11], 7);
            x[ 7] ^= R(x[ 3] + x[15], 9);
            x[11] ^= R(x[ 7] + x[ 3], 13);
            x[15] ^= R(x[11] + x[ 7], 18);
            x[ 1] ^= R(x[ 0] + x[ 3], 7);
            x[ 2] ^= R(x[ 1] + x[ 0], 9);
            x[ 3] ^= R(x[ 2] + x[ 1], 13);
            x[ 0] ^= R(x[ 3] + x[ 2], 18);
            x[ 6] ^= R(x[ 5] + x[ 4], 7);
            x[ 7] ^= R(x[ 6] + x[ 5], 9);
            x[ 4] ^= R(x[ 7] + x[ 6], 13);
            x[ 5] ^= R(x[ 4] + x[ 7], 18);
            x[11] ^= R(x[10] + x[ 9], 7);
            x[ 8] ^= R(x[11] + x[10], 9);
            x[ 9] ^= R(x[ 8] + x[11], 13);
            x[10] ^= R(x[ 9] + x[ 8], 18);
            x[12] ^= R(x[15] + x[14], 7);
            x[13] ^= R(x[12] + x[15], 9);
            x[14] ^= R(x[13] + x[12], 13);
            x[15] ^= R(x[14] + x[13], 18);
        }

        for (let i = 0; i < 16; ++i) {
            B[i] += x[i];
        }
    }

    // naive approach... going back to loop unrolling may yield additional performance
    function blockxor(S, Si, D, len) {
        for (let i = 0; i < len; i++) {
            D[i] ^= S[Si + i];
        }
    }

    function arraycopy(src, srcPos, dest, destPos, length) {
        while (length--) {
            dest[destPos++] = src[srcPos++];
        }
    }

    function checkBufferish(o) {
        if (!o || typeof(o.length) !== 'number') { return false; }

        for (let i = 0; i < o.length; i++) {
            const v = o[i];
            if (typeof(v) !== 'number' || v % 1 || v < 0 || v >= 256) {
                return false;
            }
        }

        return true;
    }

    function ensureInteger(value, name) {
        if (typeof(value) !== "number" || (value % 1)) { throw new Error('invalid ' + name); }
        return value;
    }

    // N = Cpu cost, r = Memory cost, p = parallelization cost
    // callback(error, progress, key)
    function _scrypt(password, salt, N, r, p, dkLen, callback) {

        N = ensureInteger(N, 'N');
        r = ensureInteger(r, 'r');
        p = ensureInteger(p, 'p');

        dkLen = ensureInteger(dkLen, 'dkLen');

        if (N === 0 || (N & (N - 1)) !== 0) { throw new Error('N must be power of 2'); }

        if (N > MAX_VALUE / 128 / r) { throw new Error('N too large'); }
        if (r > MAX_VALUE / 128 / p) { throw new Error('r too large'); }

        if (!checkBufferish(password)) {
            throw new Error('password must be an array or buffer');
        }
        password = Array.prototype.slice.call(password);

        if (!checkBufferish(salt)) {
            throw new Error('salt must be an array or buffer');
        }
        salt = Array.prototype.slice.call(salt);

        let b = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
        const B = new Uint32Array(p * 32 * r);
        for (let i = 0; i < B.length; i++) {
            const j = i * 4;
            B[i] = ((b[j + 3] & 0xff) << 24) |
                   ((b[j + 2] & 0xff) << 16) |
                   ((b[j + 1] & 0xff) << 8) |
                   ((b[j + 0] & 0xff) << 0);
        }

        const XY = new Uint32Array(64 * r);
        const V = new Uint32Array(32 * r * N);

        const Yi = 32 * r;

        // scratch space
        const x = new Uint32Array(16);       // salsa20_8
        const _X = new Uint32Array(16);      // blockmix_salsa8

        const totalOps = p * N * 2;
        let currentOp = 0;
        let lastPercent10 = null;

        // Set this to true to abandon the scrypt on the next step
        let stop = false;

        // State information
        let state = 0;
        let i0 = 0, i1;
        let Bi;

        // How many blockmix_salsa8 can we do per step?
        const limit = callback ? parseInt(1000 / r): 0xffffffff;

        // Trick from scrypt-async; if there is a setImmediate shim in place, use it
        const nextTick = (typeof(setImmediate) !== 'undefined') ? setImmediate : setTimeout;

        // This is really all I changed; making scryptsy a state machine so we occasionally
        // stop and give other evnts on the evnt loop a chance to run. ~RicMoo
        const incrementalSMix = function() {
            if (stop) {
                return callback(new Error('cancelled'), currentOp / totalOps);
            }

            let steps;

            switch (state) {
                case 0:
                    // for (var i = 0; i < p; i++)...
                    Bi = i0 * 32 * r;

                    arraycopy(B, Bi, XY, 0, Yi);                       // ROMix - 1

                    state = 1;                                         // Move to ROMix 2
                    i1 = 0;

                    // Fall through

                case 1:

                    // Run up to 1000 steps of the first inner smix loop
                    steps = N - i1;
                    if (steps > limit) { steps = limit; }
                    for (let i = 0; i < steps; i++) {                  // ROMix - 2
                        arraycopy(XY, 0, V, (i1 + i) * Yi, Yi);         // ROMix - 3
                        blockmix_salsa8(XY, Yi, r, x, _X);             // ROMix - 4
                    }

                    // for (var i = 0; i < N; i++)
                    i1 += steps;
                    currentOp += steps;

                    if (callback) {
                        // Call the callback with the progress (optionally stopping us)
                        const percent10 = parseInt(1000 * currentOp / totalOps);
                        if (percent10 !== lastPercent10) {
                            stop = callback(null, currentOp / totalOps);
                            if (stop) { break; }
                            lastPercent10 = percent10;
                        }
                    }

                    if (i1 < N) { break; }

                    i1 = 0;                                          // Move to ROMix 6
                    state = 2;

                    // Fall through

                case 2:

                    // Run up to 1000 steps of the second inner smix loop
                    steps = N - i1;
                    if (steps > limit) { steps = limit; }
                    for (let i = 0; i < steps; i++) {                // ROMix - 6
                        const offset = (2 * r - 1) * 16;             // ROMix - 7
                        const j = XY[offset] & (N - 1);
                        blockxor(V, j * Yi, XY, Yi);                 // ROMix - 8 (inner)
                        blockmix_salsa8(XY, Yi, r, x, _X);           // ROMix - 9 (outer)
                    }

                    // for (var i = 0; i < N; i++)...
                    i1 += steps;
                    currentOp += steps;

                    // Call the callback with the progress (optionally stopping us)
                    if (callback) {
                        const percent10 = parseInt(1000 * currentOp / totalOps);
                        if (percent10 !== lastPercent10) {
                            stop = callback(null, currentOp / totalOps);
                            if (stop) { break; }
                            lastPercent10 = percent10;
                        }
                    }

                    if (i1 < N) { break; }

                    arraycopy(XY, 0, B, Bi, Yi);                     // ROMix - 10

                    // for (var i = 0; i < p; i++)...
                    i0++;
                    if (i0 < p) {
                        state = 0;
                        break;
                    }

                    b = [];
                    for (let i = 0; i < B.length; i++) {
                        b.push((B[i] >>  0) & 0xff);
                        b.push((B[i] >>  8) & 0xff);
                        b.push((B[i] >> 16) & 0xff);
                        b.push((B[i] >> 24) & 0xff);
                    }

                    const derivedKey = PBKDF2_HMAC_SHA256_OneIter(password, b, dkLen);

                    // Send the result to the callback
                    if (callback) { callback(null, 1.0, derivedKey); }

                    // Done; don't break (which would reschedule)
                    return derivedKey;
            }

            // Schedule the next steps
            if (callback) { nextTick(incrementalSMix); }
        };

        // Run the smix state machine until completion
        if (!callback) {
            while (true) {
                const derivedKey = incrementalSMix();
                if (derivedKey != undefined) { return derivedKey; }
            }
        }

        // Bootstrap the async incremental smix
        incrementalSMix();
    }

    const lib = {
        scrypt: function(password, salt, N, r, p, dkLen, progressCallback) {
            return new Promise(function(resolve, reject) {
                let lastProgress = 0;
                if (progressCallback) { progressCallback(0); }
                _scrypt(password, salt, N, r, p, dkLen, function(error, progress, key) {
                    if (error) {
                        reject(error);
                    } else if (key) {
                        if (progressCallback && lastProgress !== 1) {
                            progressCallback(1);
                        }
                        resolve(new Uint8Array(key));
                    } else if (progressCallback && progress !== lastProgress) {
                        lastProgress = progress;
                        return progressCallback(progress);
                    }
                });
            });
        },
        syncScrypt: function(password, salt, N, r, p, dkLen) {
            return new Uint8Array(_scrypt(password, salt, N, r, p, dkLen));
        }
    };

    // node.js
    {
       module.exports = lib;

    // RequireJS/AMD
    // http://www.requirejs.org/docs/api.html
    // https://github.com/amdjs/amdjs-api/wiki/AMD
    }

})();
}(scrypt$1));

var scrypt = scrypt$1.exports;

const version$5 = "random/5.6.1";

const logger$5 = new Logger(version$5);
// Debugging line for testing browser lib in node
//const window = { crypto: { getRandomValues: () => { } } };
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis
function getGlobal() {
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    throw new Error('unable to locate global object');
}
const anyGlobal = getGlobal();
let crypto = anyGlobal.crypto || anyGlobal.msCrypto;
if (!crypto || !crypto.getRandomValues) {
    logger$5.warn("WARNING: Missing strong random number source");
    crypto = {
        getRandomValues: function (buffer) {
            return logger$5.throwError("no secure random source avaialble", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "crypto.getRandomValues"
            });
        }
    };
}
function randomBytes(length) {
    if (length <= 0 || length > 1024 || (length % 1) || length != length) {
        logger$5.throwArgumentError("invalid length", "length", length);
    }
    const result = new Uint8Array(length);
    crypto.getRandomValues(result);
    return arrayify(result);
}

function shuffled(array) {
    array = array.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

var lib_esm$4 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    randomBytes: randomBytes,
    shuffled: shuffled
});

var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger$4 = new Logger(version$6);
// Exported Types
function hasMnemonic$1(value) {
    return (value != null && value.mnemonic && value.mnemonic.phrase);
}
class KeystoreAccount extends Description {
    isKeystoreAccount(value) {
        return !!(value && value._isKeystoreAccount);
    }
}
function _decrypt(data, key, ciphertext) {
    const cipher = searchPath(data, "crypto/cipher");
    if (cipher === "aes-128-ctr") {
        const iv = looseArrayify(searchPath(data, "crypto/cipherparams/iv"));
        const counter = new aes.Counter(iv);
        const aesCtr = new aes.ModeOfOperation.ctr(key, counter);
        return arrayify(aesCtr.decrypt(ciphertext));
    }
    return null;
}
function _getAccount(data, key) {
    const ciphertext = looseArrayify(searchPath(data, "crypto/ciphertext"));
    const computedMAC = hexlify(keccak256$1(concat([key.slice(16, 32), ciphertext]))).substring(2);
    if (computedMAC !== searchPath(data, "crypto/mac").toLowerCase()) {
        throw new Error("invalid password");
    }
    const privateKey = _decrypt(data, key.slice(0, 16), ciphertext);
    if (!privateKey) {
        logger$4.throwError("unsupported cipher", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "decrypt"
        });
    }
    const mnemonicKey = key.slice(32, 64);
    const address = computeAddress(privateKey);
    if (data.address) {
        let check = data.address.toLowerCase();
        if (check.substring(0, 2) !== "0x") {
            check = "0x" + check;
        }
        if (getAddress(check) !== address) {
            throw new Error("address mismatch");
        }
    }
    const account = {
        _isKeystoreAccount: true,
        address: address,
        privateKey: hexlify(privateKey)
    };
    // Version 0.1 x-ethers metadata must contain an encrypted mnemonic phrase
    if (searchPath(data, "x-ethers/version") === "0.1") {
        const mnemonicCiphertext = looseArrayify(searchPath(data, "x-ethers/mnemonicCiphertext"));
        const mnemonicIv = looseArrayify(searchPath(data, "x-ethers/mnemonicCounter"));
        const mnemonicCounter = new aes.Counter(mnemonicIv);
        const mnemonicAesCtr = new aes.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
        const path = searchPath(data, "x-ethers/path") || defaultPath;
        const locale = searchPath(data, "x-ethers/locale") || "en";
        const entropy = arrayify(mnemonicAesCtr.decrypt(mnemonicCiphertext));
        try {
            const mnemonic = entropyToMnemonic(entropy, locale);
            const node = HDNode.fromMnemonic(mnemonic, null, locale).derivePath(path);
            if (node.privateKey != account.privateKey) {
                throw new Error("mnemonic mismatch");
            }
            account.mnemonic = node.mnemonic;
        }
        catch (error) {
            // If we don't have the locale wordlist installed to
            // read this mnemonic, just bail and don't set the
            // mnemonic
            if (error.code !== Logger.errors.INVALID_ARGUMENT || error.argument !== "wordlist") {
                throw error;
            }
        }
    }
    return new KeystoreAccount(account);
}
function pbkdf2Sync(passwordBytes, salt, count, dkLen, prfFunc) {
    return arrayify(pbkdf2$1(passwordBytes, salt, count, dkLen, prfFunc));
}
function pbkdf2(passwordBytes, salt, count, dkLen, prfFunc) {
    return Promise.resolve(pbkdf2Sync(passwordBytes, salt, count, dkLen, prfFunc));
}
function _computeKdfKey(data, password, pbkdf2Func, scryptFunc, progressCallback) {
    const passwordBytes = getPassword(password);
    const kdf = searchPath(data, "crypto/kdf");
    if (kdf && typeof (kdf) === "string") {
        const throwError = function (name, value) {
            return logger$4.throwArgumentError("invalid key-derivation function parameters", name, value);
        };
        if (kdf.toLowerCase() === "scrypt") {
            const salt = looseArrayify(searchPath(data, "crypto/kdfparams/salt"));
            const N = parseInt(searchPath(data, "crypto/kdfparams/n"));
            const r = parseInt(searchPath(data, "crypto/kdfparams/r"));
            const p = parseInt(searchPath(data, "crypto/kdfparams/p"));
            // Check for all required parameters
            if (!N || !r || !p) {
                throwError("kdf", kdf);
            }
            // Make sure N is a power of 2
            if ((N & (N - 1)) !== 0) {
                throwError("N", N);
            }
            const dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
            if (dkLen !== 32) {
                throwError("dklen", dkLen);
            }
            return scryptFunc(passwordBytes, salt, N, r, p, 64, progressCallback);
        }
        else if (kdf.toLowerCase() === "pbkdf2") {
            const salt = looseArrayify(searchPath(data, "crypto/kdfparams/salt"));
            let prfFunc = null;
            const prf = searchPath(data, "crypto/kdfparams/prf");
            if (prf === "hmac-sha256") {
                prfFunc = "sha256";
            }
            else if (prf === "hmac-sha512") {
                prfFunc = "sha512";
            }
            else {
                throwError("prf", prf);
            }
            const count = parseInt(searchPath(data, "crypto/kdfparams/c"));
            const dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
            if (dkLen !== 32) {
                throwError("dklen", dkLen);
            }
            return pbkdf2Func(passwordBytes, salt, count, dkLen, prfFunc);
        }
    }
    return logger$4.throwArgumentError("unsupported key-derivation function", "kdf", kdf);
}
function decryptSync(json, password) {
    const data = JSON.parse(json);
    const key = _computeKdfKey(data, password, pbkdf2Sync, scrypt.syncScrypt);
    return _getAccount(data, key);
}
function decrypt(json, password, progressCallback) {
    return __awaiter$4(this, void 0, void 0, function* () {
        const data = JSON.parse(json);
        const key = yield _computeKdfKey(data, password, pbkdf2, scrypt.scrypt, progressCallback);
        return _getAccount(data, key);
    });
}
function encrypt(account, password, options, progressCallback) {
    try {
        // Check the address matches the private key
        if (getAddress(account.address) !== computeAddress(account.privateKey)) {
            throw new Error("address/privateKey mismatch");
        }
        // Check the mnemonic (if any) matches the private key
        if (hasMnemonic$1(account)) {
            const mnemonic = account.mnemonic;
            const node = HDNode.fromMnemonic(mnemonic.phrase, null, mnemonic.locale).derivePath(mnemonic.path || defaultPath);
            if (node.privateKey != account.privateKey) {
                throw new Error("mnemonic mismatch");
            }
        }
    }
    catch (e) {
        return Promise.reject(e);
    }
    // The options are optional, so adjust the call as needed
    if (typeof (options) === "function" && !progressCallback) {
        progressCallback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    const privateKey = arrayify(account.privateKey);
    const passwordBytes = getPassword(password);
    let entropy = null;
    let path = null;
    let locale = null;
    if (hasMnemonic$1(account)) {
        const srcMnemonic = account.mnemonic;
        entropy = arrayify(mnemonicToEntropy(srcMnemonic.phrase, srcMnemonic.locale || "en"));
        path = srcMnemonic.path || defaultPath;
        locale = srcMnemonic.locale || "en";
    }
    let client = options.client;
    if (!client) {
        client = "ethers.js";
    }
    // Check/generate the salt
    let salt = null;
    if (options.salt) {
        salt = arrayify(options.salt);
    }
    else {
        salt = randomBytes(32);
    }
    // Override initialization vector
    let iv = null;
    if (options.iv) {
        iv = arrayify(options.iv);
        if (iv.length !== 16) {
            throw new Error("invalid iv");
        }
    }
    else {
        iv = randomBytes(16);
    }
    // Override the uuid
    let uuidRandom = null;
    if (options.uuid) {
        uuidRandom = arrayify(options.uuid);
        if (uuidRandom.length !== 16) {
            throw new Error("invalid uuid");
        }
    }
    else {
        uuidRandom = randomBytes(16);
    }
    // Override the scrypt password-based key derivation function parameters
    let N = (1 << 17), r = 8, p = 1;
    if (options.scrypt) {
        if (options.scrypt.N) {
            N = options.scrypt.N;
        }
        if (options.scrypt.r) {
            r = options.scrypt.r;
        }
        if (options.scrypt.p) {
            p = options.scrypt.p;
        }
    }
    // We take 64 bytes:
    //   - 32 bytes   As normal for the Web3 secret storage (derivedKey, macPrefix)
    //   - 32 bytes   AES key to encrypt mnemonic with (required here to be Ethers Wallet)
    return scrypt.scrypt(passwordBytes, salt, N, r, p, 64, progressCallback).then((key) => {
        key = arrayify(key);
        // This will be used to encrypt the wallet (as per Web3 secret storage)
        const derivedKey = key.slice(0, 16);
        const macPrefix = key.slice(16, 32);
        // This will be used to encrypt the mnemonic phrase (if any)
        const mnemonicKey = key.slice(32, 64);
        // Encrypt the private key
        const counter = new aes.Counter(iv);
        const aesCtr = new aes.ModeOfOperation.ctr(derivedKey, counter);
        const ciphertext = arrayify(aesCtr.encrypt(privateKey));
        // Compute the message authentication code, used to check the password
        const mac = keccak256$1(concat([macPrefix, ciphertext]));
        // See: https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
        const data = {
            address: account.address.substring(2).toLowerCase(),
            id: uuidV4(uuidRandom),
            version: 3,
            Crypto: {
                cipher: "aes-128-ctr",
                cipherparams: {
                    iv: hexlify(iv).substring(2),
                },
                ciphertext: hexlify(ciphertext).substring(2),
                kdf: "scrypt",
                kdfparams: {
                    salt: hexlify(salt).substring(2),
                    n: N,
                    dklen: 32,
                    p: p,
                    r: r
                },
                mac: mac.substring(2)
            }
        };
        // If we have a mnemonic, encrypt it into the JSON wallet
        if (entropy) {
            const mnemonicIv = randomBytes(16);
            const mnemonicCounter = new aes.Counter(mnemonicIv);
            const mnemonicAesCtr = new aes.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
            const mnemonicCiphertext = arrayify(mnemonicAesCtr.encrypt(entropy));
            const now = new Date();
            const timestamp = (now.getUTCFullYear() + "-" +
                zpad(now.getUTCMonth() + 1, 2) + "-" +
                zpad(now.getUTCDate(), 2) + "T" +
                zpad(now.getUTCHours(), 2) + "-" +
                zpad(now.getUTCMinutes(), 2) + "-" +
                zpad(now.getUTCSeconds(), 2) + ".0Z");
            data["x-ethers"] = {
                client: client,
                gethFilename: ("UTC--" + timestamp + "--" + data.address),
                mnemonicCounter: hexlify(mnemonicIv).substring(2),
                mnemonicCiphertext: hexlify(mnemonicCiphertext).substring(2),
                path: path,
                locale: locale,
                version: "0.1"
            };
        }
        return JSON.stringify(data);
    });
}

function decryptJsonWallet(json, password, progressCallback) {
    if (isCrowdsaleWallet(json)) {
        if (progressCallback) {
            progressCallback(0);
        }
        const account = decrypt$1(json, password);
        if (progressCallback) {
            progressCallback(1);
        }
        return Promise.resolve(account);
    }
    if (isKeystoreWallet(json)) {
        return decrypt(json, password, progressCallback);
    }
    return Promise.reject(new Error("invalid JSON wallet"));
}
function decryptJsonWalletSync(json, password) {
    if (isCrowdsaleWallet(json)) {
        return decrypt$1(json, password);
    }
    if (isKeystoreWallet(json)) {
        return decryptSync(json, password);
    }
    throw new Error("invalid JSON wallet");
}

var lib_esm$3 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    decryptCrowdsale: decrypt$1,
    decryptKeystore: decrypt,
    decryptKeystoreSync: decryptSync,
    encryptKeystore: encrypt,
    isCrowdsaleWallet: isCrowdsaleWallet,
    isKeystoreWallet: isKeystoreWallet,
    getJsonWalletAddress: getJsonWalletAddress,
    decryptJsonWallet: decryptJsonWallet,
    decryptJsonWalletSync: decryptJsonWalletSync
});

var require$$7 = /*@__PURE__*/getAugmentedNamespace(lib_esm$3);

var require$$8 = /*@__PURE__*/getAugmentedNamespace(lib_esm$c);

var require$$9 = /*@__PURE__*/getAugmentedNamespace(lib_esm$h);

var require$$10 = /*@__PURE__*/getAugmentedNamespace(lib_esm$9);

const version$4 = "solidity/5.6.1";

const regexBytes = new RegExp("^bytes([0-9]+)$");
const regexNumber = new RegExp("^(u?int)([0-9]*)$");
const regexArray = new RegExp("^(.*)\\[([0-9]*)\\]$");
const Zeros = "0000000000000000000000000000000000000000000000000000000000000000";
const logger$3 = new Logger(version$4);
function _pack(type, value, isArray) {
    switch (type) {
        case "address":
            if (isArray) {
                return zeroPad(value, 32);
            }
            return arrayify(value);
        case "string":
            return toUtf8Bytes(value);
        case "bytes":
            return arrayify(value);
        case "bool":
            value = (value ? "0x01" : "0x00");
            if (isArray) {
                return zeroPad(value, 32);
            }
            return arrayify(value);
    }
    let match = type.match(regexNumber);
    if (match) {
        //let signed = (match[1] === "int")
        let size = parseInt(match[2] || "256");
        if ((match[2] && String(size) !== match[2]) || (size % 8 !== 0) || size === 0 || size > 256) {
            logger$3.throwArgumentError("invalid number type", "type", type);
        }
        if (isArray) {
            size = 256;
        }
        value = BigNumber.from(value).toTwos(size);
        return zeroPad(value, size / 8);
    }
    match = type.match(regexBytes);
    if (match) {
        const size = parseInt(match[1]);
        if (String(size) !== match[1] || size === 0 || size > 32) {
            logger$3.throwArgumentError("invalid bytes type", "type", type);
        }
        if (arrayify(value).byteLength !== size) {
            logger$3.throwArgumentError(`invalid value for ${type}`, "value", value);
        }
        if (isArray) {
            return arrayify((value + Zeros).substring(0, 66));
        }
        return value;
    }
    match = type.match(regexArray);
    if (match && Array.isArray(value)) {
        const baseType = match[1];
        const count = parseInt(match[2] || String(value.length));
        if (count != value.length) {
            logger$3.throwArgumentError(`invalid array length for ${type}`, "value", value);
        }
        const result = [];
        value.forEach(function (value) {
            result.push(_pack(baseType, value, true));
        });
        return concat(result);
    }
    return logger$3.throwArgumentError("invalid type", "type", type);
}
// @TODO: Array Enum
function pack(types, values) {
    if (types.length != values.length) {
        logger$3.throwArgumentError("wrong number of values; expected ${ types.length }", "values", values);
    }
    const tight = [];
    types.forEach(function (type, index) {
        tight.push(_pack(type, values[index]));
    });
    return hexlify(concat(tight));
}
function keccak256(types, values) {
    return keccak256$1(pack(types, values));
}
function sha256(types, values) {
    return sha256$1(pack(types, values));
}

var lib_esm$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    pack: pack,
    keccak256: keccak256,
    sha256: sha256
});

var require$$11 = /*@__PURE__*/getAugmentedNamespace(lib_esm$2);

var require$$12 = /*@__PURE__*/getAugmentedNamespace(lib_esm$4);

var require$$13 = /*@__PURE__*/getAugmentedNamespace(lib_esm$e);

var require$$14 = /*@__PURE__*/getAugmentedNamespace(lib_esm$7);

var require$$15 = /*@__PURE__*/getAugmentedNamespace(lib_esm$8);

var require$$16 = /*@__PURE__*/getAugmentedNamespace(lib_esm$b);

var require$$17 = /*@__PURE__*/getAugmentedNamespace(lib_esm$6);

var require$$18 = /*@__PURE__*/getAugmentedNamespace(lib_esm$g);

const version$3 = "abstract-provider/5.6.1";

var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger$2 = new Logger(version$3);
///////////////////////////////
// Exported Abstracts
class Provider {
    constructor() {
        logger$2.checkAbstract(new.target, Provider);
        defineReadOnly(this, "_isProvider", true);
    }
    getFeeData() {
        return __awaiter$3(this, void 0, void 0, function* () {
            const { block, gasPrice } = yield resolveProperties({
                block: this.getBlock("latest"),
                gasPrice: this.getGasPrice().catch((error) => {
                    // @TODO: Why is this now failing on Calaveras?
                    //console.log(error);
                    return null;
                })
            });
            let maxFeePerGas = null, maxPriorityFeePerGas = null;
            if (block && block.baseFeePerGas) {
                // We may want to compute this more accurately in the future,
                // using the formula "check if the base fee is correct".
                // See: https://eips.ethereum.org/EIPS/eip-1559
                maxPriorityFeePerGas = BigNumber.from("1500000000");
                maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
            }
            return { maxFeePerGas, maxPriorityFeePerGas, gasPrice };
        });
    }
    // Alias for "on"
    addListener(eventName, listener) {
        return this.on(eventName, listener);
    }
    // Alias for "off"
    removeListener(eventName, listener) {
        return this.off(eventName, listener);
    }
    static isProvider(value) {
        return !!(value && value._isProvider);
    }
}

const version$2 = "wallet/5.6.2";

var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger$1 = new Logger(version$2);
function isAccount(value) {
    return (value != null && isHexString(value.privateKey, 32) && value.address != null);
}
function hasMnemonic(value) {
    const mnemonic = value.mnemonic;
    return (mnemonic && mnemonic.phrase);
}
class Wallet extends Signer {
    constructor(privateKey, provider) {
        super();
        if (isAccount(privateKey)) {
            const signingKey = new SigningKey(privateKey.privateKey);
            defineReadOnly(this, "_signingKey", () => signingKey);
            defineReadOnly(this, "address", computeAddress(this.publicKey));
            if (this.address !== getAddress(privateKey.address)) {
                logger$1.throwArgumentError("privateKey/address mismatch", "privateKey", "[REDACTED]");
            }
            if (hasMnemonic(privateKey)) {
                const srcMnemonic = privateKey.mnemonic;
                defineReadOnly(this, "_mnemonic", () => ({
                    phrase: srcMnemonic.phrase,
                    path: srcMnemonic.path || defaultPath,
                    locale: srcMnemonic.locale || "en"
                }));
                const mnemonic = this.mnemonic;
                const node = HDNode.fromMnemonic(mnemonic.phrase, null, mnemonic.locale).derivePath(mnemonic.path);
                if (computeAddress(node.privateKey) !== this.address) {
                    logger$1.throwArgumentError("mnemonic/address mismatch", "privateKey", "[REDACTED]");
                }
            }
            else {
                defineReadOnly(this, "_mnemonic", () => null);
            }
        }
        else {
            if (SigningKey.isSigningKey(privateKey)) {
                /* istanbul ignore if */
                if (privateKey.curve !== "secp256k1") {
                    logger$1.throwArgumentError("unsupported curve; must be secp256k1", "privateKey", "[REDACTED]");
                }
                defineReadOnly(this, "_signingKey", () => privateKey);
            }
            else {
                // A lot of common tools do not prefix private keys with a 0x (see: #1166)
                if (typeof (privateKey) === "string") {
                    if (privateKey.match(/^[0-9a-f]*$/i) && privateKey.length === 64) {
                        privateKey = "0x" + privateKey;
                    }
                }
                const signingKey = new SigningKey(privateKey);
                defineReadOnly(this, "_signingKey", () => signingKey);
            }
            defineReadOnly(this, "_mnemonic", () => null);
            defineReadOnly(this, "address", computeAddress(this.publicKey));
        }
        /* istanbul ignore if */
        if (provider && !Provider.isProvider(provider)) {
            logger$1.throwArgumentError("invalid provider", "provider", provider);
        }
        defineReadOnly(this, "provider", provider || null);
    }
    get mnemonic() { return this._mnemonic(); }
    get privateKey() { return this._signingKey().privateKey; }
    get publicKey() { return this._signingKey().publicKey; }
    getAddress() {
        return Promise.resolve(this.address);
    }
    connect(provider) {
        return new Wallet(this, provider);
    }
    signTransaction(transaction) {
        return resolveProperties(transaction).then((tx) => {
            if (tx.from != null) {
                if (getAddress(tx.from) !== this.address) {
                    logger$1.throwArgumentError("transaction from address mismatch", "transaction.from", transaction.from);
                }
                delete tx.from;
            }
            const signature = this._signingKey().signDigest(keccak256$1(serialize(tx)));
            return serialize(tx, signature);
        });
    }
    signMessage(message) {
        return __awaiter$2(this, void 0, void 0, function* () {
            return joinSignature(this._signingKey().signDigest(hashMessage(message)));
        });
    }
    _signTypedData(domain, types, value) {
        return __awaiter$2(this, void 0, void 0, function* () {
            // Populate any ENS names
            const populated = yield TypedDataEncoder.resolveNames(domain, types, value, (name) => {
                if (this.provider == null) {
                    logger$1.throwError("cannot resolve ENS names without a provider", Logger.errors.UNSUPPORTED_OPERATION, {
                        operation: "resolveName",
                        value: name
                    });
                }
                return this.provider.resolveName(name);
            });
            return joinSignature(this._signingKey().signDigest(TypedDataEncoder.hash(populated.domain, types, populated.value)));
        });
    }
    encrypt(password, options, progressCallback) {
        if (typeof (options) === "function" && !progressCallback) {
            progressCallback = options;
            options = {};
        }
        if (progressCallback && typeof (progressCallback) !== "function") {
            throw new Error("invalid callback");
        }
        if (!options) {
            options = {};
        }
        return encrypt(this, password, options, progressCallback);
    }
    /**
     *  Static methods to create Wallet instances.
     */
    static createRandom(options) {
        let entropy = randomBytes(16);
        if (!options) {
            options = {};
        }
        if (options.extraEntropy) {
            entropy = arrayify(hexDataSlice(keccak256$1(concat([entropy, options.extraEntropy])), 0, 16));
        }
        const mnemonic = entropyToMnemonic(entropy, options.locale);
        return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
    }
    static fromEncryptedJson(json, password, progressCallback) {
        return decryptJsonWallet(json, password, progressCallback).then((account) => {
            return new Wallet(account);
        });
    }
    static fromEncryptedJsonSync(json, password) {
        return new Wallet(decryptJsonWalletSync(json, password));
    }
    static fromMnemonic(mnemonic, path, wordlist) {
        if (!path) {
            path = defaultPath;
        }
        return new Wallet(HDNode.fromMnemonic(mnemonic, null, wordlist).derivePath(path));
    }
}
function verifyMessage(message, signature) {
    return recoverAddress(hashMessage(message), signature);
}
function verifyTypedData(domain, types, value, signature) {
    return recoverAddress(TypedDataEncoder.hash(domain, types, value), signature);
}

var lib_esm$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Wallet: Wallet,
    verifyMessage: verifyMessage,
    verifyTypedData: verifyTypedData
});

var require$$19 = /*@__PURE__*/getAugmentedNamespace(lib_esm$1);

const version$1 = "web/5.6.1";

var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getUrl(href, options) {
    return __awaiter$1(this, void 0, void 0, function* () {
        if (options == null) {
            options = {};
        }
        const request = {
            method: (options.method || "GET"),
            headers: (options.headers || {}),
            body: (options.body || undefined),
        };
        if (options.skipFetchSetup !== true) {
            request.mode = "cors"; // no-cors, cors, *same-origin
            request.cache = "no-cache"; // *default, no-cache, reload, force-cache, only-if-cached
            request.credentials = "same-origin"; // include, *same-origin, omit
            request.redirect = "follow"; // manual, *follow, error
            request.referrer = "client"; // no-referrer, *client
        }
        const response = yield fetch(href, request);
        const body = yield response.arrayBuffer();
        const headers = {};
        if (response.headers.forEach) {
            response.headers.forEach((value, key) => {
                headers[key.toLowerCase()] = value;
            });
        }
        else {
            ((response.headers).keys)().forEach((key) => {
                headers[key.toLowerCase()] = response.headers.get(key);
            });
        }
        return {
            headers: headers,
            statusCode: response.status,
            statusMessage: response.statusText,
            body: arrayify(new Uint8Array(body)),
        };
    });
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const logger = new Logger(version$1);
function staller(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}
function bodyify(value, type) {
    if (value == null) {
        return null;
    }
    if (typeof (value) === "string") {
        return value;
    }
    if (isBytesLike(value)) {
        if (type && (type.split("/")[0] === "text" || type.split(";")[0].trim() === "application/json")) {
            try {
                return toUtf8String(value);
            }
            catch (error) { }
        }
        return hexlify(value);
    }
    return value;
}
// This API is still a work in progress; the future changes will likely be:
// - ConnectionInfo => FetchDataRequest<T = any>
// - FetchDataRequest.body? = string | Uint8Array | { contentType: string, data: string | Uint8Array }
//   - If string => text/plain, Uint8Array => application/octet-stream (if content-type unspecified)
// - FetchDataRequest.processFunc = (body: Uint8Array, response: FetchDataResponse) => T
// For this reason, it should be considered internal until the API is finalized
function _fetchData(connection, body, processFunc) {
    // How many times to retry in the event of a throttle
    const attemptLimit = (typeof (connection) === "object" && connection.throttleLimit != null) ? connection.throttleLimit : 12;
    logger.assertArgument((attemptLimit > 0 && (attemptLimit % 1) === 0), "invalid connection throttle limit", "connection.throttleLimit", attemptLimit);
    const throttleCallback = ((typeof (connection) === "object") ? connection.throttleCallback : null);
    const throttleSlotInterval = ((typeof (connection) === "object" && typeof (connection.throttleSlotInterval) === "number") ? connection.throttleSlotInterval : 100);
    logger.assertArgument((throttleSlotInterval > 0 && (throttleSlotInterval % 1) === 0), "invalid connection throttle slot interval", "connection.throttleSlotInterval", throttleSlotInterval);
    const errorPassThrough = ((typeof (connection) === "object") ? !!(connection.errorPassThrough) : false);
    const headers = {};
    let url = null;
    // @TODO: Allow ConnectionInfo to override some of these values
    const options = {
        method: "GET",
    };
    let allow304 = false;
    let timeout = 2 * 60 * 1000;
    if (typeof (connection) === "string") {
        url = connection;
    }
    else if (typeof (connection) === "object") {
        if (connection == null || connection.url == null) {
            logger.throwArgumentError("missing URL", "connection.url", connection);
        }
        url = connection.url;
        if (typeof (connection.timeout) === "number" && connection.timeout > 0) {
            timeout = connection.timeout;
        }
        if (connection.headers) {
            for (const key in connection.headers) {
                headers[key.toLowerCase()] = { key: key, value: String(connection.headers[key]) };
                if (["if-none-match", "if-modified-since"].indexOf(key.toLowerCase()) >= 0) {
                    allow304 = true;
                }
            }
        }
        options.allowGzip = !!connection.allowGzip;
        if (connection.user != null && connection.password != null) {
            if (url.substring(0, 6) !== "https:" && connection.allowInsecureAuthentication !== true) {
                logger.throwError("basic authentication requires a secure https url", Logger.errors.INVALID_ARGUMENT, { argument: "url", url: url, user: connection.user, password: "[REDACTED]" });
            }
            const authorization = connection.user + ":" + connection.password;
            headers["authorization"] = {
                key: "Authorization",
                value: "Basic " + encode$1(toUtf8Bytes(authorization))
            };
        }
        if (connection.skipFetchSetup != null) {
            options.skipFetchSetup = !!connection.skipFetchSetup;
        }
    }
    const reData = new RegExp("^data:([a-z0-9-]+/[a-z0-9-]+);base64,(.*)$", "i");
    const dataMatch = ((url) ? url.match(reData) : null);
    if (dataMatch) {
        try {
            const response = {
                statusCode: 200,
                statusMessage: "OK",
                headers: { "content-type": dataMatch[1] },
                body: decode$1(dataMatch[2])
            };
            let result = response.body;
            if (processFunc) {
                result = processFunc(response.body, response);
            }
            return Promise.resolve(result);
        }
        catch (error) {
            logger.throwError("processing response error", Logger.errors.SERVER_ERROR, {
                body: bodyify(dataMatch[1], dataMatch[2]),
                error: error,
                requestBody: null,
                requestMethod: "GET",
                url: url
            });
        }
    }
    if (body) {
        options.method = "POST";
        options.body = body;
        if (headers["content-type"] == null) {
            headers["content-type"] = { key: "Content-Type", value: "application/octet-stream" };
        }
        if (headers["content-length"] == null) {
            headers["content-length"] = { key: "Content-Length", value: String(body.length) };
        }
    }
    const flatHeaders = {};
    Object.keys(headers).forEach((key) => {
        const header = headers[key];
        flatHeaders[header.key] = header.value;
    });
    options.headers = flatHeaders;
    const runningTimeout = (function () {
        let timer = null;
        const promise = new Promise(function (resolve, reject) {
            if (timeout) {
                timer = setTimeout(() => {
                    if (timer == null) {
                        return;
                    }
                    timer = null;
                    reject(logger.makeError("timeout", Logger.errors.TIMEOUT, {
                        requestBody: bodyify(options.body, flatHeaders["content-type"]),
                        requestMethod: options.method,
                        timeout: timeout,
                        url: url
                    }));
                }, timeout);
            }
        });
        const cancel = function () {
            if (timer == null) {
                return;
            }
            clearTimeout(timer);
            timer = null;
        };
        return { promise, cancel };
    })();
    const runningFetch = (function () {
        return __awaiter(this, void 0, void 0, function* () {
            for (let attempt = 0; attempt < attemptLimit; attempt++) {
                let response = null;
                try {
                    response = yield getUrl(url, options);
                    if (attempt < attemptLimit) {
                        if (response.statusCode === 301 || response.statusCode === 302) {
                            // Redirection; for now we only support absolute locataions
                            const location = response.headers.location || "";
                            if (options.method === "GET" && location.match(/^https:/)) {
                                url = response.headers.location;
                                continue;
                            }
                        }
                        else if (response.statusCode === 429) {
                            // Exponential back-off throttling
                            let tryAgain = true;
                            if (throttleCallback) {
                                tryAgain = yield throttleCallback(attempt, url);
                            }
                            if (tryAgain) {
                                let stall = 0;
                                const retryAfter = response.headers["retry-after"];
                                if (typeof (retryAfter) === "string" && retryAfter.match(/^[1-9][0-9]*$/)) {
                                    stall = parseInt(retryAfter) * 1000;
                                }
                                else {
                                    stall = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                                }
                                //console.log("Stalling 429");
                                yield staller(stall);
                                continue;
                            }
                        }
                    }
                }
                catch (error) {
                    response = error.response;
                    if (response == null) {
                        runningTimeout.cancel();
                        logger.throwError("missing response", Logger.errors.SERVER_ERROR, {
                            requestBody: bodyify(options.body, flatHeaders["content-type"]),
                            requestMethod: options.method,
                            serverError: error,
                            url: url
                        });
                    }
                }
                let body = response.body;
                if (allow304 && response.statusCode === 304) {
                    body = null;
                }
                else if (!errorPassThrough && (response.statusCode < 200 || response.statusCode >= 300)) {
                    runningTimeout.cancel();
                    logger.throwError("bad response", Logger.errors.SERVER_ERROR, {
                        status: response.statusCode,
                        headers: response.headers,
                        body: bodyify(body, ((response.headers) ? response.headers["content-type"] : null)),
                        requestBody: bodyify(options.body, flatHeaders["content-type"]),
                        requestMethod: options.method,
                        url: url
                    });
                }
                if (processFunc) {
                    try {
                        const result = yield processFunc(body, response);
                        runningTimeout.cancel();
                        return result;
                    }
                    catch (error) {
                        // Allow the processFunc to trigger a throttle
                        if (error.throttleRetry && attempt < attemptLimit) {
                            let tryAgain = true;
                            if (throttleCallback) {
                                tryAgain = yield throttleCallback(attempt, url);
                            }
                            if (tryAgain) {
                                const timeout = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                                //console.log("Stalling callback");
                                yield staller(timeout);
                                continue;
                            }
                        }
                        runningTimeout.cancel();
                        logger.throwError("processing response error", Logger.errors.SERVER_ERROR, {
                            body: bodyify(body, ((response.headers) ? response.headers["content-type"] : null)),
                            error: error,
                            requestBody: bodyify(options.body, flatHeaders["content-type"]),
                            requestMethod: options.method,
                            url: url
                        });
                    }
                }
                runningTimeout.cancel();
                // If we had a processFunc, it either returned a T or threw above.
                // The "body" is now a Uint8Array.
                return body;
            }
            return logger.throwError("failed response", Logger.errors.SERVER_ERROR, {
                requestBody: bodyify(options.body, flatHeaders["content-type"]),
                requestMethod: options.method,
                url: url
            });
        });
    })();
    return Promise.race([runningTimeout.promise, runningFetch]);
}
function fetchJson(connection, json, processFunc) {
    let processJsonFunc = (value, response) => {
        let result = null;
        if (value != null) {
            try {
                result = JSON.parse(toUtf8String(value));
            }
            catch (error) {
                logger.throwError("invalid JSON", Logger.errors.SERVER_ERROR, {
                    body: value,
                    error: error
                });
            }
        }
        if (processFunc) {
            result = processFunc(result, response);
        }
        return result;
    };
    // If we have json to send, we must
    // - add content-type of application/json (unless already overridden)
    // - convert the json to bytes
    let body = null;
    if (json != null) {
        body = toUtf8Bytes(json);
        // Create a connection with the content-type set for JSON
        const updated = (typeof (connection) === "string") ? ({ url: connection }) : shallowCopy(connection);
        if (updated.headers) {
            const hasContentType = (Object.keys(updated.headers).filter((k) => (k.toLowerCase() === "content-type")).length) !== 0;
            if (!hasContentType) {
                updated.headers = shallowCopy(updated.headers);
                updated.headers["content-type"] = "application/json";
            }
        }
        else {
            updated.headers = { "content-type": "application/json" };
        }
        connection = updated;
    }
    return _fetchData(connection, body, processJsonFunc);
}
function poll(func, options) {
    if (!options) {
        options = {};
    }
    options = shallowCopy(options);
    if (options.floor == null) {
        options.floor = 0;
    }
    if (options.ceiling == null) {
        options.ceiling = 10000;
    }
    if (options.interval == null) {
        options.interval = 250;
    }
    return new Promise(function (resolve, reject) {
        let timer = null;
        let done = false;
        // Returns true if cancel was successful. Unsuccessful cancel means we're already done.
        const cancel = () => {
            if (done) {
                return false;
            }
            done = true;
            if (timer) {
                clearTimeout(timer);
            }
            return true;
        };
        if (options.timeout) {
            timer = setTimeout(() => {
                if (cancel()) {
                    reject(new Error("timeout"));
                }
            }, options.timeout);
        }
        const retryLimit = options.retryLimit;
        let attempt = 0;
        function check() {
            return func().then(function (result) {
                // If we have a result, or are allowed null then we're done
                if (result !== undefined) {
                    if (cancel()) {
                        resolve(result);
                    }
                }
                else if (options.oncePoll) {
                    options.oncePoll.once("poll", check);
                }
                else if (options.onceBlock) {
                    options.onceBlock.once("block", check);
                    // Otherwise, exponential back-off (up to 10s) our next request
                }
                else if (!done) {
                    attempt++;
                    if (attempt > retryLimit) {
                        if (cancel()) {
                            reject(new Error("retry limit reached"));
                        }
                        return;
                    }
                    let timeout = options.interval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                    if (timeout < options.floor) {
                        timeout = options.floor;
                    }
                    if (timeout > options.ceiling) {
                        timeout = options.ceiling;
                    }
                    setTimeout(check, timeout);
                }
                return null;
            }, function (error) {
                if (cancel()) {
                    reject(error);
                }
            });
        }
        check();
    });
}

var lib_esm = /*#__PURE__*/Object.freeze({
    __proto__: null,
    _fetchData: _fetchData,
    fetchJson: fetchJson,
    poll: poll
});

var require$$20 = /*@__PURE__*/getAugmentedNamespace(lib_esm);

(function (exports) {
var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (commonjsGlobal && commonjsGlobal.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBytes32String = exports.Utf8ErrorFuncs = exports.toUtf8String = exports.toUtf8CodePoints = exports.toUtf8Bytes = exports._toEscapedUtf8String = exports.nameprep = exports.hexDataSlice = exports.hexDataLength = exports.hexZeroPad = exports.hexValue = exports.hexStripZeros = exports.hexConcat = exports.isHexString = exports.hexlify = exports.base64 = exports.base58 = exports.TransactionDescription = exports.LogDescription = exports.Interface = exports.SigningKey = exports.HDNode = exports.defaultPath = exports.isBytesLike = exports.isBytes = exports.zeroPad = exports.stripZeros = exports.concat = exports.arrayify = exports.shallowCopy = exports.resolveProperties = exports.getStatic = exports.defineReadOnly = exports.deepCopy = exports.checkProperties = exports.poll = exports.fetchJson = exports._fetchData = exports.RLP = exports.Logger = exports.checkResultErrors = exports.FormatTypes = exports.ParamType = exports.FunctionFragment = exports.EventFragment = exports.ErrorFragment = exports.ConstructorFragment = exports.Fragment = exports.defaultAbiCoder = exports.AbiCoder = void 0;
exports.Indexed = exports.Utf8ErrorReason = exports.UnicodeNormalizationForm = exports.SupportedAlgorithm = exports.mnemonicToSeed = exports.isValidMnemonic = exports.entropyToMnemonic = exports.mnemonicToEntropy = exports.getAccountPath = exports.verifyTypedData = exports.verifyMessage = exports.recoverPublicKey = exports.computePublicKey = exports.recoverAddress = exports.computeAddress = exports.getJsonWalletAddress = exports.TransactionTypes = exports.serializeTransaction = exports.parseTransaction = exports.accessListify = exports.joinSignature = exports.splitSignature = exports.soliditySha256 = exports.solidityKeccak256 = exports.solidityPack = exports.shuffled = exports.randomBytes = exports.sha512 = exports.sha256 = exports.ripemd160 = exports.keccak256 = exports.computeHmac = exports.commify = exports.parseUnits = exports.formatUnits = exports.parseEther = exports.formatEther = exports.isAddress = exports.getCreate2Address = exports.getContractAddress = exports.getIcapAddress = exports.getAddress = exports._TypedDataEncoder = exports.id = exports.isValidName = exports.namehash = exports.hashMessage = exports.dnsEncode = exports.parseBytes32String = void 0;
var abi_1 = require$$0$1;
Object.defineProperty(exports, "AbiCoder", { enumerable: true, get: function () { return abi_1.AbiCoder; } });
Object.defineProperty(exports, "checkResultErrors", { enumerable: true, get: function () { return abi_1.checkResultErrors; } });
Object.defineProperty(exports, "ConstructorFragment", { enumerable: true, get: function () { return abi_1.ConstructorFragment; } });
Object.defineProperty(exports, "defaultAbiCoder", { enumerable: true, get: function () { return abi_1.defaultAbiCoder; } });
Object.defineProperty(exports, "ErrorFragment", { enumerable: true, get: function () { return abi_1.ErrorFragment; } });
Object.defineProperty(exports, "EventFragment", { enumerable: true, get: function () { return abi_1.EventFragment; } });
Object.defineProperty(exports, "FormatTypes", { enumerable: true, get: function () { return abi_1.FormatTypes; } });
Object.defineProperty(exports, "Fragment", { enumerable: true, get: function () { return abi_1.Fragment; } });
Object.defineProperty(exports, "FunctionFragment", { enumerable: true, get: function () { return abi_1.FunctionFragment; } });
Object.defineProperty(exports, "Indexed", { enumerable: true, get: function () { return abi_1.Indexed; } });
Object.defineProperty(exports, "Interface", { enumerable: true, get: function () { return abi_1.Interface; } });
Object.defineProperty(exports, "LogDescription", { enumerable: true, get: function () { return abi_1.LogDescription; } });
Object.defineProperty(exports, "ParamType", { enumerable: true, get: function () { return abi_1.ParamType; } });
Object.defineProperty(exports, "TransactionDescription", { enumerable: true, get: function () { return abi_1.TransactionDescription; } });
var address_1 = require$$1;
Object.defineProperty(exports, "getAddress", { enumerable: true, get: function () { return address_1.getAddress; } });
Object.defineProperty(exports, "getCreate2Address", { enumerable: true, get: function () { return address_1.getCreate2Address; } });
Object.defineProperty(exports, "getContractAddress", { enumerable: true, get: function () { return address_1.getContractAddress; } });
Object.defineProperty(exports, "getIcapAddress", { enumerable: true, get: function () { return address_1.getIcapAddress; } });
Object.defineProperty(exports, "isAddress", { enumerable: true, get: function () { return address_1.isAddress; } });
var base64 = __importStar(require$$2);
exports.base64 = base64;
var basex_1 = require$$3;
Object.defineProperty(exports, "base58", { enumerable: true, get: function () { return basex_1.Base58; } });
var bytes_1 = require$$4;
Object.defineProperty(exports, "arrayify", { enumerable: true, get: function () { return bytes_1.arrayify; } });
Object.defineProperty(exports, "concat", { enumerable: true, get: function () { return bytes_1.concat; } });
Object.defineProperty(exports, "hexConcat", { enumerable: true, get: function () { return bytes_1.hexConcat; } });
Object.defineProperty(exports, "hexDataSlice", { enumerable: true, get: function () { return bytes_1.hexDataSlice; } });
Object.defineProperty(exports, "hexDataLength", { enumerable: true, get: function () { return bytes_1.hexDataLength; } });
Object.defineProperty(exports, "hexlify", { enumerable: true, get: function () { return bytes_1.hexlify; } });
Object.defineProperty(exports, "hexStripZeros", { enumerable: true, get: function () { return bytes_1.hexStripZeros; } });
Object.defineProperty(exports, "hexValue", { enumerable: true, get: function () { return bytes_1.hexValue; } });
Object.defineProperty(exports, "hexZeroPad", { enumerable: true, get: function () { return bytes_1.hexZeroPad; } });
Object.defineProperty(exports, "isBytes", { enumerable: true, get: function () { return bytes_1.isBytes; } });
Object.defineProperty(exports, "isBytesLike", { enumerable: true, get: function () { return bytes_1.isBytesLike; } });
Object.defineProperty(exports, "isHexString", { enumerable: true, get: function () { return bytes_1.isHexString; } });
Object.defineProperty(exports, "joinSignature", { enumerable: true, get: function () { return bytes_1.joinSignature; } });
Object.defineProperty(exports, "zeroPad", { enumerable: true, get: function () { return bytes_1.zeroPad; } });
Object.defineProperty(exports, "splitSignature", { enumerable: true, get: function () { return bytes_1.splitSignature; } });
Object.defineProperty(exports, "stripZeros", { enumerable: true, get: function () { return bytes_1.stripZeros; } });
var hash_1 = require$$5;
Object.defineProperty(exports, "_TypedDataEncoder", { enumerable: true, get: function () { return hash_1._TypedDataEncoder; } });
Object.defineProperty(exports, "dnsEncode", { enumerable: true, get: function () { return hash_1.dnsEncode; } });
Object.defineProperty(exports, "hashMessage", { enumerable: true, get: function () { return hash_1.hashMessage; } });
Object.defineProperty(exports, "id", { enumerable: true, get: function () { return hash_1.id; } });
Object.defineProperty(exports, "isValidName", { enumerable: true, get: function () { return hash_1.isValidName; } });
Object.defineProperty(exports, "namehash", { enumerable: true, get: function () { return hash_1.namehash; } });
var hdnode_1 = require$$6;
Object.defineProperty(exports, "defaultPath", { enumerable: true, get: function () { return hdnode_1.defaultPath; } });
Object.defineProperty(exports, "entropyToMnemonic", { enumerable: true, get: function () { return hdnode_1.entropyToMnemonic; } });
Object.defineProperty(exports, "getAccountPath", { enumerable: true, get: function () { return hdnode_1.getAccountPath; } });
Object.defineProperty(exports, "HDNode", { enumerable: true, get: function () { return hdnode_1.HDNode; } });
Object.defineProperty(exports, "isValidMnemonic", { enumerable: true, get: function () { return hdnode_1.isValidMnemonic; } });
Object.defineProperty(exports, "mnemonicToEntropy", { enumerable: true, get: function () { return hdnode_1.mnemonicToEntropy; } });
Object.defineProperty(exports, "mnemonicToSeed", { enumerable: true, get: function () { return hdnode_1.mnemonicToSeed; } });
var json_wallets_1 = require$$7;
Object.defineProperty(exports, "getJsonWalletAddress", { enumerable: true, get: function () { return json_wallets_1.getJsonWalletAddress; } });
var keccak256_1 = require$$8;
Object.defineProperty(exports, "keccak256", { enumerable: true, get: function () { return keccak256_1.keccak256; } });
var logger_1 = require$$9;
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
var sha2_1 = require$$10;
Object.defineProperty(exports, "computeHmac", { enumerable: true, get: function () { return sha2_1.computeHmac; } });
Object.defineProperty(exports, "ripemd160", { enumerable: true, get: function () { return sha2_1.ripemd160; } });
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return sha2_1.sha256; } });
Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return sha2_1.sha512; } });
var solidity_1 = require$$11;
Object.defineProperty(exports, "solidityKeccak256", { enumerable: true, get: function () { return solidity_1.keccak256; } });
Object.defineProperty(exports, "solidityPack", { enumerable: true, get: function () { return solidity_1.pack; } });
Object.defineProperty(exports, "soliditySha256", { enumerable: true, get: function () { return solidity_1.sha256; } });
var random_1 = require$$12;
Object.defineProperty(exports, "randomBytes", { enumerable: true, get: function () { return random_1.randomBytes; } });
Object.defineProperty(exports, "shuffled", { enumerable: true, get: function () { return random_1.shuffled; } });
var properties_1 = require$$13;
Object.defineProperty(exports, "checkProperties", { enumerable: true, get: function () { return properties_1.checkProperties; } });
Object.defineProperty(exports, "deepCopy", { enumerable: true, get: function () { return properties_1.deepCopy; } });
Object.defineProperty(exports, "defineReadOnly", { enumerable: true, get: function () { return properties_1.defineReadOnly; } });
Object.defineProperty(exports, "getStatic", { enumerable: true, get: function () { return properties_1.getStatic; } });
Object.defineProperty(exports, "resolveProperties", { enumerable: true, get: function () { return properties_1.resolveProperties; } });
Object.defineProperty(exports, "shallowCopy", { enumerable: true, get: function () { return properties_1.shallowCopy; } });
var RLP = __importStar(require$$14);
exports.RLP = RLP;
var signing_key_1 = require$$15;
Object.defineProperty(exports, "computePublicKey", { enumerable: true, get: function () { return signing_key_1.computePublicKey; } });
Object.defineProperty(exports, "recoverPublicKey", { enumerable: true, get: function () { return signing_key_1.recoverPublicKey; } });
Object.defineProperty(exports, "SigningKey", { enumerable: true, get: function () { return signing_key_1.SigningKey; } });
var strings_1 = require$$16;
Object.defineProperty(exports, "formatBytes32String", { enumerable: true, get: function () { return strings_1.formatBytes32String; } });
Object.defineProperty(exports, "nameprep", { enumerable: true, get: function () { return strings_1.nameprep; } });
Object.defineProperty(exports, "parseBytes32String", { enumerable: true, get: function () { return strings_1.parseBytes32String; } });
Object.defineProperty(exports, "_toEscapedUtf8String", { enumerable: true, get: function () { return strings_1._toEscapedUtf8String; } });
Object.defineProperty(exports, "toUtf8Bytes", { enumerable: true, get: function () { return strings_1.toUtf8Bytes; } });
Object.defineProperty(exports, "toUtf8CodePoints", { enumerable: true, get: function () { return strings_1.toUtf8CodePoints; } });
Object.defineProperty(exports, "toUtf8String", { enumerable: true, get: function () { return strings_1.toUtf8String; } });
Object.defineProperty(exports, "Utf8ErrorFuncs", { enumerable: true, get: function () { return strings_1.Utf8ErrorFuncs; } });
var transactions_1 = require$$17;
Object.defineProperty(exports, "accessListify", { enumerable: true, get: function () { return transactions_1.accessListify; } });
Object.defineProperty(exports, "computeAddress", { enumerable: true, get: function () { return transactions_1.computeAddress; } });
Object.defineProperty(exports, "parseTransaction", { enumerable: true, get: function () { return transactions_1.parse; } });
Object.defineProperty(exports, "recoverAddress", { enumerable: true, get: function () { return transactions_1.recoverAddress; } });
Object.defineProperty(exports, "serializeTransaction", { enumerable: true, get: function () { return transactions_1.serialize; } });
Object.defineProperty(exports, "TransactionTypes", { enumerable: true, get: function () { return transactions_1.TransactionTypes; } });
var units_1 = require$$18;
Object.defineProperty(exports, "commify", { enumerable: true, get: function () { return units_1.commify; } });
Object.defineProperty(exports, "formatEther", { enumerable: true, get: function () { return units_1.formatEther; } });
Object.defineProperty(exports, "parseEther", { enumerable: true, get: function () { return units_1.parseEther; } });
Object.defineProperty(exports, "formatUnits", { enumerable: true, get: function () { return units_1.formatUnits; } });
Object.defineProperty(exports, "parseUnits", { enumerable: true, get: function () { return units_1.parseUnits; } });
var wallet_1 = require$$19;
Object.defineProperty(exports, "verifyMessage", { enumerable: true, get: function () { return wallet_1.verifyMessage; } });
Object.defineProperty(exports, "verifyTypedData", { enumerable: true, get: function () { return wallet_1.verifyTypedData; } });
var web_1 = require$$20;
Object.defineProperty(exports, "_fetchData", { enumerable: true, get: function () { return web_1._fetchData; } });
Object.defineProperty(exports, "fetchJson", { enumerable: true, get: function () { return web_1.fetchJson; } });
Object.defineProperty(exports, "poll", { enumerable: true, get: function () { return web_1.poll; } });
////////////////////////
// Enums
var sha2_2 = require$$10;
Object.defineProperty(exports, "SupportedAlgorithm", { enumerable: true, get: function () { return sha2_2.SupportedAlgorithm; } });
var strings_2 = require$$16;
Object.defineProperty(exports, "UnicodeNormalizationForm", { enumerable: true, get: function () { return strings_2.UnicodeNormalizationForm; } });
Object.defineProperty(exports, "Utf8ErrorReason", { enumerable: true, get: function () { return strings_2.Utf8ErrorReason; } });

}(utils$b));

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
                utils$b.getAddress(gaugeAddress),
                timestamp || Math.floor(Date.now() / 1000),
            ]),
        ]);
        const [, res] = await this.multicall.aggregate(payload);
        const weights = gaugeAddresses.reduce((p, a, i) => {
            p[a] || (p[a] = parseFloat(utils$b.formatUnits(res[i], 18)));
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
    constructor(multicallAddress, provider) {
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
            p[a] || (p[a] = parseFloat(utils$b.formatUnits(res0x[i], 18)));
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
            p[a] || (p[a] = parseFloat(utils$b.formatUnits(res0x[i], 18)));
            return p;
        }, {});
        return workingSupplies;
    }
    async getRewardCounts(gaugeAddresses) {
        const payload = gaugeAddresses.map((gaugeAddress) => [
            gaugeAddress,
            liquidityGaugeV5Interface.encodeFunctionData('reward_count', []),
        ]);
        const [, res] = await this.multicall.aggregate(payload);
        // Handle 0x return values
        const res0x = res.map((r) => (r == '0x' ? '0x0' : r));
        const rewardCounts = gaugeAddresses.reduce((p, a, i) => {
            p[a] || (p[a] = parseInt(res0x[i]));
            return p;
        }, {});
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
        const queryResult = await this.client.LiquidityGauges();
        // TODO: optionally convert subgraph type to sdk internal type
        this.gauges = queryResult.liquidityGauges;
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
    constructor(subgraphUrl, multicallAddress, gaugeControllerAddress, provider) {
        this.totalSupplies = {};
        this.workingSupplies = {};
        this.relativeWeights = {};
        this.rewardTokens = {};
        this.gaugeController = new GaugeControllerMulticallRepository(multicallAddress, gaugeControllerAddress, provider);
        this.multicall = new LiquidityGaugesMulticallRepository(multicallAddress, provider);
        this.subgraph = new LiquidityGaugesSubgraphRepository(subgraphUrl);
    }
    async fetch() {
        const gauges = await this.subgraph.fetch();
        const gaugeAddresses = gauges.map((g) => g.id);
        this.totalSupplies = await this.multicall.getTotalSupplies(gaugeAddresses);
        this.workingSupplies = await this.multicall.getWorkingSupplies(gaugeAddresses);
        this.rewardTokens = await this.multicall.getRewardData(gaugeAddresses);
        this.relativeWeights = await this.gaugeController.getRelativeWeights(gaugeAddresses);
    }
    async find(id) {
        if (Object.keys(this.relativeWeights).length == 0) {
            await this.fetch();
        }
        const gauge = await this.subgraph.find(id);
        if (!gauge) {
            return;
        }
        return this.compose(gauge);
    }
    async findBy(attribute, value) {
        if (Object.keys(this.relativeWeights).length == 0) {
            await this.fetch();
        }
        let gauge;
        if (attribute == 'id') {
            return this.find(value);
        }
        else if (attribute == 'address') {
            return this.find(value);
        }
        else if (attribute == 'poolId') {
            gauge = await this.subgraph.findBy('poolId', value);
        }
        else if (attribute == 'poolAddress') {
            gauge = await this.subgraph.findBy('poolAddress', value);
        }
        else {
            throw `search by ${attribute} not implemented`;
        }
        if (!gauge) {
            return undefined;
        }
        return this.compose(gauge);
    }
    compose(subgraphGauge) {
        return {
            id: subgraphGauge.id,
            address: subgraphGauge.id,
            name: subgraphGauge.symbol,
            poolId: subgraphGauge.poolId,
            poolAddress: subgraphGauge.poolAddress,
            totalSupply: this.totalSupplies[subgraphGauge.id],
            workingSupply: this.workingSupplies[subgraphGauge.id],
            relativeWeight: this.relativeWeights[subgraphGauge.id],
            rewardTokens: this.rewardTokens[subgraphGauge.id],
        };
    }
}

class BalancerAPIClient {
    constructor(url, apiKey) {
        this.url = url;
        this.apiKey = apiKey;
    }
    async get(query) {
        try {
            const payload = this.toPayload(query);
            const { data } = await axios.post(this.url, payload, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });
            if (data.errors) {
                throw new Error(data.errors.map((error) => error.message).join(','));
            }
            return data.data;
        }
        catch (error) {
            console.error(error);
            throw error;
        }
        return [];
    }
    toPayload(query) {
        return JSON.stringify({ query: jsonToGraphQLQuery({ query }) });
    }
}

/**
 * Access pools using the Balancer GraphQL Api.
 *
 * Balancer's API URL: https://api.balancer.fi/query/
 */
class PoolsBalancerAPIRepository {
    constructor(url, apiKey) {
        this.pools = [];
        this.client = new BalancerAPIClient(url, apiKey);
    }
    async fetch(query) {
        const defaultArgs = {
            chainId: 1,
            orderBy: 'totalLiquidity',
            orderDirection: 'desc',
            first: 10,
            where: {
                swapEnabled: Op.Equals(true),
                totalShares: Op.GreaterThan(0.05),
            },
        };
        const defaultAttributes = {
            id: true,
            address: true,
        };
        const args = (query === null || query === void 0 ? void 0 : query.args) || defaultArgs;
        const formattedArgs = new GraphQLArgsBuilder(args).format(new BalancerAPIArgsFormatter());
        const attrs = (query === null || query === void 0 ? void 0 : query.attrs) || defaultAttributes;
        const formattedQuery = {
            pools: {
                __args: formattedArgs,
                ...attrs,
            },
        };
        const apiResponse = await this.client.get(formattedQuery);
        const apiResponseData = apiResponse.pools;
        this.skip = apiResponseData.skip;
        this.pools = apiResponseData.pools;
        return this.pools.map(this.format);
    }
    async find(id) {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        return this.findBy('id', id);
    }
    async findBy(param, value) {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        const pool = this.pools.find((pool) => pool[param] == value);
        if (pool) {
            return this.format(pool);
        }
    }
    /** Fixes any formatting issues from the subgraph
     *  - GraphQL can't store a map so pool.apr.[rewardAprs/tokenAprs].breakdown
     *    is JSON data that needs to be parsed so they match the Pool type correctly.
     */
    format(pool) {
        var _a, _b, _c, _d;
        if ((_a = pool.apr) === null || _a === void 0 ? void 0 : _a.rewardAprs.breakdown) {
            // GraphQL can't store this as a map so it's JSON that we must parse
            const rewardsBreakdown = JSON.parse((_b = pool.apr) === null || _b === void 0 ? void 0 : _b.rewardAprs.breakdown);
            pool.apr.rewardAprs.breakdown = rewardsBreakdown;
        }
        if ((_c = pool.apr) === null || _c === void 0 ? void 0 : _c.tokenAprs.breakdown) {
            // GraphQL can't store this as a map so it's JSON that we must parse
            const tokenAprsBreakdown = JSON.parse((_d = pool.apr) === null || _d === void 0 ? void 0 : _d.tokenAprs.breakdown);
            pool.apr.tokenAprs.breakdown = tokenAprsBreakdown;
        }
        return pool;
    }
}

/**
 * The fallback provider takes multiple PoolRepository's in an array and uses them in order
 * falling back to the next one if a request times out.
 *
 * This is useful for using the Balancer API while being able to fall back to the graph if it is down
 * to ensure Balancer is maximally decentralized.
 **/
class PoolsFallbackRepository {
    constructor(providers, timeout = 10000) {
        this.providers = providers;
        this.timeout = timeout;
        this.currentProviderIdx = 0;
    }
    async fetch(query) {
        return this.fallbackQuery('fetch', [query]);
    }
    get currentProvider() {
        if (!this.providers.length ||
            this.currentProviderIdx >= this.providers.length) {
            return;
        }
        return this.providers[this.currentProviderIdx];
    }
    async find(id) {
        return this.fallbackQuery('find', [id]);
    }
    async findBy(attribute, value) {
        return this.fallbackQuery('findBy', [attribute, value]);
    }
    async fallbackQuery(func, args) {
        if (this.currentProviderIdx >= this.providers.length) {
            throw new Error('No working providers found');
        }
        let result;
        try {
            const currentProvider = this.providers[this.currentProviderIdx];
            result = await Promise.race([
                // eslint-disable-next-line prefer-spread
                currentProvider[func].apply(currentProvider, args),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), this.timeout)),
            ]);
        }
        catch (e) {
            if (e.message === 'timeout') {
                console.error('Provider ' +
                    this.currentProviderIdx +
                    ' timed out, falling back to next provider');
            }
            else {
                console.error('Provider ' + this.currentProviderIdx + ' failed with error: ', e.message, ', falling back to next provider');
            }
            this.currentProviderIdx++;
            result = await this.fallbackQuery.call(this, func, args);
        }
        return result;
    }
}

class PoolsStaticRepository {
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
     * @param blockHeight lazy loading blockHeigh resolver
     */
    constructor(url, blockHeight) {
        this.blockHeight = blockHeight;
        this.pools = [];
        this.client = createSubgraphClient(url);
    }
    async fetch(query) {
        const defaultArgs = {
            orderBy: Pool_OrderBy.TotalLiquidity,
            orderDirection: OrderDirection$1.Desc,
            block: this.blockHeight
                ? { number: await this.blockHeight() }
                : undefined,
            first: query === null || query === void 0 ? void 0 : query.args.first,
            skip: (query === null || query === void 0 ? void 0 : query.args.skip) ? Number(query === null || query === void 0 ? void 0 : query.args.skip) : 0,
            where: {
                swapEnabled: Op.Equals(true),
                totalShares: Op.GreaterThan(0),
            },
        };
        const args = (query === null || query === void 0 ? void 0 : query.args) || defaultArgs;
        const formattedQuery = new GraphQLArgsBuilder(args).format(new SubgraphArgsFormatter());
        const { pool0, pool1000 } = await this.client.Pools(formattedQuery);
        // TODO: how to best convert subgraph type to sdk internal type?
        this.pools = [...pool0, ...pool1000];
        this.skip = this.pools.length.toString();
        return this.pools.map(this.mapType);
    }
    async find(id) {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        return this.findBy('id', id);
    }
    async findBy(param, value) {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        const pool = this.pools.find((pool) => pool[param] == value);
        if (pool) {
            return this.mapType(pool);
        }
        return undefined;
    }
    async all() {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        return this.pools.map(this.mapType);
    }
    async where(filter) {
        if (this.pools.length == 0) {
            await this.fetch();
        }
        return (await this.all()).filter(filter);
    }
    mapType(subgraphPool) {
        return {
            id: subgraphPool.id,
            name: subgraphPool.name || '',
            address: subgraphPool.address,
            poolType: subgraphPool.poolType,
            swapFee: subgraphPool.swapFee,
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

class StaticTokenPriceProvider {
    constructor(tokenPrices) {
        this.tokenPrices = tokenPrices;
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

var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AbiCoder: AbiCoder,
    defaultAbiCoder: defaultAbiCoder,
    Fragment: Fragment,
    ConstructorFragment: ConstructorFragment,
    ErrorFragment: ErrorFragment,
    EventFragment: EventFragment,
    FunctionFragment: FunctionFragment,
    ParamType: ParamType,
    FormatTypes: FormatTypes,
    checkResultErrors: checkResultErrors,
    Logger: Logger,
    RLP: lib_esm$7,
    _fetchData: _fetchData,
    fetchJson: fetchJson,
    poll: poll,
    checkProperties: checkProperties,
    deepCopy: deepCopy,
    defineReadOnly: defineReadOnly,
    getStatic: getStatic,
    resolveProperties: resolveProperties,
    shallowCopy: shallowCopy,
    arrayify: arrayify,
    concat: concat,
    stripZeros: stripZeros,
    zeroPad: zeroPad,
    isBytes: isBytes,
    isBytesLike: isBytesLike,
    defaultPath: defaultPath,
    HDNode: HDNode,
    SigningKey: SigningKey,
    Interface: Interface,
    LogDescription: LogDescription,
    TransactionDescription: TransactionDescription,
    base58: Base58,
    base64: lib_esm$f,
    hexlify: hexlify,
    isHexString: isHexString,
    hexConcat: hexConcat,
    hexStripZeros: hexStripZeros,
    hexValue: hexValue,
    hexZeroPad: hexZeroPad,
    hexDataLength: hexDataLength,
    hexDataSlice: hexDataSlice,
    nameprep: nameprep,
    _toEscapedUtf8String: _toEscapedUtf8String,
    toUtf8Bytes: toUtf8Bytes,
    toUtf8CodePoints: toUtf8CodePoints,
    toUtf8String: toUtf8String,
    Utf8ErrorFuncs: Utf8ErrorFuncs,
    formatBytes32String: formatBytes32String,
    parseBytes32String: parseBytes32String,
    dnsEncode: dnsEncode,
    hashMessage: hashMessage,
    namehash: namehash,
    isValidName: isValidName,
    id: id,
    _TypedDataEncoder: TypedDataEncoder,
    getAddress: getAddress,
    getIcapAddress: getIcapAddress,
    getContractAddress: getContractAddress,
    getCreate2Address: getCreate2Address,
    isAddress: isAddress,
    formatEther: formatEther,
    parseEther: parseEther,
    formatUnits: formatUnits$1,
    parseUnits: parseUnits,
    commify: commify,
    computeHmac: computeHmac,
    keccak256: keccak256$1,
    ripemd160: ripemd160,
    sha256: sha256$1,
    sha512: sha512,
    randomBytes: randomBytes,
    shuffled: shuffled,
    solidityPack: pack,
    solidityKeccak256: keccak256,
    soliditySha256: sha256,
    splitSignature: splitSignature,
    joinSignature: joinSignature,
    accessListify: accessListify,
    parseTransaction: parse,
    serializeTransaction: serialize,
    get TransactionTypes () { return TransactionTypes; },
    getJsonWalletAddress: getJsonWalletAddress,
    computeAddress: computeAddress,
    recoverAddress: recoverAddress,
    computePublicKey: computePublicKey,
    recoverPublicKey: recoverPublicKey,
    verifyMessage: verifyMessage,
    verifyTypedData: verifyTypedData,
    getAccountPath: getAccountPath,
    mnemonicToEntropy: mnemonicToEntropy,
    entropyToMnemonic: entropyToMnemonic,
    isValidMnemonic: isValidMnemonic,
    mnemonicToSeed: mnemonicToSeed,
    get SupportedAlgorithm () { return SupportedAlgorithm; },
    get UnicodeNormalizationForm () { return UnicodeNormalizationForm; },
    get Utf8ErrorReason () { return Utf8ErrorReason; },
    Indexed: Indexed
});

const version = "ethers/5.6.9";

new Logger(version);

const { formatUnits } = utils;
// can be fetched from subgraph
// aave-js: supplyAPR = graph.liquidityRate = core.getReserveCurrentLiquidityRate(_reserve)
// or directly from RPC:
// wrappedAaveToken.LENDING_POOL.getReserveCurrentLiquidityRate(mainTokenAddress)
const wrappedTokensMap = {
    // USDT
    '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58': {
        aToken: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
        underlying: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // USDC
    '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de': {
        aToken: '0xbcca60bb61934080951369a648fb03df4f96263c',
        underlying: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    // DAI
    '0x02d60b84491589974263d922d9cc7a3152618ef6': {
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
let aprTtl$2 = 0;
let aprs;
let promisedCall; // Prevent multiple rounds to APIs.
/**
 * Is fetching and parsing aave APRs from a subgraph
 *
 * @returns aave aprs in bsp
 */
const getAprs = async () => {
    try {
        const graphqlQuery = {
            operationName: 'getReserves',
            query: query$1,
            variables: { aTokens, underlyingAssets },
        };
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(graphqlQuery),
        });
        const { data: { reserves }, } = (await response.json());
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
/**
 * Caching logic around APR fetching
 *
 * @returns cached APRs for aave tokens
 */
const aave = async (address) => {
    if (!address) {
        throw 'needs a wrapped token address, eg: wrapped aDAI';
    }
    // cache for 1h
    if ((Date.now() > aprTtl$2) && !promisedCall) {
        promisedCall = getAprs();
        aprTtl$2 = Date.now() + 1 * 60 * 60 * 1000;
    }
    aprs = await promisedCall;
    return aprs[address];
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
        this.baseTokenAddresses = tokenAddresses.map((a) => a.toLowerCase());
        this.urlBase = `https://api.coingecko.com/api/v3/simple/token_price/${this.platform(chainId)}?vs_currencies=usd,eth`;
    }
    async fetch(address) {
        const prices = await (await fetch(this.url(address))).json();
        this.prices = {
            ...this.prices,
            ...prices,
        };
    }
    async find(address) {
        const lowercaseAddress = address.toLowerCase();
        const unwrapped = unwrapToken(lowercaseAddress);
        if (!Object.keys(this.prices).includes(unwrapped)) {
            await this.fetch(unwrapped);
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
    url(address) {
        if (this.baseTokenAddresses.includes(address)) {
            return `${this.urlBase}&contract_addresses=${this.baseTokenAddresses.join(',')}`;
        }
        else {
            return `${this.urlBase}&contract_addresses=${address}`;
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
                feeDistributorInterface.encodeFunctionData('getTokensDistributedInWeek', [utils$b.getAddress(this.balAddress), previousWeek]),
            ],
            [
                this.feeDistributorAddress,
                feeDistributorInterface.encodeFunctionData('getTokensDistributedInWeek', [utils$b.getAddress(this.bbAUsdAddress), previousWeek]),
            ],
            [this.veBalAddress, veBalInterface.encodeFunctionData('totalSupply', [])],
            [this.bbAUsdAddress, bbAUsdInterface.encodeFunctionData('getRate', [])],
        ];
        const [, res] = await this.multicall.aggregate(payload);
        const data = {
            balAmount: parseFloat(utils$b.formatUnits(res[0], 18)),
            bbAUsdAmount: parseFloat(utils$b.formatUnits(res[1], 18)),
            veBalSupply: parseFloat(utils$b.formatUnits(res[2], 18)),
            bbAUsdPrice: parseFloat(utils$b.formatUnits(res[3], 18)),
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
        let daysSinceThursday = midnight.getDay() - 4;
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
        return parseFloat(utils$b.formatUnits(fees, 18));
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

let aprTtl$1 = 0;
let apr$1;
/**
 * Gets Lido APR
 *
 * @returns lido apr in bps
 */
const getApr$1 = async () => {
    try {
        const response = await fetch('https://stake.lido.fi/api/apr');
        const { data: aprs } = (await response.json());
        return Math.round(parseFloat(aprs.steth) * 100);
    }
    catch (error) {
        console.error('Failed to fetch stETH APR:', error);
        return 0;
    }
};
/**
 * Business logic around Lido APR fetching
 *
 * @returns cached lido APR for stETH
 */
const lido = async () => {
    // cache for 1h
    if (Date.now() > aprTtl$1) {
        apr$1 = await getApr$1();
        aprTtl$1 = Date.now() + 1 * 60 * 60 * 1000;
    }
    return apr$1;
};

let aprTtl = 0;
let apr;
/**
 * Gets Lido APR
 *
 * @returns lido apr in bps
 */
const getApr = async () => {
    try {
        const response = await fetch('https://app.overnight.fi/api/balancer/week/apr');
        const apr = await response.text();
        return Math.round((parseFloat(apr) * 10000) / 100);
    }
    catch (error) {
        console.error('Failed to fetch USD+ APR:', error);
        return 0;
    }
};
/**
 * Business logic around APR fetching
 *
 * @returns cached APR for USD+
 */
const overnight = async () => {
    // cache for 1h
    if (Date.now() > aprTtl) {
        apr = await getApr();
        aprTtl = Date.now() + 1 * 60 * 60 * 1000;
    }
    return apr;
};

const tokenAprMap = {
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': lido,
    '0xf8fd466f12e236f4c96f7cce6c79eadb819abf58': aave,
    '0xd093fa4fb80d09bb30817fdcd442d4d02ed3e5de': aave,
    '0x02d60b84491589974263d922d9cc7a3152618ef6': aave,
    // Polygon
    '0x1aafc31091d93c3ff003cff5d2d8f7ba2e728425': overnight,
    '0x6933ec1ca55c06a894107860c92acdfd2dd8512f': overnight,
};
class TokenYieldsRepository {
    constructor(tokenMap = tokenAprMap) {
        this.tokenMap = tokenMap;
        this.yields = {};
    }
    async fetch(address) {
        const tokenYield = await this.tokenMap[address](address);
        this.yields[address] = tokenYield;
    }
    async find(address) {
        const lowercase = address.toLocaleLowerCase();
        if (Object.keys(this.tokenMap).includes(lowercase) &&
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

const endpoints = {
    1: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
    5: 'https://api.thegraph.com/subgraphs/name/blocklytics/goerli-blocks',
    137: 'https://api.thegraph.com/subgraphs/name/ianlapham/polygon-blocks',
    42161: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-one-blocks',
};
const query = (timestamp) => `{
  blocks(first: 1, orderBy: number, orderDirection: asc, where: { timestamp_gt: ${timestamp} }) {
    number
  }
}`;
const fetchBlockByTime = async (network, timestamp) => {
    const endpoint = endpoints[network];
    const payload = {
        query: query(timestamp),
    };
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const { data: { blocks }, } = (await response.json());
    return parseInt(blocks[0].number);
};
class BlockNumberRepository {
    constructor(network) {
        this.network = network;
    }
    async find(from) {
        if (from == 'dayAgo') {
            const dayAgo = `${Math.floor(Date.now() / 1000) - 86400}`;
            return fetchBlockByTime(this.network, dayAgo);
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
        // Config data
        const blockDayAgo = () => {
            return new BlockNumberRepository(networkConfig.chainId).find('dayAgo');
        };
        const tokenAddresses = initialCoingeckoList
            .filter((t) => t.chainId == networkConfig.chainId)
            .map((t) => t.address);
        this.pools = new PoolsSubgraphRepository(networkConfig.urls.subgraph);
        // 🚨 yesterdaysPools is used to calculate swapFees accumulated over last 24 hours
        // TODO: find a better data source for that, eg: maybe DUNE once API is available
        this.yesterdaysPools = new PoolsSubgraphRepository(networkConfig.urls.subgraph, blockDayAgo);
        this.tokenPrices = new CoingeckoPriceRepository(tokenAddresses, networkConfig.chainId);
        this.tokenMeta = new StaticTokenProvider([]);
        this.liquidityGauges = new LiquidityGaugeSubgraphRPCProvider(networkConfig.urls.gaugesSubgraph, networkConfig.addresses.contracts.multicall, networkConfig.addresses.contracts.gaugeController, provider);
        this.feeDistributor = new FeeDistributorRepository(networkConfig.addresses.contracts.multicall, networkConfig.addresses.contracts.feeDistributor, networkConfig.addresses.tokens.bal, networkConfig.addresses.tokens.veBal, networkConfig.addresses.tokens.bbaUsd, provider);
        this.feeCollector = new FeeCollectorRepository(networkConfig.addresses.contracts.vault, provider);
        this.tokenYields = new TokenYieldsRepository();
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

class Relayer {
    constructor(swapsOrConfig) {
        if (swapsOrConfig instanceof Swaps) {
            this.swaps = swapsOrConfig;
        }
        else {
            this.swaps = new Swaps(swapsOrConfig);
        }
    }
    static encodeBatchSwap(params) {
        const relayerLibrary = new Interface(relayerLibraryAbi);
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
        const relayerLibrary = new Interface(relayerLibraryAbi);
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
            deadline: MaxUint256$1,
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
            if (!amountUnwrapped.gt(Zero$1))
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
            if (!amountWrapped.gt(Zero$1))
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
            deadline: MaxUint256$1,
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
        this.pools = new PoolTypeConcerns(config);
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
            const pool = PoolTypeConcerns.from(poolData.poolType);
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

class PoolFees {
    constructor(pool, yesterdaysPools) {
        this.pool = pool;
        this.yesterdaysPools = yesterdaysPools;
    }
    // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
    // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
    async last24h() {
        const yesterdaysPool = await this.yesterdaysPools.find(this.pool.id);
        if (!this.pool.totalSwapFee ||
            !yesterdaysPool ||
            !yesterdaysPool.totalSwapFee) {
            return 0;
        }
        return (parseFloat(this.pool.totalSwapFee) -
            parseFloat(yesterdaysPool.totalSwapFee));
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
    constructor(pool, tokenPrices, tokenMeta, pools, yesterdaysPools, liquidityGauges, feeDistributor, feeCollector, tokenYields) {
        this.pool = pool;
        this.tokenPrices = tokenPrices;
        this.tokenMeta = tokenMeta;
        this.pools = pools;
        this.yesterdaysPools = yesterdaysPools;
        this.liquidityGauges = liquidityGauges;
        this.feeDistributor = feeDistributor;
        this.feeCollector = feeCollector;
        this.tokenYields = tokenYields;
    }
    /**
     * Pool revenue via swap fees.
     * Fees and liquidity are takes from subgraph as USD floats.
     *
     * @returns APR [bsp] from fees accumulated over last 24h
     */
    async swapFees() {
        // 365 * dailyFees * (1 - protocolFees) / totalLiquidity
        const last24hFees = await this.last24hFees();
        const totalLiquidity = await this.totalLiquidity();
        // TODO: what to do when we are missing last24hFees or totalLiquidity?
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
     * @returns APR [bsp] from tokens contained in the pool
     */
    async tokenAprs() {
        if (!this.pool.tokens) {
            return {
                total: 0,
                breakdown: {},
            };
        }
        const totalLiquidity = await this.totalLiquidity();
        // Filter out BPT: token with the same address as the pool
        // TODO: move this to data layer
        const bptFreeTokens = this.pool.tokens.filter((token) => {
            return token.address !== this.pool.address;
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
                    const subApr = new PoolApr(subPool, this.tokenPrices, this.tokenMeta, this.pools, this.yesterdaysPools, this.liquidityGauges, this.feeDistributor, this.feeCollector, this.tokenYields);
                    const subSwapFees = await subApr.swapFees();
                    const subtokenAprs = await subApr.tokenAprs();
                    apr = subSwapFees + subtokenAprs.total;
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
                const tokenPrice = ((_a = token.price) === null || _a === void 0 ? void 0 : _a.usd) || ((_b = (await this.tokenPrices.find(token.address))) === null || _b === void 0 ? void 0 : _b.usd);
                if (!tokenPrice) {
                    const poolToken = await this.pools.find(token.address);
                    if (poolToken) {
                        console.log('Pool token found');
                    }
                    throw `No price for ${token.address}`;
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
        const breakdown = pickBy(zipObject(bptFreeTokens.map((t) => t.address), weightedAprs), identity);
        return {
            total: apr,
            breakdown,
        };
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
     * @returns APR [bsp] from protocol rewards.
     */
    async stakingApr(boost = 1) {
        // Data resolving
        const gauge = await this.liquidityGauges.findBy('poolId', this.pool.id);
        if (!gauge) {
            return 0;
        }
        const [balPrice, bptPriceUsd] = await Promise.all([
            this.tokenPrices.find('0xba100000625a3754423978a60c9317c58a424e3d'),
            this.bptPrice(),
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
     * @returns APR [bsp] from token rewards.
     */
    async rewardAprs() {
        // Data resolving
        const gauge = await this.liquidityGauges.findBy('poolId', this.pool.id);
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
            if (data.period_finish.toNumber() < Date.now() / 1000) {
                return {
                    address: tAddress,
                    value: 0,
                };
            }
            else {
                const yearlyReward = data.rate.mul(86400).mul(365);
                const price = await this.tokenPrices.find(tAddress);
                if (price && price.usd) {
                    const meta = await this.tokenMeta.find(tAddress);
                    const decimals = (meta === null || meta === void 0 ? void 0 : meta.decimals) || 18;
                    const yearlyRewardUsd = parseFloat(utils$b.formatUnits(yearlyReward, decimals)) *
                        parseFloat(price.usd);
                    return {
                        address: tAddress,
                        value: yearlyRewardUsd,
                    };
                }
                else {
                    throw `No USD price for ${tAddress}`;
                }
            }
        });
        // Get the gauge totalSupplyUsd
        const bptPriceUsd = await this.bptPrice();
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
     */
    async protocolApr() {
        const veBalPoolId = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';
        if (this.pool.id != veBalPoolId) {
            return 0;
        }
        const revenue = new ProtocolRevenue(this.feeDistributor, this.tokenPrices);
        const { lastWeekBalRevenue, lastWeekBBAUsdRevenue, veBalSupply } = await revenue.data();
        const { totalShares } = this.pool;
        const totalLiquidity = await this.totalLiquidity();
        if (!totalLiquidity) {
            throw 'totalLiquidity for veBal pool missing';
        }
        const bptPrice = parseFloat(totalLiquidity) / parseFloat(totalShares);
        const dailyRevenue = (lastWeekBalRevenue + lastWeekBBAUsdRevenue) / 7;
        const apr = Math.round((10000 * (365 * dailyRevenue)) / (bptPrice * veBalSupply));
        return apr;
    }
    /**
     * Composes all sources for total pool APR.
     *
     * @returns pool APR split [bsp]
     */
    async apr() {
        const [swapFees, tokenAprs, minStakingApr, maxStakingApr, rewardAprs, protocolApr,] = await Promise.all([
            this.swapFees(),
            this.tokenAprs(),
            this.stakingApr(),
            this.stakingApr(2.5),
            this.rewardAprs(),
            this.protocolApr(),
        ]);
        return {
            swapFees,
            tokenAprs,
            stakingApr: {
                min: minStakingApr,
                max: maxStakingApr,
            },
            rewardAprs,
            protocolApr,
            min: swapFees +
                tokenAprs.total +
                rewardAprs.total +
                protocolApr +
                minStakingApr,
            max: swapFees +
                tokenAprs.total +
                rewardAprs.total +
                protocolApr +
                maxStakingApr,
        };
    }
    async last24hFees() {
        const poolFees = new PoolFees(this.pool, this.yesterdaysPools);
        return poolFees.last24h();
    }
    async totalLiquidity() {
        const liquidityService = new Liquidity(this.pools, this.tokenPrices);
        const liquidity = await liquidityService.getLiquidity(this.pool);
        return liquidity;
    }
    async bptPrice() {
        return (parseFloat(await this.totalLiquidity()) /
            parseFloat(this.pool.totalShares));
    }
    async protocolSwapFeePercentage() {
        const fee = await this.feeCollector.find('');
        return fee ? fee : 0;
    }
}

class PoolVolume {
    constructor(pool, yesterdaysPools) {
        this.pool = pool;
        this.yesterdaysPools = yesterdaysPools;
    }
    // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
    // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
    async last24h() {
        const yesterdaysPool = await this.yesterdaysPools.find(this.pool.id);
        if (!this.pool.totalSwapVolume ||
            !yesterdaysPool ||
            !yesterdaysPool.totalSwapVolume) {
            return 0;
        }
        return (parseFloat(this.pool.totalSwapVolume) -
            parseFloat(yesterdaysPool.totalSwapVolume));
    }
}

// Can be changed outside for dependent services rate-limits
// eslint-disable-next-line prefer-const
let POOLS_PER_PAGE = 10;
/**
 * Use-cases layer for generating live pools data
 */
class ModelProvider {
    constructor(repositories) {
        this.repositories = repositories;
    }
    static async resolve(model) {
        return {
            ...model,
            apr: await (async () => {
                try {
                    const apr = await model.calcApr();
                    return apr;
                }
                catch (e) {
                    console.log(e);
                    return;
                }
            })(),
        };
    }
    static wrap(data, repositories) {
        return {
            ...data,
            calcLiquidity: async function () {
                const liquidityService = new Liquidity(repositories.pools, repositories.tokenPrices);
                return liquidityService.getLiquidity(this);
            },
            calcApr: async function () {
                const aprService = new PoolApr(data, repositories.tokenPrices, repositories.tokenMeta, repositories.pools, repositories.yesterdaysPools, repositories.liquidityGauges, repositories.feeDistributor, repositories.feeCollector, repositories.tokenYields);
                return aprService.apr();
            },
            calcFees: async function () {
                const feeService = new PoolFees(data, repositories.yesterdaysPools);
                return feeService.last24h();
            },
            calcVolume: async function () {
                const volumeService = new PoolVolume(data, repositories.yesterdaysPools);
                return volumeService.last24h();
            },
            // TODO: spotPrice fails, because it needs a subgraphType,
            // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
            // spotPrice: async (tokenIn: string, tokenOut: string) =>
            //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
        };
    }
    async find(id) {
        const data = await this.repositories.pools.find(id);
        if (!data)
            return;
        const model = ModelProvider.wrap(data, this.repositories);
        return await ModelProvider.resolve(model);
    }
    async findBy(param, value) {
        if (param == 'id') {
            return this.find(value);
        }
        else if (param == 'address') {
            const data = await this.repositories.pools.findBy('address', value);
            if (!data)
                return;
            const model = ModelProvider.wrap(data, this.repositories);
            return await ModelProvider.resolve(model);
        }
        else {
            throw `search by ${param} not implemented`;
        }
    }
    async all(page = 1) {
        const list = await this.repositories.pools.all();
        if (!list)
            return [];
        const slice = list.slice((page - 1) * POOLS_PER_PAGE, page * POOLS_PER_PAGE);
        const resolved = Promise.all(slice.map(async (data) => {
            const model = ModelProvider.wrap(data, this.repositories);
            return await ModelProvider.resolve(model);
        }));
        return resolved;
    }
    async where(filter, page = 1) {
        const list = await this.repositories.pools.where(filter);
        if (!list)
            return [];
        const slice = list.slice((page - 1) * POOLS_PER_PAGE, page * POOLS_PER_PAGE);
        const resolved = Promise.all(slice.map(async (data) => {
            const model = ModelProvider.wrap(data, this.repositories);
            return await ModelProvider.resolve(model);
        }));
        return resolved;
    }
}

/**
 * Controller / use-case layer for interacting with pools data.
 */
class Pools {
    constructor(networkConfig, repositories) {
        this.networkConfig = networkConfig;
        this.liveModelProvider = new ModelProvider(repositories);
    }
    dataSource() {
        // TODO: Add API data repository to data and use liveModelProvider as fallback
        return this.liveModelProvider;
    }
    static wrap(pool, networkConfig) {
        const methods = PoolTypeConcerns.from(pool.poolType);
        return {
            ...pool,
            buildJoin: async (joiner, tokensIn, amountsIn, slippage) => {
                return methods.join.buildJoin({
                    joiner,
                    pool,
                    tokensIn,
                    amountsIn,
                    slippage,
                    wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
                });
            },
            // TODO: spotPrice fails, because it needs a subgraphType,
            // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
            // spotPrice: async (tokenIn: string, tokenOut: string) =>
            //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
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

class BalancerSDK {
    constructor(config, sor = new Sor(config), subgraph = new Subgraph(config)) {
        this.config = config;
        this.sor = sor;
        this.subgraph = subgraph;
        const networkConfig = getNetworkConfig(config);
        this.data = new Data(networkConfig, sor.provider);
        this.swaps = new Swaps(this.config);
        this.relayer = new Relayer(this.swaps);
        this.pricing = new Pricing(config, this.swaps);
        this.pools = new Pools(networkConfig, this.data);
        this.balancerContracts = new Contracts(networkConfig.addresses.contracts, sor.provider);
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

export { AaveHelpers, AssetHelpers, BalancerAPIArgsFormatter, BalancerError, BalancerErrorCode, BalancerErrors, BalancerMinterAuthorization, BalancerSDK, BlockNumberRepository, CoingeckoPriceRepository, Data, FeeCollectorRepository, FeeDistributorRepository, GaugeControllerMulticallRepository, GraphQLArgsBuilder, GraphQLFilterOperator, Liquidity, LiquidityGaugeSubgraphRPCProvider, LiquidityGaugesMulticallRepository, LiquidityGaugesSubgraphRepository, ManagedPoolEncoder, ModelProvider, Network, Op, POOLS_PER_PAGE, PoolBalanceOpKind, PoolSpecialization, PoolType, Pools, PoolsBalancerAPIRepository, PoolsFallbackRepository, PoolsStaticRepository, PoolsSubgraphRepository, Relayer, RelayerAction, RelayerAuthorization, Sor, StablePhantomPoolJoinKind, StablePoolEncoder, StablePoolExitKind, StablePoolJoinKind, StaticTokenPriceProvider, StaticTokenProvider, Subgraph, SubgraphArgsFormatter, SwapType, Swaps, TokenYieldsRepository, UserBalanceOpKind, WeightedPoolEncoder, WeightedPoolExitKind, WeightedPoolJoinKind, accountToAddress, emissions as balEmissions, getLimitsForSlippage, getPoolAddress, getPoolNonce, getPoolSpecialization, isNormalizedWeights, isSameAddress, signPermit, splitPoolId, toNormalizedWeights, tokenAprMap, tokensToTokenPrices };
//# sourceMappingURL=index.esm.js.map
