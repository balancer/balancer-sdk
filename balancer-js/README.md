# Balancer Javascript SDK

A JavaScript SDK which provides commonly used utilties for interacting with Balancer Protocol V2.

```js
import { BalancerSDK } from '@balancer-labs/sdk';

const config = {
  network: 1, // 1 - Mainnet
  rpcUrl: 'https://rpc.ankr.com/eth',
};
const balancer = new BalancerSDK(config);
```

`balancer` variable exposes modules wired with the ethers provider and configuration needed for a specific network.

Modules:

* [swaps](https://docs.balancer.fi/sdk/reference/classes/Swaps.html)
* [pools](https://docs.balancer.fi/sdk/reference/classes/Pools.html)
* [relayer](https://docs.balancer.fi/sdk/reference/classes/Relayer.html)
* [sor](https://docs.balancer.fi/sdk/reference/classes/Sor.html)

## Pricing

Spot Price functionality allowing user to query spot price for token pair.

### calcSpotPrice

Find Spot Price for pair in specific pool.

```js
const balancer = new BalancerSDK(sdkConfig);
const pool = await balancer.pools.find(poolId);
const spotPrice = await pool.calcSpotPrice(
  ADDRESSES[network].DAI.address,
  ADDRESSES[network].BAL.address
);
```

### #getSpotPrice

Find Spot Price for a token pair - finds most liquid path and uses this as reference SP.

```js
const pricing = new Pricing(sdkConfig);

/**
 * @param { string } tokenIn Token in address.
 * @param { string } tokenOut Token out address.
 * @param { SubgraphPoolBase[] } pools Optional - Pool data. Will be fetched via dataProvider if not supplied.
 * @returns { string } Spot price.
*/
async getSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pools: SubgraphPoolBase[] = []
): Promise<string>
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/spotPrice.ts)

## Simulating pool joins and exists

The Balancer Vault provides a [method to simulate join or exit calls to a pool](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/standalone-utils/contracts/BalancerQueries.sol#L91).
These function allows you to perform a dry run before sending an actual transaction, without checking the sender / recipient or token balances / approvals. Note that this function is not 'view' (due to implementation details): the client code must explicitly execute `eth_call` instead of `eth_sendTransaction`.

### Simulating joins

There are two ways to join a pool:

1. `joinExactIn`: Joining the pool with known token amounts. This is the most commonly used method.
2. `joinExactOut`: Asking the pool for the expected liquidity when we know how much BPT we want back.

In this documentation, we will focus on the first method (`joinExactIn`) for joining a pool with known token amounts.

```js
const pool = await sdk.pools.find(poolId);
const maxAmountsIn = pool.tokenList.map(
  (t) => forEachTokenSpecifyAmountYouWantToJoinWith
);
const queryParams = pool.buildQueryJoinExactIn({ maxAmountsIn });
const response = await balancerContracts.balancerHelpers.queryJoin(
  ...queryParams
);
const { bptOut, amountsIn } = response;
```

`response` will return:

- `bptOut`: The expected pool token amount returned by the pool.
- `amountsIn`: The same as maxAmountsIn

### Simulating exits

There are three ways to exit a pool:

1. `exitToSingleToken`: Exiting liquidity to a single underlying token is the simplest method. However, if the amount of liquidity being exited is a significant portion of the pool's total liquidity, it may result in price slippage.
2. `exitProportionally`: Exiting liquidity proportionally to all pool tokens. This is the most commonly used method. However `ComposableStable` pool type doesn't support it.
3. `exitExactOut`: Asking the pool for the expected pool token amount when we know how much token amounts we want back.

In this example, we will focus on the first method (`exitProportionally`).

```js
const pool = await sdk.pools.find(poolId);
const queryParams = pool.buildQueryJoinExactIn({ bptIn });
const response = await balancerContracts.balancerHelpers.queryJoin(
  ...queryParams
);
const { bptIn, amountsOut } = response;
```

`response` will return:

- `amountsOut`: Token amounts returned by the pool.
- `bptIn`: The same as intput bptIn

More examples: https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/queries.ts

## Joining Pools

### #buildInitJoin (Weighted Pool)

Builds a init join transaction for weighted pool.

```js
  /***
   * @param params
   *  * Returns a InitJoinPoolAttributes to make a init join transaction
   *  * @param joiner - The address of the joiner of the pool
   *  * @param poolId - The id of the pool
   *  * @param tokensIn - array with the address of the tokens
   *  * @param amountsIn - array with the amount of each token
   *  * @returns a InitJoinPoolAttributes object, which can be directly inserted in the transaction to init join a weighted pool
   */
  buildInitJoin({
    joiner,
    poolId,
    tokensIn,
    amountsIn,
  }) => InitJoinPoolAttributes
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/weighted/init-join.ts)
Available pool types:

- Weighted

### Joining nested pools

Exposes Join functionality allowing user to join a pool that has pool tokens that are BPTs of other pools, e.g.:

```js
//                  CS0
//               /        \
//             CS1        CS2
//           /    \      /   \
//          DAI   USDC  USDT  FRAX

// Can join with tokens: DAI, USDC, USDT, FRAX, CS1_BPT, CS2_BPT

/**
 * Builds generalised join transaction
 *
 * @param poolId          Pool id
 * @param tokens          Token addresses
 * @param amounts         Token amounts in EVM scale
 * @param userAddress     User address
 * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
 * @param signer          JsonRpcSigner that will sign the staticCall transaction if Static simulation chosen
 * @param simulationType  Simulation type (VaultModel, Tenderly or Static)
 * @param authorisation   Optional auhtorisation call to be added to the chained transaction
 * @returns transaction data ready to be sent to the network along with min and expected BPT amounts out.
 */
generalisedJoin(
  poolId: string,
  tokens: string[],
  amounts: string[],
  userAddress: string,
  slippage: string,
  signer: JsonRpcSigner,
  simulationType: SimulationType,
  authorisation?: string
): Promise<{
  to: string;
  encodedCall: string;
  minOut: string;
  expectedOut: string;
  priceImpact: string;
}>
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/joinGeneralised.ts)


Available pool types:

- Weighted [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/exitExactBPTIn.ts)
- Composable Stable [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/composable-stable/exit.ts)
  - OBS: **Only ComposableStable >V2 supports proportional exits**
- Meta Stable
- Stable

### #buildExitExactTokensOut

Builds an exit transaction with exact tokens out and maximum BPT in based on slippage tolerance.

```js
  /**
   * @param {string}    exiter - Account address exiting pool
   * @param {string[]}  tokensOut - Tokens provided for exiting pool
   * @param {string[]}  amountsOut - Amounts provided for exiting pool
   * @param {string}    slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns           transaction request ready to send with signer.sendTransaction
   */
  buildExitExactTokensOut: (
    exiter: string,
    tokensOut: string[],
    amountsOut: string[],
    slippage: string
  ) => Promise<ExitExactTokensOutAttributes>;
```

where:

```js
/**
 * Exit exact tokens out transaction parameters
 * @param to Address that will execute the transaction (vault address)
 * @param functionName Function name to be called (exitPool)
 * @param attributes Transaction attributes ready to be encoded
 * @param data Encoded transaction data
 * @param expectedBPTIn Expected BPT into exit transaction
 * @param maxBPTIn Max BPT into exit transaction considering slippage tolerance
 */
export interface ExitExactTokensOutAttributes extends ExitPoolAttributes {
  to: string;
  functionName: string;
  attributes: ExitPool;
  data: string;
  expectedBPTIn: string;
  maxBPTIn: string;
}
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/exitExactTokensOut.ts)
<br/><br/>
Available pool types:

- Weighted [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/exitExactTokensOut.ts)
- Composable Stable
- Meta Stable
- Stable

### Exiting nested pools

Exposes Exit functionality allowing user to exit a pool that has pool tokens that are BPTs of other pools, e.g.:

```
                  CS0
              /        \
            CS1        CS2
          /    \      /   \
         DAI   USDC  USDT  FRAX

Can exit with CS0_BPT proportionally to: DAI, USDC, USDT and FRAX
```

```js
/**
   * Builds generalised exit transaction
   *
   * @param poolId          Pool id
   * @param amount          Token amount in EVM scale
   * @param userAddress     User address
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param signer          JsonRpcSigner that will sign the staticCall transaction if Static simulation chosen
   * @param simulationType  Simulation type (VaultModel, Tenderly or Static)
   * @param authorisation   Optional auhtorisation call to be added to the chained transaction
   * @returns transaction data ready to be sent to the network along with tokens, min and expected amounts out.
   */
  async generalisedExit(
    poolId: string,
    amount: string,
    userAddress: string,
    slippage: string,
    signer: JsonRpcSigner,
    simulationType: SimulationType,
    authorisation?: string
  ): Promise<{
    to: string;
    encodedCall: string;
    tokensOut: string[];
    expectedAmountsOut: string[];
    minAmountsOut: string[];
    priceImpact: string;
  }>
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/exitGeneralised.ts)

## Create Pool

Exposes create functionality allowing user to create pools.

### #createWeightedPool

Builds a transaction to create a weighted pool.

```js
/***
 * @param params
 *  * Builds a transaction for a weighted pool create operation.
 *  * @param factoryAddress - The address of the factory for weighted pool (contract address)
 *  * @param name - The name of the pool
 *  * @param symbol - The symbol of the pool
 *  * @param tokenAddresses - The token's addresses
 *  * @param weights The weights for each token, ordered
 *  * @param swapFee - The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
 *  * @param owner - The address of the owner of the pool
 *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a weighted pool
 */
create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    weights,
    swapFee,
    owner,
}) => TransactionRequest
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/weighted/create.ts)

### #createComposableStablePool

Builds a transaction to create a composable stable pool.

```js
  /***
 * @param params
 *  * Builds a transaction for a composable pool create operation.
 *  * @param contractAddress - The address of the factory for composable stable pool (contract address)
 *  * @param name - The name of the pool
 *  * @param symbol - The symbol of the pool
 *  * @param swapFee - The swapFee for the owner of the pool in string or number format(100% is "1.00" or 1, 10% is "0.1" or 0.1, 1% is "0.01" or 0.01)
 *  * @param tokenAddresses - The token's addresses
 *  * @param rateProviders The addresses of the rate providers for each token, ordered
 *  * @param tokenRateCacheDurations the Token Rate Cache Duration of each token
 *  * @param owner - The address of the owner of the pool
 *  * @param amplificationParameter The amplification parameter(must be greater than 1)
 *  * @param exemptFromYieldProtocolFeeFlags array containing boolean for each token exemption from yield protocol fee flags
 *  * @returns a TransactionRequest object, which can be directly inserted in the transaction to create a composable stable pool
 */
create({
    factoryAddress,
    name,
    symbol,
    tokenAddresses,
    amplificationParameter,
    rateProviders,
    tokenRateCacheDurations,
    exemptFromYieldProtocolFeeFlags,
    swapFee,
    owner,
}) => TransactionRequest
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/composable-stable/create.ts)

## RelayerService

Relayers are (user opt-in, audited) contracts that can make calls to the vault (with the transaction “sender” being any arbitrary address) and use the sender’s ERC20 vault allowance, internal balance or BPTs on their behalf.

```js
const relayer = new relayerService(
    swapsService: SwapsService;
    rpcUrl: string;
);
```

### #swapUnwrapAaveStaticExactIn

Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable. ExactIn - Exact amount of tokenIn to use in swap.

```js
/**
 * @param tokensIn - array to token addresses for swapping as tokens in.
 * @param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
 * @param amountsIn - amounts to be swapped for each token in.
 * @param rates - The rate used to convert wrappedToken to underlying.
 * @param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
 * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
 * @param fetchPools - Set whether SOR will fetch updated pool info.
 * @returns Transaction data with calldata. Outputs.amountsOut has final amounts out of unwrapped tokens.
 */
relayer.swapUnwrapAaveStaticExactIn(
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

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/relayerSwapUnwrap.ts)

### #swapUnwrapAaveStaticExactOut

Finds swaps for tokenIn>wrapped Aave static tokens and chains with unwrap to underlying stable. ExactOut - Exact amount of tokens out are used for swaps.

```js
/**
 * @param tokensIn - array to token addresses for swapping as tokens in.
 * @param aaveStaticTokens - array contains the addresses of the Aave static tokens that tokenIn will be swapped to. These will be unwrapped.
 * @param amountsUnwrapped - amounts of unwrapped tokens out.
 * @param rates - The rate used to convert wrappedToken to underlying.
 * @param funds - Funding info for swap. Note - recipient should be relayer and sender should be caller.
 * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
 * @param fetchPools - Set whether SOR will fetch updated pool info.
 * @returns Transaction data with calldata. Outputs.amountsIn has the amounts of tokensIn.
 */
relayer.swapUnwrapAaveStaticExactOut(
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

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/relayerSwapUnwrap.ts)

### #exitPoolAndBatchSwap

Chains poolExit with batchSwap to final tokens.

```js
/**
 * @param params:
 * @param exiter - Address used to exit pool.
 * @param swapRecipient - Address that receives final tokens.
 * @param poolId - Id of pool being exited.
 * @param exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
 * @param userData - Encoded exitPool data.
 * @param minExitAmountsOut - Minimum amounts of exitTokens to receive when exiting pool.
 * @param finalTokensOut - Array containing the addresses of the final tokens out.
 * @param slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
 * @param fetchPools - Set whether SOR will fetch updated pool info.
 * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
 */
relayer.exitPoolAndBatchSwap(
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

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/relayerExitPoolAndBatchSwap.ts)

## Pools Impermanent Loss

> impermanent loss (IL) describes the percentage by which a pool is worth less than what one would have if they had instead just held the tokens outside the pool

#### Service

![class-diagram](/images/IL-class.png)

#### Algorithm

Using the variation delta formula:

![img.png](/images/img.png)

where **𝚫P<sup>i</sup>** represents the difference between the price for a single token at the date of joining the pool and the current price.

```javascript
// retrieves pool's tokens
tokens = pool.tokens;
// get weights for tokens
weights = tokens.map((token) => token.weight);
// retrieves current price for tokens
exitPrices = tokens.map((token) => tokenPrices.find(token.address));
// retrieves historical price for tokens
entryPrices = tokens.map((token) =>
  tokenPrices.findBy('timestamp', {
    address: token.address,
    timestamp: timestamp,
  })
);
// retrieves list of pool's assets with prices delta and weights
assets = tokens.map((token) => ({
  priceDelta: this.getDelta(
    entryPrices[token.address],
    exitPrices[token.address]
  ),
  weight: weights[i],
}));

poolValueDelta = assets.reduce(
  (result, asset) =>
    result * Math.pow(Math.abs(asset.priceDelta + 1), asset.weight),
  1
);
holdValueDelta = assets.reduce(
  (result, asset) => result + Math.abs(asset.priceDelta + 1) * asset.weight,
  0
);

const IL = poolValueDelta / holdValueDelta - 1;
```

#### Usage

```javascript
impermanentLoss(
  timestamp: number, // the UNIX timestamp from which the IL is desired
  pool: Pool // the pool on which the IL must be calculated
): Promise<number>

const pool = await sdk.pools.find(poolId);
const joins = (await sdk.data.findByUser(userAddress)).filter(
  (it) => it.type === 'Join' && it.poolId === poolId
);
const join = joins[0];
const IL = await pools.impermanentLoss(join.timestamp, pool);
```

[Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/pools/impermanentLoss.ts)

## Claim Tokens

### Service

![classes](/images/claim-incentives-class.png)

### Claim Tokens for a veBAL Holders

#### Pseudocode

- **Get Claimable Rewards**

```javascript
const defaultClaimableTokens = [
  '0x7B50775383d3D6f0215A8F290f2C9e2eEBBEceb2', // bb-a-USD v1
  '0xA13a9247ea42D743238089903570127DdA72fE44', // bb-a-USD v2
  '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
]

const claimableTokens: string[] = userDefinedClaimableTokens ?? defaultClaimableTokens;

const balances = await ClaimService.getClaimableVeBalTokens(userAddress, claimableTokens) {
  return await this.feeDistributor.callStatic.claimTokens(userAddress,claimableTokens);
}

const txData = await getClaimableVeBalTokens.buildClaimVeBalTokensRequest(userAddress, claimableTokens) {
  data = feeDistributorContract.claimBalances(userAddress, claimableTokens);
  to = feeDistributorContract.encodeFunctionData('claimTokens', [userAddress, claimableTokens])
}

//on client
signer.request(txData).then(() => { ... });

```

### Claim Pools Incentives

#### Pseudocode

- **Get Claimable Rewards**

```javascript
gauges = LiquidityGaugesRepository.fetch();
claimableTokensPerGauge = LiquidityGaugesMulticallRepository.getClaimableTokens(gauges, accountAddress) {
  if (MAINNET) {
    claimableTokens = this.multicall.aggregate('claimable_tokens', gauges, accountAddress);
    claimableReward = gauge.rewardData.forEach(this.multicall.aggregate('claimable_reward', gauges, accountAddress, rewardToken);
    return aggregate(claimableReward, claimableTokens);
  } else {
    return gauge.rewardData.forEach(this.multicall.aggregate('claimable_reward', gauges, accountAddress, rewardToken);
  }
};

```

- **Claim Rewards**

it returns encoded callable data to be fed to a signer and then to send to the gauge contract.

```javascript
if (MAINNET) {
  const callData = balancerMinterInterface.encodeFunctionData('mintMany', [
    gaugeAddresses,
  ]);
  return { to: balancerMinterAddress, data: callData };
} else {
  const callData = gaugeClaimHelperInterface.encodeFunctionData(
    'claimRewardsFromGauges',
    [gaugeAddresses, userAddress]
  );
  return { to: gaugeClaimHelperAddress, data: callData };
}
```

## Examples

You can run each example with `npm run examples:run -- examples/exampleName.ts`

**In order to run the examples provided, you need to follow the next steps:**

1. git clone https://github.com/balancer-labs/balancer-sdk.git
2. cd balancer-sdk
3. cd balancer-js
4. Create a .env file in the balancer-js folder
5. In the .env file you will need to define and initialize the following variables

   We have defined both Alchemy and Infura, because some of the examples use Infura, others use Alchemy. However, feel free to modify accordingly and use your favourite one.
   ALCHEMY_URL=[ALCHEMY HTTPS ENDPOINT]  
   INFURA=[Infura API KEY]  
   TRADER_KEY=[MetaMask PRIVATE KEY]  
   Some examples also require the following Tenderly config parameters to be defined:
   TENDERLY_ACCESS_KEY=[TENDERLY API ACCESS KEY]
   TENDERLY_PROJECT=[TENDERLY PROJECT NAME]
   TENDERLY_USER=[TENDERLY USERNAME]

6. Run 'npm run node', this runs a local Hardhat Network
7. Open a new terminal
8. cd to balancer-js
9. Install ts-node using: npm install ts-node
10. Install tsconfig-paths using: npm install --save-dev tsconfig-paths
11. Run one of the provided examples (eg: npm run examples:run -- examples/join.ts)

In some examples we present a way to make end to end trades against mainnet state. To run them you will need to setup a localhost test node using tools like ganache, hardhat, anvil.

Installation instructions for:

- [Hardhat](https://hardhat.org/getting-started/#installation)

  To start a MAINNET forked node:

  - Set env var: `ALCHEMY_URL=[ALCHEMY HTTPS ENDPOINT for MAINNET]`
  - Run: `npm run node`

  To start a GOERLI forked node:

  - Set env var: `ALCHEMY_URL_GOERLI=[ALCHEMY HTTPS ENDPOINT for GOERLI]`
  - Run: `npm run node:goerli`

- [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil#installation) - use with caution, still experimental.

  To start a forked node:

  ```
  anvil -f FORKABLE_RPC_URL (optional pinned block: --fork-block-number XXX)
  ```

## Licensing

[GNU General Public License Version 3 (GPL v3)](../../LICENSE).
