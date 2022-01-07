(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@ethersproject/abi'), require('@ethersproject/constants'), require('@ethersproject/bignumber'), require('@ethersproject/address'), require('@ethersproject/bytes'), require('@ethersproject/abstract-signer'), require('@ethersproject/contracts'), require('@ethersproject/providers'), require('@balancer-labs/sor')) :
    typeof define === 'function' && define.amd ? define(['exports', '@ethersproject/abi', '@ethersproject/constants', '@ethersproject/bignumber', '@ethersproject/address', '@ethersproject/bytes', '@ethersproject/abstract-signer', '@ethersproject/contracts', '@ethersproject/providers', '@balancer-labs/sor'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["balancer-js"] = {}, global.abi, global.constants, global.bignumber, global.address, global.bytes, global.abstractSigner, global.contracts, global.providers, global.sor));
})(this, (function (exports, abi, constants, bignumber, address, bytes, abstractSigner, contracts, providers, sor) { 'use strict';

    exports.StablePoolJoinKind = void 0;
    (function (StablePoolJoinKind) {
        StablePoolJoinKind[StablePoolJoinKind["INIT"] = 0] = "INIT";
        StablePoolJoinKind[StablePoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
        StablePoolJoinKind[StablePoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
    })(exports.StablePoolJoinKind || (exports.StablePoolJoinKind = {}));
    exports.StablePhantomPoolJoinKind = void 0;
    (function (StablePhantomPoolJoinKind) {
        StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["INIT"] = 0] = "INIT";
        StablePhantomPoolJoinKind[StablePhantomPoolJoinKind["COLLECT_PROTOCOL_FEES"] = 1] = "COLLECT_PROTOCOL_FEES";
    })(exports.StablePhantomPoolJoinKind || (exports.StablePhantomPoolJoinKind = {}));
    exports.StablePoolExitKind = void 0;
    (function (StablePoolExitKind) {
        StablePoolExitKind[StablePoolExitKind["EXACT_BPT_IN_FOR_ONE_TOKEN_OUT"] = 0] = "EXACT_BPT_IN_FOR_ONE_TOKEN_OUT";
        StablePoolExitKind[StablePoolExitKind["EXACT_BPT_IN_FOR_TOKENS_OUT"] = 1] = "EXACT_BPT_IN_FOR_TOKENS_OUT";
        StablePoolExitKind[StablePoolExitKind["BPT_IN_FOR_EXACT_TOKENS_OUT"] = 2] = "BPT_IN_FOR_EXACT_TOKENS_OUT";
    })(exports.StablePoolExitKind || (exports.StablePoolExitKind = {}));
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
    StablePoolEncoder.joinInit = (amountsIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]'], [exports.StablePoolJoinKind.INIT, amountsIn]);
    /**
     * Encodes the userData parameter for collecting protocol fees for StablePhantomPool
     */
    StablePoolEncoder.joinCollectProtocolFees = () => abi.defaultAbiCoder.encode(['uint256'], [exports.StablePhantomPoolJoinKind.COLLECT_PROTOCOL_FEES]);
    /**
     * Encodes the userData parameter for joining a StablePool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    StablePoolEncoder.joinExactTokensInForBPTOut = (amountsIn, minimumBPT) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [exports.StablePoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT]);
    /**
     * Encodes the userData parameter for joining a StablePool with to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    StablePoolEncoder.joinTokenInForExactBPTOut = (bptAmountOut, enterTokenIndex) => abi.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [exports.StablePoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT, bptAmountOut, enterTokenIndex]);
    /**
     * Encodes the userData parameter for exiting a StablePool by removing a single token in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    StablePoolEncoder.exitExactBPTInForOneTokenOut = (bptAmountIn, exitTokenIndex) => abi.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [exports.StablePoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, bptAmountIn, exitTokenIndex]);
    /**
     * Encodes the userData parameter for exiting a StablePool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    StablePoolEncoder.exitExactBPTInForTokensOut = (bptAmountIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256'], [exports.StablePoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmountIn]);
    /**
     * Encodes the userData parameter for exiting a StablePool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    StablePoolEncoder.exitBPTInForExactTokensOut = (amountsOut, maxBPTAmountIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [exports.StablePoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT, amountsOut, maxBPTAmountIn]);

    exports.WeightedPoolJoinKind = void 0;
    (function (WeightedPoolJoinKind) {
        WeightedPoolJoinKind[WeightedPoolJoinKind["INIT"] = 0] = "INIT";
        WeightedPoolJoinKind[WeightedPoolJoinKind["EXACT_TOKENS_IN_FOR_BPT_OUT"] = 1] = "EXACT_TOKENS_IN_FOR_BPT_OUT";
        WeightedPoolJoinKind[WeightedPoolJoinKind["TOKEN_IN_FOR_EXACT_BPT_OUT"] = 2] = "TOKEN_IN_FOR_EXACT_BPT_OUT";
        WeightedPoolJoinKind[WeightedPoolJoinKind["ALL_TOKENS_IN_FOR_EXACT_BPT_OUT"] = 3] = "ALL_TOKENS_IN_FOR_EXACT_BPT_OUT";
    })(exports.WeightedPoolJoinKind || (exports.WeightedPoolJoinKind = {}));
    exports.WeightedPoolExitKind = void 0;
    (function (WeightedPoolExitKind) {
        WeightedPoolExitKind[WeightedPoolExitKind["EXACT_BPT_IN_FOR_ONE_TOKEN_OUT"] = 0] = "EXACT_BPT_IN_FOR_ONE_TOKEN_OUT";
        WeightedPoolExitKind[WeightedPoolExitKind["EXACT_BPT_IN_FOR_TOKENS_OUT"] = 1] = "EXACT_BPT_IN_FOR_TOKENS_OUT";
        WeightedPoolExitKind[WeightedPoolExitKind["BPT_IN_FOR_EXACT_TOKENS_OUT"] = 2] = "BPT_IN_FOR_EXACT_TOKENS_OUT";
        WeightedPoolExitKind[WeightedPoolExitKind["MANAGEMENT_FEE_TOKENS_OUT"] = 3] = "MANAGEMENT_FEE_TOKENS_OUT";
    })(exports.WeightedPoolExitKind || (exports.WeightedPoolExitKind = {}));
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
    WeightedPoolEncoder.joinInit = (amountsIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]'], [exports.WeightedPoolJoinKind.INIT, amountsIn]);
    /**
     * Encodes the userData parameter for joining a WeightedPool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    WeightedPoolEncoder.joinExactTokensInForBPTOut = (amountsIn, minimumBPT) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [exports.WeightedPoolJoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, amountsIn, minimumBPT]);
    /**
     * Encodes the userData parameter for joining a WeightedPool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param enterTokenIndex - the index of the token to be provided as liquidity
     */
    WeightedPoolEncoder.joinTokenInForExactBPTOut = (bptAmountOut, enterTokenIndex) => abi.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [exports.WeightedPoolJoinKind.TOKEN_IN_FOR_EXACT_BPT_OUT, bptAmountOut, enterTokenIndex]);
    /**
     * Encodes the userData parameter for joining a WeightedPool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    WeightedPoolEncoder.joinAllTokensInForExactBPTOut = (bptAmountOut) => abi.defaultAbiCoder.encode(['uint256', 'uint256'], [exports.WeightedPoolJoinKind.ALL_TOKENS_IN_FOR_EXACT_BPT_OUT, bptAmountOut]);
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing a single token in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param enterTokenIndex - the index of the token to removed from the pool
     */
    WeightedPoolEncoder.exitExactBPTInForOneTokenOut = (bptAmountIn, exitTokenIndex) => abi.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [exports.WeightedPoolExitKind.EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, bptAmountIn, exitTokenIndex]);
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    WeightedPoolEncoder.exitExactBPTInForTokensOut = (bptAmountIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256'], [exports.WeightedPoolExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmountIn]);
    /**
     * Encodes the userData parameter for exiting a WeightedPool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    WeightedPoolEncoder.exitBPTInForExactTokensOut = (amountsOut, maxBPTAmountIn) => abi.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [exports.WeightedPoolExitKind.BPT_IN_FOR_EXACT_TOKENS_OUT, amountsOut, maxBPTAmountIn]);
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
    ManagedPoolEncoder.exitForManagementFees = () => abi.defaultAbiCoder.encode(['uint256'], [exports.WeightedPoolExitKind.MANAGEMENT_FEE_TOKENS_OUT]);

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
            return Array(MaxWeightedTokens).fill(constants.WeiPerEther.div(MaxWeightedTokens));
        }
        const sum = weights.reduce((total, weight) => total.add(weight), constants.Zero);
        if (sum.eq(constants.WeiPerEther))
            return weights;
        const normalizedWeights = [];
        let normalizedSum = constants.Zero;
        for (let index = 0; index < weights.length; index++) {
            if (index < weights.length - 1) {
                normalizedWeights[index] = weights[index].mul(constants.WeiPerEther).div(sum);
                normalizedSum = normalizedSum.add(normalizedWeights[index]);
            }
            else {
                normalizedWeights[index] = constants.WeiPerEther.sub(normalizedSum);
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
        const totalWeight = weights.reduce((total, weight) => total.add(weight), constants.Zero);
        return totalWeight.eq(constants.WeiPerEther);
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
        return bignumber.BigNumber.from(`0x${poolId.slice(46)}`);
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
        if (abstractSigner.Signer.isSigner(account))
            return account.getAddress();
        if (account.address)
            return account.address;
        throw new Error('Could not read account address');
    }
    exports.RelayerAction = void 0;
    (function (RelayerAction) {
        RelayerAction["JoinPool"] = "JoinPool";
        RelayerAction["ExitPool"] = "ExitPool";
        RelayerAction["Swap"] = "Swap";
        RelayerAction["BatchSwap"] = "BatchSwap";
        RelayerAction["SetRelayerApproval"] = "SetRelayerApproval";
    })(exports.RelayerAction || (exports.RelayerAction = {}));
    class RelayerAuthorization {
        /**
         * Cannot be constructed.
         */
        constructor() {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
        }
    }
    RelayerAuthorization.encodeCalldataAuthorization = (calldata, deadline, signature) => {
        const encodedDeadline = bytes.hexZeroPad(bytes.hexValue(deadline), 32).slice(2);
        const { v, r, s } = bytes.splitSignature(signature);
        const encodedV = bytes.hexZeroPad(bytes.hexValue(v), 32).slice(2);
        const encodedR = r.slice(2);
        const encodedS = s.slice(2);
        return `${calldata}${encodedDeadline}${encodedV}${encodedR}${encodedS}`;
    };
    RelayerAuthorization.signJoinAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(exports.RelayerAction.JoinPool, validator, user, allowedSender, allowedCalldata, deadline, nonce);
    RelayerAuthorization.signExitAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(exports.RelayerAction.ExitPool, validator, user, allowedSender, allowedCalldata, deadline, nonce);
    RelayerAuthorization.signSwapAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(exports.RelayerAction.Swap, validator, user, allowedSender, allowedCalldata, deadline, nonce);
    RelayerAuthorization.signBatchSwapAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(exports.RelayerAction.BatchSwap, validator, user, allowedSender, allowedCalldata, deadline, nonce);
    RelayerAuthorization.signSetRelayerApprovalAuthorization = (validator, user, allowedSender, allowedCalldata, deadline, nonce) => RelayerAuthorization.signAuthorizationFor(exports.RelayerAction.SetRelayerApproval, validator, user, allowedSender, allowedCalldata, deadline, nonce);
    RelayerAuthorization.signAuthorizationFor = async (type, validator, user, allowedSender, allowedCalldata, deadline = constants.MaxUint256, nonce) => {
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

    const signPermit = async (token, owner, spender, amount, deadline = constants.MaxUint256, nonce) => {
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
        return { ...bytes.splitSignature(signature), deadline: bignumber.BigNumber.from(deadline), nonce: bignumber.BigNumber.from(nonce) };
    };

    const cmpTokens = (tokenA, tokenB) => (tokenA.toLowerCase() > tokenB.toLowerCase() ? 1 : -1);
    const transposeMatrix = (matrix) => matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
    class AssetHelpers {
        constructor(wethAddress) {
            this.ETH = constants.AddressZero;
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
            this.translateToERC20 = (token) => (this.isETH(token) ? this.WETH : token);
            this.WETH = address.getAddress(wethAddress);
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
    AssetHelpers.isEqual = (addressA, addressB) => address.getAddress(addressA) === address.getAddress(addressB);

    var aTokenRateProviderAbi = [
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
            const rateProviderContract = new contracts.Contract(rateProviderAddress, aTokenRateProviderAbi, provider);
            const rate = await rateProviderContract.getRate();
            return rate.toString();
        }
    }

    const isSameAddress = (address1, address2) => address.getAddress(address1) === address.getAddress(address2);

    exports.PoolSpecialization = void 0;
    (function (PoolSpecialization) {
        PoolSpecialization[PoolSpecialization["GeneralPool"] = 0] = "GeneralPool";
        PoolSpecialization[PoolSpecialization["MinimalSwapInfoPool"] = 1] = "MinimalSwapInfoPool";
        PoolSpecialization[PoolSpecialization["TwoTokenPool"] = 2] = "TwoTokenPool";
    })(exports.PoolSpecialization || (exports.PoolSpecialization = {}));
    // Balance Operations
    exports.UserBalanceOpKind = void 0;
    (function (UserBalanceOpKind) {
        UserBalanceOpKind[UserBalanceOpKind["DepositInternal"] = 0] = "DepositInternal";
        UserBalanceOpKind[UserBalanceOpKind["WithdrawInternal"] = 1] = "WithdrawInternal";
        UserBalanceOpKind[UserBalanceOpKind["TransferInternal"] = 2] = "TransferInternal";
        UserBalanceOpKind[UserBalanceOpKind["TransferExternal"] = 3] = "TransferExternal";
    })(exports.UserBalanceOpKind || (exports.UserBalanceOpKind = {}));
    exports.PoolBalanceOpKind = void 0;
    (function (PoolBalanceOpKind) {
        PoolBalanceOpKind[PoolBalanceOpKind["Withdraw"] = 0] = "Withdraw";
        PoolBalanceOpKind[PoolBalanceOpKind["Deposit"] = 1] = "Deposit";
        PoolBalanceOpKind[PoolBalanceOpKind["Update"] = 2] = "Update";
    })(exports.PoolBalanceOpKind || (exports.PoolBalanceOpKind = {}));

    exports.SwapType = void 0;
    (function (SwapType) {
        SwapType[SwapType["SwapExactIn"] = 0] = "SwapExactIn";
        SwapType[SwapType["SwapExactOut"] = 1] = "SwapExactOut";
    })(exports.SwapType || (exports.SwapType = {}));

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
            sender: constants.AddressZero,
            recipient: constants.AddressZero,
            fromInternalBalance: false,
            toInternalBalance: false,
        };
        try {
            const deltas = await vaultContract.queryBatchSwap(swapType, swaps, assets, funds);
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
            await sor.fetchPools([], queryWithSor.fetchPools.fetchOnChain);
        const swaps = [];
        const assetArray = [];
        // get path information for each tokenIn
        for (let i = 0; i < queryWithSor.tokensIn.length; i++) {
            const swap = await getSorSwapInfo(queryWithSor.tokensIn[i], queryWithSor.tokensOut[i], queryWithSor.swapType, queryWithSor.amounts[i].toString(), sor);
            swaps.push(swap.swaps);
            assetArray.push(swap.tokenAddresses);
        }
        // Join swaps and assets together correctly
        const batchedSwaps = batchSwaps(assetArray, swaps);
        const returnTokens = queryWithSor.swapType === exports.SwapType.SwapExactIn
            ? queryWithSor.tokensOut
            : queryWithSor.tokensIn;
        const returnAmounts = Array(returnTokens.length).fill(constants.Zero);
        let deltas = Array(batchedSwaps.assets.length).fill(constants.Zero);
        try {
            // Onchain query
            deltas = await queryBatchSwap(vaultContract, queryWithSor.swapType, batchedSwaps.swaps, batchedSwaps.assets);
            if (deltas.length > 0) {
                returnTokens.forEach((t, i) => {
                    var _a;
                    return (returnAmounts[i] =
                        (_a = deltas[batchedSwaps.assets.indexOf(t.toLowerCase())].toString()) !== null && _a !== void 0 ? _a : constants.Zero.toString());
                });
            }
        }
        catch (err) {
            console.error(`queryBatchSwapTokensIn error: ${err}`);
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
    async function getSorSwapInfo(tokenIn, tokenOut, swapType, amount, sor$1) {
        const swapTypeSOR = swapType === exports.SwapType.SwapExactIn
            ? sor.SwapTypes.SwapExactIn
            : sor.SwapTypes.SwapExactOut;
        const swapInfo = await sor$1.getSwaps(tokenIn.toLowerCase(), tokenOut.toLowerCase(), swapTypeSOR, amount);
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

    const balancerVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

    /*
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
        const limits = new Array(assets.length).fill(constants.Zero);
        assets.forEach((token, i) => {
            if (tokensIn.some(tokenIn => isSameAddress(token, tokenIn))) {
                // For SwapExactOut slippage is on tokenIn, i.e. amtIn + slippage
                const slippageAmount = bignumber.BigNumber.from(slippage).add(constants.WeiPerEther);
                limits[i] = swapType === exports.SwapType.SwapExactOut ? limits[i].add(bignumber.BigNumber.from(deltas[i]).mul(slippageAmount).div(constants.WeiPerEther)) : limits[i].add(deltas[i]);
            }
            if (tokensOut.some(tokenOut => isSameAddress(token, tokenOut))) {
                // For SwapExactIn slippage is on tokenOut, i.e. amtOut - slippage
                const slippageAmount = constants.WeiPerEther.sub(bignumber.BigNumber.from(slippage));
                limits[i] = swapType === exports.SwapType.SwapExactIn ? limits[i].add(bignumber.BigNumber.from(deltas[i]).mul(slippageAmount).div(constants.WeiPerEther)) : limits[i].add(deltas[i]);
            }
        });
        return limits;
    }

    var vaultAbi = [
    	{
    		inputs: [
    			{
    				internalType: "contract IAuthorizer",
    				name: "authorizer",
    				type: "address"
    			},
    			{
    				internalType: "contract IWETH",
    				name: "weth",
    				type: "address"
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
    				internalType: "contract IAuthorizer",
    				name: "newAuthorizer",
    				type: "address"
    			}
    		],
    		name: "AuthorizerChanged",
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
    				indexed: true,
    				internalType: "address",
    				name: "sender",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "address",
    				name: "recipient",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "amount",
    				type: "uint256"
    			}
    		],
    		name: "ExternalBalanceTransfer",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "contract IFlashLoanRecipient",
    				name: "recipient",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "contract IERC20",
    				name: "token",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "amount",
    				type: "uint256"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "feeAmount",
    				type: "uint256"
    			}
    		],
    		name: "FlashLoan",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "address",
    				name: "user",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "contract IERC20",
    				name: "token",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "int256",
    				name: "delta",
    				type: "int256"
    			}
    		],
    		name: "InternalBalanceChanged",
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
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: true,
    				internalType: "address",
    				name: "liquidityProvider",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			},
    			{
    				indexed: false,
    				internalType: "int256[]",
    				name: "deltas",
    				type: "int256[]"
    			},
    			{
    				indexed: false,
    				internalType: "uint256[]",
    				name: "protocolFeeAmounts",
    				type: "uint256[]"
    			}
    		],
    		name: "PoolBalanceChanged",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: true,
    				internalType: "address",
    				name: "assetManager",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "contract IERC20",
    				name: "token",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "int256",
    				name: "cashDelta",
    				type: "int256"
    			},
    			{
    				indexed: false,
    				internalType: "int256",
    				name: "managedDelta",
    				type: "int256"
    			}
    		],
    		name: "PoolBalanceManaged",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: true,
    				internalType: "address",
    				name: "poolAddress",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "enum IVault.PoolSpecialization",
    				name: "specialization",
    				type: "uint8"
    			}
    		],
    		name: "PoolRegistered",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "address",
    				name: "relayer",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "address",
    				name: "sender",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "bool",
    				name: "approved",
    				type: "bool"
    			}
    		],
    		name: "RelayerApprovalChanged",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: true,
    				internalType: "contract IERC20",
    				name: "tokenIn",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "contract IERC20",
    				name: "tokenOut",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "amountIn",
    				type: "uint256"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "amountOut",
    				type: "uint256"
    			}
    		],
    		name: "Swap",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: false,
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			}
    		],
    		name: "TokensDeregistered",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				indexed: false,
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			},
    			{
    				indexed: false,
    				internalType: "address[]",
    				name: "assetManagers",
    				type: "address[]"
    			}
    		],
    		name: "TokensRegistered",
    		type: "event"
    	},
    	{
    		inputs: [
    		],
    		name: "WETH",
    		outputs: [
    			{
    				internalType: "contract IWETH",
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
    			}
    		],
    		name: "batchSwap",
    		outputs: [
    			{
    				internalType: "int256[]",
    				name: "assetDeltas",
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
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			}
    		],
    		name: "deregisterTokens",
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
    			}
    		],
    		name: "exitPool",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "contract IFlashLoanRecipient",
    				name: "recipient",
    				type: "address"
    			},
    			{
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			},
    			{
    				internalType: "uint256[]",
    				name: "amounts",
    				type: "uint256[]"
    			},
    			{
    				internalType: "bytes",
    				name: "userData",
    				type: "bytes"
    			}
    		],
    		name: "flashLoan",
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
    			{
    				internalType: "address",
    				name: "user",
    				type: "address"
    			},
    			{
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			}
    		],
    		name: "getInternalBalance",
    		outputs: [
    			{
    				internalType: "uint256[]",
    				name: "balances",
    				type: "uint256[]"
    			}
    		],
    		stateMutability: "view",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "address",
    				name: "user",
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
    			{
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			}
    		],
    		name: "getPool",
    		outputs: [
    			{
    				internalType: "address",
    				name: "",
    				type: "address"
    			},
    			{
    				internalType: "enum IVault.PoolSpecialization",
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
    				internalType: "bytes32",
    				name: "poolId",
    				type: "bytes32"
    			},
    			{
    				internalType: "contract IERC20",
    				name: "token",
    				type: "address"
    			}
    		],
    		name: "getPoolTokenInfo",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "cash",
    				type: "uint256"
    			},
    			{
    				internalType: "uint256",
    				name: "managed",
    				type: "uint256"
    			},
    			{
    				internalType: "uint256",
    				name: "lastChangeBlock",
    				type: "uint256"
    			},
    			{
    				internalType: "address",
    				name: "assetManager",
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
    			}
    		],
    		name: "getPoolTokens",
    		outputs: [
    			{
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
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
    				internalType: "contract ProtocolFeesCollector",
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
    				name: "user",
    				type: "address"
    			},
    			{
    				internalType: "address",
    				name: "relayer",
    				type: "address"
    			}
    		],
    		name: "hasApprovedRelayer",
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
    						internalType: "enum IVault.PoolBalanceOpKind",
    						name: "kind",
    						type: "uint8"
    					},
    					{
    						internalType: "bytes32",
    						name: "poolId",
    						type: "bytes32"
    					},
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
    				internalType: "struct IVault.PoolBalanceOp[]",
    				name: "ops",
    				type: "tuple[]"
    			}
    		],
    		name: "managePoolBalance",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
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
    			}
    		],
    		name: "queryBatchSwap",
    		outputs: [
    			{
    				internalType: "int256[]",
    				name: "",
    				type: "int256[]"
    			}
    		],
    		stateMutability: "view",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "enum IVault.PoolSpecialization",
    				name: "specialization",
    				type: "uint8"
    			}
    		],
    		name: "registerPool",
    		outputs: [
    			{
    				internalType: "bytes32",
    				name: "",
    				type: "bytes32"
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
    				internalType: "contract IERC20[]",
    				name: "tokens",
    				type: "address[]"
    			},
    			{
    				internalType: "address[]",
    				name: "assetManagers",
    				type: "address[]"
    			}
    		],
    		name: "registerTokens",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "contract IAuthorizer",
    				name: "newAuthorizer",
    				type: "address"
    			}
    		],
    		name: "setAuthorizer",
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
    				internalType: "address",
    				name: "sender",
    				type: "address"
    			},
    			{
    				internalType: "address",
    				name: "relayer",
    				type: "address"
    			},
    			{
    				internalType: "bool",
    				name: "approved",
    				type: "bool"
    			}
    		],
    		name: "setRelayerApproval",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
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
    			}
    		],
    		name: "swap",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "amountCalculated",
    				type: "uint256"
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

    class SwapsService {
        constructor(config) {
            this.network = config.network;
            this.rpcUrl = config.rpcUrl;
            const provider = new providers.JsonRpcProvider(this.rpcUrl);
            this.sor = new sor.SOR(provider, this.network, config.subgraphUrl);
        }
        static getLimitsForSlippage(tokensIn, tokensOut, swapType, deltas, assets, slippage) {
            // TO DO - Check best way to do this?
            const limits = getLimitsForSlippage(tokensIn, tokensOut, swapType, deltas, assets, slippage);
            return limits.map(l => l.toString());
        }
        /**
         * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
         * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
         * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
         * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
         */
        async fetchPools(poolsData = [], isOnChain = true) {
            return this.sor.fetchPools(poolsData, isOnChain);
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
            // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
            const provider = new providers.JsonRpcProvider(this.rpcUrl);
            const vaultContract = new contracts.Contract(balancerVault, vaultAbi, provider);
            return await queryBatchSwap(vaultContract, batchSwap.kind, batchSwap.swaps, batchSwap.assets);
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
            // TO DO - Pull in a ContractsService and use this to pass Vault to queryBatchSwap.
            const provider = new providers.JsonRpcProvider(this.rpcUrl);
            const vaultContract = new contracts.Contract(balancerVault, vaultAbi, provider);
            return await queryBatchSwapWithSor(this.sor, vaultContract, queryWithSor);
        }
    }

    exports.Network = void 0;
    (function (Network) {
        Network[Network["MAINNET"] = 1] = "MAINNET";
        Network[Network["ROPSTEN"] = 3] = "ROPSTEN";
        Network[Network["RINKEBY"] = 4] = "RINKEBY";
        Network[Network["G\u00D6RLI"] = 5] = "G\u00D6RLI";
        Network[Network["KOVAN"] = 42] = "KOVAN";
        Network[Network["POLYGON"] = 137] = "POLYGON";
        Network[Network["ARBITRUM"] = 42161] = "ARBITRUM";
    })(exports.Network || (exports.Network = {}));

    const SUBGRAPH_URLS = {
        [exports.Network.MAINNET]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        [exports.Network.GÖRLI]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
        [exports.Network.KOVAN]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
        [exports.Network.POLYGON]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
        [exports.Network.ARBITRUM]: `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2`,
    };

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

    class RelayerService {
        constructor(swapsService, rpcUrl) {
            this.swapsService = swapsService;
            this.rpcUrl = rpcUrl;
        }
        static encodeBatchSwap(params) {
            const relayerLibrary = new abi.Interface(relayerLibraryAbi);
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
            const relayerLibrary = new abi.Interface(relayerLibraryAbi);
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
            const aaveWrappingLibrary = new abi.Interface(aaveWrappingAbi);
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
            const paddedPrefix = `0x${RelayerService.CHAINED_REFERENCE_PREFIX}${'0'.repeat(64 - RelayerService.CHAINED_REFERENCE_PREFIX.length)}`;
            return bignumber.BigNumber.from(paddedPrefix).add(key);
        }
        /**
         * exitPoolAndBatchSwap Chains poolExit with batchSwap to final tokens.
         * @param {ExitAndBatchSwapInput} params
         * @param {string} exiter - Address used to exit pool.
         * @param {string} swapRecipient - Address that receives final tokens.
         * @param {string} poolId - Id of pool being exited.
         * @param {string[]} exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
         * @param {string} userData - Encoded exitPool data.
         * @param {string[]} minExitAmountsOut - Minimum amounts of exitTokens to receive when exiting pool.
         * @param {string[]} finalTokensOut - Array containing the addresses of the final tokens out.
         * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
         * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
         * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
         */
        async exitPoolAndBatchSwap(params) {
            // Creates exitPool request with exit to internal balance to save gas for following swaps
            const exitPoolRequest = {
                assets: params.exitTokens,
                minAmountsOut: params.minExitAmountsOut,
                userData: params.userData,
                toInternalBalance: true,
            };
            // Output of exit is used as input to swaps
            const outputReferences = [];
            exitPoolRequest.assets.forEach((asset, i) => {
                const key = RelayerService.toChainedReference(i);
                outputReferences.push({
                    index: i,
                    key: key,
                });
            });
            const exitPoolInput = {
                poolId: params.poolId,
                poolKind: 0,
                sender: params.exiter,
                recipient: params.exiter,
                outputReferences: outputReferences,
                exitPoolRequest,
            };
            // Useful for debugging issues with incorrect amounts/limits
            // const tempAmts = exitPoolInput.exitPoolRequest.minAmountsOut;
            // exitPoolInput.exitPoolRequest.minAmountsOut =
            //     exitPoolInput.exitPoolRequest.minAmountsOut.map(() => '0');
            const exitEncoded = RelayerService.encodeExitPool(exitPoolInput);
            // Use swapsService to get swap info for exitTokens>finalTokens
            const queryResult = await this.swapsService.queryBatchSwapWithSor({
                tokensIn: exitPoolInput.exitPoolRequest.assets,
                tokensOut: params.finalTokensOut,
                swapType: exports.SwapType.SwapExactIn,
                amounts: exitPoolInput.exitPoolRequest.minAmountsOut,
                fetchPools: params.fetchPools,
            });
            // Update swap amounts with ref outputs from exitPool
            queryResult.swaps.forEach((swap) => {
                const token = queryResult.assets[swap.assetInIndex];
                const index = exitPoolInput.exitPoolRequest.assets.indexOf(token);
                if (index !== -1)
                    swap.amount = outputReferences[index].key.toString(); // RelayerService.toChainedReference(index);
            });
            // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug
            // Gets limits array based on input slippage
            // Can cause issues for exitExactBPTInForTokensOut if minAmountsOut is innacurate as this is use to get swap amounts
            const limits = SwapsService.getLimitsForSlippage(exitPoolInput.exitPoolRequest.assets, // tokensIn
            params.finalTokensOut, // tokensOut
            exports.SwapType.SwapExactIn, queryResult.deltas, // tempDeltas // Useful for debug
            queryResult.assets, params.slippage);
            // Creates fund management using internal balance as source of tokens
            const funds = {
                sender: params.exiter,
                recipient: params.swapRecipient,
                fromInternalBalance: true,
                toInternalBalance: false,
            };
            const encodedBatchSwap = RelayerService.encodeBatchSwap({
                swapType: exports.SwapType.SwapExactIn,
                swaps: queryResult.swaps,
                assets: queryResult.assets,
                funds: funds,
                limits: limits.map((l) => l.toString()),
                deadline: constants.MaxUint256,
                value: '0',
                outputReferences: [],
            });
            // Return amounts from swap
            const calls = [exitEncoded, encodedBatchSwap];
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
            fetchOnChain: false
        }) {
            // Use swapsService to get swap info for tokensIn>wrappedTokens
            const queryResult = await this.swapsService.queryBatchSwapWithSor({
                tokensIn,
                tokensOut: aaveStaticTokens,
                swapType: exports.SwapType.SwapExactIn,
                amounts: amountsIn,
                fetchPools,
            });
            // Gets limits array for tokensIn>wrappedTokens based on input slippage
            const limits = SwapsService.getLimitsForSlippage(tokensIn, // tokensIn
            aaveStaticTokens, // tokensOut
            exports.SwapType.SwapExactIn, queryResult.deltas, queryResult.assets, slippage);
            const calls = this.encodeSwapUnwrap(aaveStaticTokens, exports.SwapType.SwapExactIn, queryResult.swaps, queryResult.assets, funds, limits);
            const amountsUnwrapped = queryResult.returnAmounts.map((amountWrapped, i) => bignumber.BigNumber.from(amountWrapped)
                .abs()
                .mul(rates[i])
                .div(constants.WeiPerEther));
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
            fetchOnChain: false
        }) {
            const amountsWrapped = amountsUnwrapped.map((amountInwrapped, i) => bignumber.BigNumber.from(amountInwrapped).mul(constants.WeiPerEther).div(rates[i]).toString());
            // Use swapsService to get swap info for tokensIn>wrappedTokens
            const queryResult = await this.swapsService.queryBatchSwapWithSor({
                tokensIn,
                tokensOut: aaveStaticTokens,
                swapType: exports.SwapType.SwapExactOut,
                amounts: amountsWrapped,
                fetchPools
            });
            // Gets limits array for tokensIn>wrappedTokens based on input slippage
            const limits = SwapsService.getLimitsForSlippage(tokensIn, // tokensIn
            aaveStaticTokens, // tokensOut
            exports.SwapType.SwapExactOut, queryResult.deltas, queryResult.assets, slippage);
            const calls = this.encodeSwapUnwrap(aaveStaticTokens, exports.SwapType.SwapExactOut, queryResult.swaps, queryResult.assets, funds, limits);
            return {
                function: 'multicall',
                params: calls,
                outputs: {
                    amountsIn: queryResult.returnAmounts.toString(),
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
                const key = RelayerService.toChainedReference(i);
                outputReferences.push({
                    index: index,
                    key: key,
                });
                // console.log(`Unwrapping ${wrappedToken} with amt: ${key.toHexString()}`);
                const encodedUnwrap = RelayerService.encodeUnwrapAaveStaticToken({
                    staticToken: wrappedToken,
                    sender: funds.recipient,
                    recipient: funds.sender,
                    amount: key,
                    toUnderlying: true,
                    outputReferences: 0,
                });
                unwrapCalls.push(encodedUnwrap);
            });
            const encodedBatchSwap = RelayerService.encodeBatchSwap({
                swapType: swapType,
                swaps: swaps,
                assets: assets,
                funds: funds,
                limits: limits.map((l) => l.toString()),
                deadline: constants.MaxUint256,
                value: '0',
                outputReferences: outputReferences,
            });
            return [encodedBatchSwap, ...unwrapCalls];
        }
    }
    RelayerService.CHAINED_REFERENCE_PREFIX = 'ba10';

    class BalancerSDK {
        constructor(config, swapService = SwapsService, relayerService = RelayerService) {
            this.network = config.network;
            this.rpcUrl = config.rpcUrl;
            this.swaps = new swapService({
                network: this.network,
                rpcUrl: this.rpcUrl,
                subgraphUrl: config.subgraphUrl
            });
            this.relayer = new relayerService(this.swaps, this.rpcUrl);
        }
    }

    exports.AaveHelpers = AaveHelpers;
    exports.AssetHelpers = AssetHelpers;
    exports.BalancerErrors = BalancerErrors;
    exports.BalancerSDK = BalancerSDK;
    exports.ManagedPoolEncoder = ManagedPoolEncoder;
    exports.RelayerAuthorization = RelayerAuthorization;
    exports.RelayerService = RelayerService;
    exports.SUBGRAPH_URLS = SUBGRAPH_URLS;
    exports.StablePoolEncoder = StablePoolEncoder;
    exports.SwapsService = SwapsService;
    exports.WeightedPoolEncoder = WeightedPoolEncoder;
    exports.accountToAddress = accountToAddress;
    exports.getLimitsForSlippage = getLimitsForSlippage;
    exports.getPoolAddress = getPoolAddress;
    exports.getPoolNonce = getPoolNonce;
    exports.getPoolSpecialization = getPoolSpecialization;
    exports.isNormalizedWeights = isNormalizedWeights;
    exports.isSameAddress = isSameAddress;
    exports.signPermit = signPermit;
    exports.splitPoolId = splitPoolId;
    exports.toNormalizedWeights = toNormalizedWeights;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
