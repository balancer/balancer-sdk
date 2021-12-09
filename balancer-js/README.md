# Balancer Javascript SDK

A JavaScript SDK which provides commonly used utilties for interacting with Balancer Protocol V2.

## Installation


## Getting Started

```js
import { BalancerSDK, ConfigSdk, Network } from '@balancer-labs/sdk';

const config: ConfigSdk = {
    network: Network.MAINNET,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`
} 
const balancer = new BalancerSDK(config);
```

## SwapsService

The SwapsService provides function to query and make swaps using Balancer V2 liquidity.

```js
const swaps = new swapService({
  network: Network;
  rpcUrl: string;
});
```

### queryBatchSwap

The Balancer Vault provides a [method to simulate a call to batchSwap](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/vault/contracts/interfaces/IVault.sol#L644). 
This function performs no checks on the sender or recipient or token balances or approvals. Note that this function is not 'view' (due to implementation details): the client code must explicitly execute eth_call instead of eth_sendTransaction.

@param batchSwap - BatchSwap information used for query.
@param batchSwap.kind - either exactIn or exactOut.
@param batchSwap.swaps - sequence of swaps.
@param batchSwap.assets - array contains the addresses of all assets involved in the swaps.
@returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.

```js
swaps.queryBatchSwap(batchSwap: {
    kind: SwapType,
    swaps: BatchSwapStep[],
    assets: string[]
}): Promise<BigNumberish[]>
```

[Example](./examples/queryBatchSwap.ts)

### queryBatchSwapWithSor

Uses SOR to create and query a batchSwap for multiple tokens in > multiple tokensOut.

@param queryWithSor - Swap information used for querying using SOR.
@param queryWithSor.tokensIn - Array of addresses of assets in.
@param queryWithSor.tokensOut - Array of addresses of assets out.
@param queryWithSor.swapType - Type of Swap, ExactIn/Out.
@param queryWithSor.amounts - Array of amounts used in swap.
@param queryWithSor.fetchPools - Set whether SOR will fetch updated pool info.
@returns Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
```js
swaps.queryBatchSwapWithSor(queryWithSor: {
    tokensIn: string[],
    tokensOut: string[],
    swapType: SwapType,
    amounts: BigNumberish[],
    fetchPools: FetchPoolsInput;
}): 
Promise<QueryWithSorOutput {
    returnAmounts: string[];
    swaps: BatchSwapStep[];
    assets: string[];
    deltas: string[];
}>
```

[Example](./examples/queryBatchSwapWithSor.ts)

## RelayerService

Relayers are (user opt-in, audited) contracts that can make calls to the vault (with the transaction “sender” being any arbitrary address) and use the sender’s ERC20 vault allowance, internal balance or BPTs on their behalf.

```js
const relayer = new relayerService(
    swapsService: SwapsService;
    rpcUrl: string;
);
```

### swapUnwrapAaveStaticExactIn

Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable. ExactIn - Exact amount of tokenIn to use in swap.

@param tokensIn - array to token addresses for swapping as tokens in.
@param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
@param amountsIn - amounts to be swapped for each token in.
@param rates - The rate used to convert wrappedToken to underlying.
@param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
@param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
@param fetchPools - Set whether SOR will fetch updated pool info.
@returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
```js
async relayer.swapUnwrapAaveStaticExactIn(
    tokensIn: string[],
    aaveStaticTokens: string[],
    amountsIn: BigNumberish[],
    rates: BigNumberish[],
    funds: FundManagement,
    slippage: BigNumberish,
    fetchPools: FetchPoolsInput = {
        fetchPools: true,
        fetchOnChain: false
    }
): Promise<TransactionData>
```

[Example](./examples/relayerSwapUnwrap.ts)

### swapUnwrapAaveStaticExactOut

Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable. ExactOut - Exact amount of tokens out are used for swaps.

@param tokensIn - array to token addresses for swapping as tokens in.
@param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
@param amountsUnwrapped - amounts of unwrapped tokens out.
@param rates - The rate used to convert wrappedToken to underlying.
@param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
@param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
@param fetchPools - Set whether SOR will fetch updated pool info.
@returns Transaction data with calldata. Outputs.amountsIn has the amounts of tokensIn.
```js
async relayer.swapUnwrapAaveStaticExactOut(
    tokensIn: string[],
    aaveStaticTokens: string[],
    amountsUnwrapped: BigNumberish[],
    rates: BigNumberish[],
    funds: FundManagement,
    slippage: BigNumberish,
    fetchPools: FetchPoolsInput = {
        fetchPools: true,
        fetchOnChain: false
    }
): Promise<TransactionData>
```

[Example](./examples/relayerSwapUnwrap.ts)

### exitPoolAndBatchSwap

Chains poolExit with batchSwap to final tokens.

@param params:
@param exiter - Address used to exit pool.
@param swapRecipient - Address that receives final tokens.
@param poolId - Id of pool being exited.
@param exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
@param userData - Encoded exitPool data.
@param minExitAmountsOut - Minimum amounts of exitTokens to receive when exiting pool.
@param finalTokensOut - Array containing the addresses of the final tokens out.
@param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
@param fetchPools - Set whether SOR will fetch updated pool info.
@returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
```js
async relayer.exitPoolAndBatchSwap(
    params: ExitAndBatchSwapInput {
        exiter: string;
        swapRecipient: string;
        poolId: string;
        exitTokens: string[];
        userData: string;
        minExitAmountsOut: string[];
        finalTokensOut: string[];
        slippage: string;
        fetchPools: FetchPoolsInput;
    }
): Promise<TransactionData>
```

[Example](./examples/relayerExitPoolAndBatchSwap.ts)

## Licensing

[GNU General Public License Version 3 (GPL v3)](../../LICENSE).
