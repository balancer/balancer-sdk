export enum BalancerErrorCode {
  SWAP_ZERO_RETURN_AMOUNT = 'SWAP_ZERO_RETURN_AMOUNT',
  UNWRAP_ZERO_AMOUNT = 'UNWRAP_ZERO_AMOUNT',
  WRAP_ZERO_AMOUNT = 'WRAP_ZERO_AMOUNT',
  QUERY_BATCH_SWAP = 'QUERY_BATCH_SWAP',
  POOL_DOESNT_EXIST = 'POOL_DOESNT_EXIST',
  UNSUPPORTED_POOL_TYPE = 'UNSUPPORTED_POOL_TYPE',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  NO_POOL_DATA = 'NO_POOL_DATA',
}

export class BalancerError extends Error {
  constructor(public code: BalancerErrorCode) {
    super(BalancerError.getMessage(code));
    this.name = 'BalancerError';
  }

  static getMessage(code: BalancerErrorCode): string {
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
      default:
        return 'Unknown error';
    }
  }
}
