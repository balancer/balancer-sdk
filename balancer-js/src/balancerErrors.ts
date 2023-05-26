export enum BalancerErrorCode {
  ABOVE_MAX_TOKENS = 'ABOVE_MAX_TOKENS',
  BELOW_MIN_TOKENS = 'BELOW_MIN_TOKENS',
  EXIT_DELTA_AMOUNTS = 'EXIT_DELTA_AMOUNTS',
  FEE_PROVIDER_NOT_PROVIDED = 'FEE_PROVIDER_NOT_PROVIDED',
  GAUGES_HELPER_ADDRESS_NOT_PROVIDED = 'GAUGES_HELPER_ADDRESS_NOT_PROVIDED',
  GAUGES_NOT_FOUND = 'GAUGES_NOT_FOUND',
  GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED = 'GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED',
  GAUGES_REWARD_TOKEN_EMPTY = 'GAUGES_REWARD_TOKEN_EMPTY',
  ILLEGAL_PARAMETER = 'ILLEGAL_PARAMETER',
  INTERNAL_ERROR_INVALID_ABI = 'INTERNAL_ERROR_INVALID_ABI',
  INPUT_LENGTH_MISMATCH = 'INPUT_LENGTH_MISMATCH',
  INPUT_OUT_OF_BOUNDS = 'INPUT_OUT_OF_BOUNDS',
  INPUT_TOKEN_INVALID = 'INPUT_TOKEN_INVALID',
  INVALID_PROTOCOL_ID = 'INVALID_PROTOCOL_ID',
  INVALID_SWAP_FEE_PERCENTAGE = 'INVALID_SWAP_FEE_PERCENTAGE',
  INVALID_WEIGHTS = 'INVALID_WEIGHTS',
  JOIN_DELTA_AMOUNTS = 'JOIN_DELTA_AMOUNTS',
  JOIN_WITH_ZERO_AMOUNT = 'JOIN_WITH_ZERO_AMOUNT',
  MISSING_AMP = 'MISSING_AMP',
  MISSING_DECIMALS = 'MISSING_DECIMALS',
  MISSING_PRICE_RATE = 'MISSING_PRICE_RATE',
  MISSING_TOKENS = 'MISSING_TOKENS',
  MISSING_WEIGHT = 'MISSING_WEIGHT',
  NO_POOL_DATA = 'NO_POOL_DATA',
  NO_VALUE_PARAMETER = 'NO_VALUE_PARAMETER',
  POOL_DOESNT_EXIST = 'POOL_DOESNT_EXIST',
  QUERY_BATCH_SWAP = 'QUERY_BATCH_SWAP',
  RELAY_SWAP_AMOUNTS = 'RELAY_SWAP_AMOUNTS',
  REWARD_TOKEN_ZERO = 'REWARD_TOKEN_ZERO',
  TIMESTAMP_IN_THE_FUTURE = 'TIMESTAMP_IN_THE_FUTURE',
  TOKEN_MISMATCH = 'TOKEN_MISMATCH',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  UNSUPPORTED_POOL_TYPE = 'UNSUPPORTED_POOL_TYPE',
  UNSUPPORTED_POOL_TYPE_VERSION = 'UNSUPPORTED_POOL_TYPE_VERSION',
}

export class BalancerError extends Error {
  constructor(public code: BalancerErrorCode) {
    super(BalancerError.getMessage(code));
    this.name = 'BalancerError';
  }

  static getMessage(code: BalancerErrorCode): string {
    switch (code) {
      case BalancerErrorCode.ABOVE_MAX_TOKENS:
        return 'the array contains more tokens than the maximum allowed';
      case BalancerErrorCode.BELOW_MIN_TOKENS:
        return 'the array does not contain the minimum quantity of tokens';
      case BalancerErrorCode.EXIT_DELTA_AMOUNTS:
        return 'Error when checking exit call deltas';
      case BalancerErrorCode.FEE_PROVIDER_NOT_PROVIDED:
        return 'Fee Provider Repository has not been provided';
      case BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED:
        return 'Liquidity Gauges Helper Contract address has not been provided';
      case BalancerErrorCode.GAUGES_NOT_FOUND:
        return 'Liquidity Gauges not found with given addresses';
      case BalancerErrorCode.GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED:
        return 'Liquidity Gauges Reward Minter Contract address has not been provided';
      case BalancerErrorCode.GAUGES_REWARD_TOKEN_EMPTY:
        return 'No Reward Tokens for Liquidity Gauges provided';
      case BalancerErrorCode.INPUT_LENGTH_MISMATCH:
        return 'input length mismatch';
      case BalancerErrorCode.INPUT_OUT_OF_BOUNDS:
        return 'input out of bounds';
      case BalancerErrorCode.INPUT_TOKEN_INVALID:
        return 'input token invalid';
      case BalancerErrorCode.INVALID_PROTOCOL_ID:
        return 'The provided protocol id does not correspond to a protocol';
      case BalancerErrorCode.INVALID_SWAP_FEE_PERCENTAGE:
        return 'The swap fee needs to be greater than zero and less than 1e17(10%)';
      case BalancerErrorCode.INVALID_WEIGHTS:
        return 'The sum of the weights needs to be equal to 1e18(100%)';
      case BalancerErrorCode.JOIN_DELTA_AMOUNTS:
        return 'Error when checking join call deltas';
      case BalancerErrorCode.JOIN_WITH_ZERO_AMOUNT:
        return 'Cant join pool with 0 amount of token in';
      case BalancerErrorCode.MISSING_AMP:
        return 'missing amp';
      case BalancerErrorCode.MISSING_DECIMALS:
        return 'missing decimals';
      case BalancerErrorCode.MISSING_PRICE_RATE:
        return 'missing price rate';
      case BalancerErrorCode.MISSING_TOKENS:
        return 'missing tokens';
      case BalancerErrorCode.MISSING_WEIGHT:
        return 'missing weight';
      case BalancerErrorCode.NO_POOL_DATA:
        return 'no pool data';
      case BalancerErrorCode.NO_VALUE_PARAMETER:
        return 'Illegal value passed as parameter';
      case BalancerErrorCode.POOL_DOESNT_EXIST:
        return 'balancer pool does not exist';
      case BalancerErrorCode.RELAY_SWAP_AMOUNTS:
        return 'Error when checking swap amounts';
      case BalancerErrorCode.REWARD_TOKEN_ZERO:
        return 'All Zero Values for Reward Tokens';
      case BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE:
        return 'Timestamp cannot be in the future';
      case BalancerErrorCode.TOKEN_MISMATCH:
        return 'token mismatch';
      case BalancerErrorCode.UNSUPPORTED_PAIR:
        return 'unsupported token pair';
      case BalancerErrorCode.UNSUPPORTED_POOL_TYPE:
        return 'unsupported pool type';
      default:
        return 'Unknown error';
    }
  }
}
