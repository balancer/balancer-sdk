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

@param swapType - either exactIn or exactOut.
@param swaps - sequence of swaps.
@param assets - array contains the addresses of all assets involved in the swaps.
@returns Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.

```js
swaps.queryBatchSwap((
    swapType: SwapType,
    swaps: BatchSwapStep[],
    assets: string[]
): Promise<BigNumberish[]>
```

[Example](./examples/queryBatchSwap.ts)

### queryBatchSwapTokensIn

Uses SOR to create and query a batchSwap for multiple tokens in > single tokenOut. For example can be used to join staBal3 with DAI/USDC/USDT.

@param tokensIn - array of addresses of assets in.
@param amountsIn - array of amounts for tokens in.
@param tokenOut - asset out.
@param fetchPools - if true SOR will fetch updated pool info from Subgraph.
@returns Returns amount of tokenOut along with swap and asset info that can be submitted to a batchSwap call.
```js
swaps.queryBatchSwapTokensIn(
    tokensIn: string[],
    amountsIn: BigNumberish[],
    tokenOut: string,
    fetchPools: boolean = true
): Promise<{ amountTokenOut: BigNumberish; swaps: BatchSwapStep[]; assets: string[] }> 
```

[Example](./examples/queryBatchSwapTokensIn.ts)

### queryBatchSwapTokensOut

Uses SOR to create and query a batchSwap for multiple tokens in > single tokenOut. For example can be used to join staBal3 with DAI/USDC/USDT.

@param tokenIn - addresses of asset in.
@param amountsIn - amount of tokenIn for corresponding tokenOut.
@param tokensOut - array of addresses of assets out.
@param fetchPools - if true SOR will fetch updated pool info from Subgraph.
@returns Returns array of amounts for each tokenOut along with swap and asset info that can be submitted to a batchSwap call.
```js
swaps.queryBatchSwapTokensOut(
    tokenIn: string,
    amountsIn: BigNumberish[],
    tokensOut: string[],
    fetchPools: boolean = true
): Promise<{ amountTokenOut: BigNumberish; swaps: BatchSwapStep[]; assets: string[] }> 
```

[Example](./examples/queryBatchSwapTokensOut.ts)

## Licensing

[GNU General Public License Version 3 (GPL v3)](../../LICENSE).
