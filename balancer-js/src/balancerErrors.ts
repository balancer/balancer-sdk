export enum BalancerErrorCode {
    SWAP_ZERO_RETURN_AMOUNT = 'SWAP_ZERO_RETURN_AMOUNT',
    UNWRAP_ZERO_AMOUNT = 'UNWRAP_ZERO_AMOUNT',
    WRAP_ZERO_AMOUNT = 'WRAP_ZERO_AMOUNT',
    QUERY_BATCH_SWAP = 'QUERY_BATCH_SWAP',
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
            default:
                return 'Unknown error';
        }
    }
}
