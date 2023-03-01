import { SubgraphPoolBase, SwapInfo, SwapTypes } from '@balancer-labs/sor';
import { Vault__factory, Vault } from '@balancer-labs/typechain';
import {
  BatchSwap,
  QuerySimpleFlashSwapParameters,
  QuerySimpleFlashSwapResponse,
  QueryWithSorInput,
  QueryWithSorOutput,
  SimpleFlashSwapParameters,
  FindRouteParameters,
  BuildTransactionParameters,
  SwapAttributes,
  SwapType,
} from './types';
import {
  queryBatchSwap,
  queryBatchSwapWithSor,
  getSorSwapInfo,
} from './queryBatchSwap';
import { balancerVault } from '@/lib/constants/config';
import { getLimitsForSlippage } from './helpers';
import { BalancerSdkConfig } from '@/types';
import { SwapInput } from './types';
import { Sor } from '@/modules/sor/sor.module';
import {
  convertSimpleFlashSwapToBatchSwapParameters,
  querySimpleFlashSwap,
} from './flashSwap';
import {
  SingleSwapBuilder,
  BatchSwapBuilder,
} from '@/modules/swaps/swap_builder';

/**
 * Exposes complete functionality for token swapping. Module is intergrated with the SOR library designed to optimize order routing across Balancer pools for the best possible price execution.
 *
 * Swaps instance can be created directly:
 * ```js
 * import { Swaps } from '@balancer-labs/sdk';
 *
 * const swaps = new Swaps({
 *   network: 1,
 *   rpcUrl: 'https://rpc.ankr.com/eth',
 * });
 * ```
 * or accessed from [[BalancerSDK]] instance.
 * ```js
 * import { BalancerSDK } from '@balancer-labs/sdk';
 *
 * const balancer = new BalancerSDK({
 *   network: 1,
 *   rpcUrl: 'https://rpc.ankr.com/eth',
 * });
 * const { swaps } = balancer;
 * ```
 *
 * The general flow for finding a trade route using SOR (Smart Order Router) includes the following steps:
 *
 * ### Step 1. Pool data fetching
 * The SOR requires information about the available pools and their current status, including the prices of tokens and the liquidity of the pools. It is essential to use the SOR based on up-to-date information, as outdated information can lead to incorrect slippage predictions and potentially result in failed swaps.
 * ```javascript
 * await swaps.fetchPools()
 * ```
 *
 * ### Step 2. Route proposal
 * The SOR determines the optimal trade route based on the available pool data and the desired trade, taking into account factors such as trade size, gas costs, and slippage. When searching for swaps, developers have to choose between two types of swaps:
 *
 * * `findRouteGivenIn`, where the amount of tokens being sent to the pool is known, or
 * * `findRouteGivenOut`, where the amount of tokens received from the pool is known.
 *
 * ```javascript
 * const swapInfo = await swaps.findRouteGivenIn({
 *   tokenIn: '0xstring',          // address of tokenIn
 *   tokenOut: '0xstring',         // address of tokenOut
 *   amount: parseEther('1'),      // BigNumber with a trade amount
 *   gasPrice: parseFixed('1', 9), // BigNumber current gas price
 *   maxPools,                     // number of pool included in path, above 4 is usually a high gas price
 * });
 * ```
 * The SOR returns the trade information, including the optimal trade route, the expected slippage and gas cost, and the estimated trade outcome as `swapInfo`.
 *
 * ```js
 * {
 *   tokenAddresses: string[]      // tokens used in swaps
 *   swaps: SwapV2[]               // swaps calldata
 *   swapAmount: BigNumber
 *   swapAmountForSwaps: BigNumber // used for wrapped assets, eg: stETH / wstETH
 *   returnAmount: BigNumber
 *   returnAmountFromSwaps: BigNumber // used for wrapped assets, eg: stETH/wstETH
 *   returnAmountConsideringFees: BigNumber
 *   tokenIn: string
 *   tokenInForSwaps: string // Used with stETH/wstETH
 *   tokenOut: string
 *   tokenOutFromSwaps: string // Used with stETH/wstETH
 *   marketSp: string
 * }
 * ```
 *
 * ::: details Example response for ETH to wBTC swap
 *
 * ```js
 * {
 *   tokenAddresses: [
 *     '0x0000000000000000000000000000000000000000',
 *     '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
 *   ],
 *   swaps: [
 *     {
 *       poolId: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
 *       assetInIndex: 0,
 *       assetOutIndex: 1,
 *       amount: '1000000000000000000',
 *       userData: '0x',
 *       returnAmount: '7677860'
 *     }
 *   ],
 *   swapAmount: BigNumber { _hex: '0x0de0b6b3a7640000', _isBigNumber: true },
 *   swapAmountForSwaps: BigNumber { _hex: '0x0de0b6b3a7640000', _isBigNumber: true },
 *   returnAmount: BigNumber { _hex: '0x7527a4', _isBigNumber: true },
 *   returnAmountFromSwaps: BigNumber { _hex: '0x7527a4', _isBigNumber: true },
 *   returnAmountConsideringFees: BigNumber { _hex: '0x752543', _isBigNumber: true },
 *   tokenIn: '0x0000000000000000000000000000000000000000',
 *   tokenInForSwaps: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
 *   tokenOut: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
 *   tokenOutFromSwaps: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
 *   marketSp: '13.022594322651878',
 * }
 * ```
 *
 * :::
 *
 * ### Step 3. Transaction encoding
 * To execute the trade, the returned `swapInfo` must be encoded into a transaction, which requires the following information:
 * ```javascript
 * const tx = swaps.buildSwap({
 *   userAddress: '0xstring',    // user address
 *   swapInfo,                   // result from the previous step
 *   kind: SwapType.SwapExactIn, // or SwapExactOut
 *   deadline,                   // BigNumber block timestamp
 *   maxSlippage,                // [bps], eg: 1 == 0.01%, 100 == 1%
 * })
 * ```
 *
 * ### Step 4. Broadcast transaction
 * ```javascript
 * const signer = balancer.provider.getSigner()
 * await signer.sendTransaction({
 *   to: tx.to,
 *   data: tx.data,
 *   value: tx.value
 * })
 * ```
 * @category Swaps
 */
export class Swaps {
  private readonly sor: Sor;
  private chainId: number;
  private vaultContract: Vault;

  // TODO: sorOrConfig - let's make it more predictable and always pass configuration explicitly
  constructor(configOrSor: BalancerSdkConfig | Sor) {
    if (configOrSor instanceof Sor) {
      this.sor = configOrSor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.chainId = (<any>this.sor.provider)['_network']['chainId'];
    } else {
      this.sor = new Sor(configOrSor);
      this.chainId = configOrSor.network as number;
    }

    this.vaultContract = Vault__factory.connect(
      balancerVault,
      this.sor.provider
    );
  }

  static getLimitsForSlippage(
    tokensIn: string[],
    tokensOut: string[],
    swapType: SwapType,
    deltas: string[],
    assets: string[],
    slippage: string
  ): string[] {
    // TO DO - Check best way to do this?
    const limits = getLimitsForSlippage(
      tokensIn,
      tokensOut,
      swapType,
      deltas,
      assets,
      slippage
    );

    return limits.map((l) => l.toString());
  }

  /**
   * Uses SOR to find optimal route for a trading pair and amount.
   *
   * ```js
   * // Uses SOR to find optimal route for a trading pair and amount
   * const route = swaps.findRouteGivenIn({
   *   tokenIn,
   *   tokenOut,
   *   amount,
   *   gasPrice,
   *   maxPools,
   * });
   *
   * // Prepares transaction attributes based on the route
   * const transactionAttributes = swaps.buildSwap({
   *   userAddress,
   *   swapInfo: route,
   *   kind: 0, // 0 - givenIn, 1 - givenOut
   *   deadline,
   *   maxSlippage,
   * });
   *
   * // Extract parameters required for sendTransaction
   * const { to, data, value } = transactionAttributes;
   *
   * // Execution with ethers.js
   * const transactionResponse = await signer.sendTransaction({ to, data, value });
   * ```
   *
   * @param FindRouteParameters
   * @param FindRouteParameters.tokenIn Address
   * @param FindRouteParameters.tokenOut Address
   * @param FindRouteParameters.amount BigNumber with a trade amount
   * @param FindRouteParameters.gasPrice BigNumber current gas price
   * @param FindRouteParameters.maxPools number of pool included in path
   * @returns Best trade route information
   */
  async findRouteGivenIn({
    tokenIn,
    tokenOut,
    amount,
    gasPrice,
    maxPools = 4,
  }: FindRouteParameters): Promise<SwapInfo> {
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
  async findRouteGivenOut({
    tokenIn,
    tokenOut,
    amount,
    gasPrice,
    maxPools,
  }: FindRouteParameters): Promise<SwapInfo> {
    return this.sor.getSwaps(
      tokenIn,
      tokenOut,
      SwapTypes.SwapExactOut,
      amount,
      {
        gasPrice,
        maxPools,
      }
    );
  }

  /**
   * Builds a transaction for a route found with findRouteGivenIn or findRouteGivenOut
   *
   * @param BuildTransactionParameters
   * @param BuildTransactionParameters.userAddress Address
   * @param BuildTransactionParameters.swapInfo result of route finding
   * @param BuildTransactionParameters.kind 0 - givenIn, 1 - givenOut
   * @param BuildTransactionParameters.deadline BigNumber block timestamp
   * @param BuildTransactionParameters.maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildSwap({
    userAddress,
    recipient,
    swapInfo,
    kind,
    deadline,
    maxSlippage,
  }: BuildTransactionParameters): SwapAttributes {
    if (!this.chainId) throw 'Missing network configuration';

    // one vs batch (gas cost optimisation when using single swap)
    const builder =
      swapInfo.swaps.length > 1
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
   * ::: info
   * This method doesn't execute a batchSwap -- it returns an [ABI byte string](https://docs.soliditylang.org/en/latest/abi-spec.html)
   * containing the data of the function call on a contract, which can then be sent to the network to be executed.
   * (ex. [sendTransaction](https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#sendtransaction)).
   * :::
   *
   * [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/batchSwap.ts)
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
  static encodeBatchSwap(batchSwap: BatchSwap): string {
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
   * Encode simple flash swap into a ABI byte string.
   *
   * A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps) is a special type of [batch swap](https://dev.balancer.fi/resources/swaps/batch-swaps)
   * where the caller doesn't need to own or provide any of the input tokens
   * -- the caller is essentially taking a "flash loan" (an uncollateralized loan)
   * from the Balancer Vault. The full amount of the input token must be returned
   * to the Vault by the end of the batch (plus any swap fees), however any excess of
   * an output tokens can be sent to any address.
   *
   * IMPORTANT: A "simple" flash swap is an arbitrage executed with only two tokens and two pools,
   * swapping in the first pool and then back in the second pool for a profit. For more
   * complex flash swaps, you will have to use batch swap directly.
   *
   * Gotchas:
   *
   * - Both pools must have both assets (tokens) for swaps to work
   * - No pool token balances can be zero
   * - If the flash swap isn't profitable, the internal flash loan will fail.
   *
   * Learn more: A [Flash Swap](https://dev.balancer.fi/resources/swaps/flash-swaps).
   *
   * [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/simpleFlashSwap.ts)
   *
   * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
   * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
   * @param {string[]}                    params.poolIds - array of Balancer pool ids
   * @param {string[]}                    params.assets - array of token addresses
   * @param {string}                      params.walletAddress - array of token addresses
   * @returns {string}                    encodedBatchSwapData - Returns an ABI byte string containing the data of the function call on a contract
   */
  static encodeSimpleFlashSwap(params: SimpleFlashSwapParameters): string {
    return this.encodeBatchSwap(
      convertSimpleFlashSwapToBatchSwapParameters(params)
    );
  }

  /**
   * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
   * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
   * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
   * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
   */
  async fetchPools(): Promise<boolean> {
    return this.sor.fetchPools();
  }

  public getPools(): SubgraphPoolBase[] {
    return this.sor.getPools();
  }

  /**
   * queryBatchSwap simulates a call to `batchSwap`, returning an array of Vault asset deltas.
   *
   * The Balancer Vault provides a [method to simulate a call to batchSwap](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/vault/contracts/interfaces/IVault.sol#L644).
   * This function performs no checks on the sender or recipient or token balances or approvals. Note that this function is not 'view' (due to implementation details): the client code must explicitly execute `eth_call` instead of `eth_sendTransaction`.
   *
   * ```js
   * const route = swaps.findRouteGivenIn({
   *   tokenIn,
   *   tokenOut,
   *   amount,
   *   gasPrice,
   *   maxPools,
   * });
   *
   * const deltas = swaps.queryBatchSwap({
   *   kind: SwapType.SwapExactIn,
   *   swaps: route.swaps,
   *   assets: route.assets,
   * });
   * ```
   *
   * [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/queryBatchSwap.ts)
   *
   * @param batchSwap - BatchSwap information used for query.
   * @param {SwapType} batchSwap.kind - either exactIn or exactOut.
   * @param {BatchSwapStep[]} batchSwap.swaps - sequence of swaps.
   * @param {string[]} batchSwap.assets - array contains the addresses of all assets involved in the swaps.
   * @returns {Promise<string[]>} Returns an array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the
   * Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at
   * the same index in the `assets` array.
   */
  async queryBatchSwap(
    batchSwap: Pick<BatchSwap, 'kind' | 'swaps' | 'assets'>
  ): Promise<string[]> {
    return await queryBatchSwap(
      this.vaultContract,
      batchSwap.kind,
      batchSwap.swaps,
      batchSwap.assets
    );
  }

  /**
   * Uses SOR to create and query a batchSwap for multiple tokens in > multiple tokensOut.
   *
   * ```js
   * swaps.queryBatchSwapWithSor(QueryWithSorInput: {
   *   tokensIn: string[],
   *   tokensOut: string[],
   *   swapType: SwapType,
   *   amounts: string[],
   *   fetchPools: FetchPoolsInput
   * }): Promise<QueryWithSorOutput: {
   *   returnAmounts: string[],
   *   swaps: BatchSwapStep[],
   *   assets: string[],
   *   deltas: string[]
   * }>
   * ```
   *
   * @param {QueryWithSorInput} queryWithSor - Swap information used for querying using SOR.
   * @param {string[]} queryWithSor.tokensIn - Array of addresses of assets in.
   * @param {string[]} queryWithSor.tokensOut - Array of addresses of assets out.
   * @param {SwapType} queryWithSor.swapType - Type of Swap, ExactIn/Out.
   * @param {string[]} queryWithSor.amounts - Array of amounts used in swap.
   * @param {FetchPoolsInput} queryWithSor.fetchPools - Set whether SOR will fetch updated pool info.
   * @returns {Promise<QueryWithSorOutput>} Returns amount of tokens swaps along with swap and asset info that can be submitted to a batchSwap call.
   */
  async queryBatchSwapWithSor(
    queryWithSor: QueryWithSorInput
  ): Promise<QueryWithSorOutput> {
    return await queryBatchSwapWithSor(
      this.sor,
      this.vaultContract,
      queryWithSor
    );
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
   * [Example](https://github.com/balancer-labs/balancer-sdk/blob/master/balancer-js/examples/querySimpleFlashSwap.ts)
   *
   * @param {SimpleFlashSwapParameters}   params - BatchSwap information used for query.
   * @param {string}                      params.flashLoanAmount - initial input amount for the flash loan (first asset)
   * @param {string[]}                    params.poolIds - array of Balancer pool ids
   * @param {string[]}                    params.assets - array of token addresses
   * @returns {Promise<{profits: Record<string, string>, isProfitable: boolean}>}       Returns an ethersjs transaction response
   */
  async querySimpleFlashSwap(
    params: Omit<QuerySimpleFlashSwapParameters, 'vaultContract'>
  ): Promise<QuerySimpleFlashSwapResponse> {
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
  async getSorSwap(swapInput: SwapInput): Promise<SwapInfo> {
    return await getSorSwapInfo(
      swapInput.tokenIn,
      swapInput.tokenOut,
      swapInput.swapType,
      swapInput.amount,
      this.sor
    );
  }
}
