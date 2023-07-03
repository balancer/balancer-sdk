import { Network } from './lib/constants/network';
import type { BigNumberish } from '@ethersproject/bignumber';
import type { Contract } from '@ethersproject/contracts';
import type { PoolDataService, TokenPriceService } from '@balancer-labs/sor';
import type {
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
  JoinPoolAttributes,
} from './modules/pools/pool-types/concerns/types';
import type {
  Findable,
  Searchable,
  LiquidityGauge,
  PoolAttribute,
  TokenAttribute,
  Cacheable,
} from '@/modules/data/types';
import type {
  BaseFeeDistributor,
  GaugeSharesRepository,
  PoolGaugesRepository,
  PoolSharesRepository,
  ProtocolFeesProvider,
  PoolJoinExitRepository,
} from './modules/data';
import type { GraphQLArgs } from './lib/graphql';
import type { AprBreakdown } from '@/modules/pools/apr/apr';
import { SubgraphPoolDataService } from '@/modules/sor/pool-data/subgraphPoolDataService';
import * as Queries from '@/modules/pools/queries/types';

export * from '@/modules/data/types';
export { Network, AprBreakdown };

export type Address = string;

export interface BalancerSdkConfig {
  //use a known network or provide an entirely custom config
  network: Network | BalancerNetworkConfig;
  rpcUrl: string;
  //overwrite the subgraph url if you don't want to use the balancer labs maintained version
  customSubgraphUrl?: string;
  subgraphQuery?: GraphQLQuery;
  //optionally overwrite parts of the standard SOR config
  sor?: Partial<BalancerSdkSorConfig>;
  tenderly?: BalancerTenderlyConfig;
}

export interface BalancerTenderlyConfig {
  accessKey?: string;
  user?: string;
  project?: string;
  blockNumber?: number;
}

export interface BalancerSdkSorConfig {
  //use a built-in service or provide a custom implementation of a TokenPriceService
  //defaults to coingecko
  tokenPriceService: 'coingecko' | 'subgraph' | TokenPriceService;
  //use a built-in service or provide a custom implementation of a PoolDataService
  //defaults to subgraph
  poolDataService: 'subgraph' | PoolDataService;
  //if a custom PoolDataService is provided, on chain balance fetching needs to be handled externally
  //default to true.
  fetchOnChainBalances: boolean;
}

export interface ContractAddresses {
  vault: string;
  multicall: string;
  gaugeClaimHelper?: string;
  balancerHelpers: string;
  balancerMinter?: string;
  lidoRelayer?: string;
  balancerRelayer: string;
  gaugeController?: string;
  feeDistributor?: string;
  veBal?: string;
  veBalProxy?: string;
  protocolFeePercentagesProvider?: string;
  weightedPoolFactory?: string;
  composableStablePoolFactory?: string;

  aaveLinearPoolFactory?: string;
  erc4626LinearPoolFactory?: string;
  eulerLinearPoolFactory?: string;
  gearboxLinearPoolFactory?: string;
  yearnLinearPoolFactory?: string;

  [key: string]: string | undefined;
}

export interface BalancerNetworkConfig {
  chainId: Network;
  addresses: {
    contracts: ContractAddresses;
    tokens: {
      wrappedNativeAsset: string;
      lbpRaisingTokens?: string[];
      stETH?: string;
      wstETH?: string;
      bal: string;
      veBal?: string;
      bbaUsd?: string;
    };
  };
  tenderly?: BalancerTenderlyConfig;
  urls: {
    subgraph: string;
    gaugesSubgraph?: string;
    blockNumberSubgraph?: string;
  };
  thirdParty: {
    coingecko: {
      nativeAssetId: string;
      platformId: string;
    };
  };
  averageBlockTime?: number; // In seconds, used if blockNumberSubgraph not set
  pools: {
    wETHwstETH?: PoolReference;
  };
  poolsToIgnore?: string[];
  sorConnectingTokens?: { symbol: string; address: string }[];
}

export interface BalancerDataRepositories {
  /**
   * Why do we need 3 different pools repositories?
   */
  pools: Findable<Pool, PoolAttribute> & Searchable<Pool>;
  // Does it need to be different from the pools repository?
  poolsForSor: SubgraphPoolDataService;
  // Perhaps better to use a function to get upto date balances when needed.
  poolsOnChain: Findable<Pool, PoolAttribute> &
    Searchable<Pool> &
    Cacheable<Pool>;
  // Replace with a swapFeeRepository, we don't need historic pools for any other reason than to get the swap fee
  yesterdaysPools?: Findable<Pool, PoolAttribute> & Searchable<Pool>;
  tokenPrices: Findable<Price>;
  tokenHistoricalPrices: Findable<Price>;
  tokenMeta: Findable<Token, TokenAttribute>;
  liquidityGauges?: Findable<LiquidityGauge>;
  feeDistributor?: BaseFeeDistributor;
  feeCollector: Findable<number>;
  protocolFees?: ProtocolFeesProvider;
  tokenYields: Findable<number>;
  poolShares: PoolSharesRepository;
  poolGauges?: PoolGaugesRepository;
  poolJoinExits: PoolJoinExitRepository;
  gaugeShares?: GaugeSharesRepository;
}

export type PoolReference = {
  id: string;
  address: string;
};

export enum PoolSpecialization {
  GeneralPool = 0,
  MinimalSwapInfoPool,
  TwoTokenPool,
}

// Joins

export type JoinPoolRequest = {
  assets: string[];
  maxAmountsIn: BigNumberish[];
  userData: string;
  fromInternalBalance: boolean;
};

// Exit

export type ExitPoolRequest = {
  assets: string[];
  minAmountsOut: string[];
  userData: string;
  toInternalBalance: boolean;
};

// Balance Operations

export enum UserBalanceOpKind {
  DepositInternal = 0,
  WithdrawInternal,
  TransferInternal,
  TransferExternal,
}

export type UserBalanceOp = {
  kind: UserBalanceOpKind;
  asset: string;
  amount: BigNumberish;
  sender: string;
  recipient: string;
};

export enum PoolBalanceOpKind {
  Withdraw = 0,
  Deposit = 1,
  Update = 2,
}

export type PoolBalanceOp = {
  kind: PoolBalanceOpKind;
  poolId: string;
  token: string;
  amount: BigNumberish;
};

export interface TransactionData {
  contract?: Contract;
  function: string;
  params: string[];
  outputs?: {
    amountsIn?: string[];
    amountsOut?: string[];
  };
}

export type Currency = 'eth' | 'usd';

export type Price = { [currency in Currency]?: string };
export type TokenPrices = { [address: string]: Price };
export type HistoricalPrices = {
  prices: [[number, number]];
  market_caps: [[number, number]];
  total_volumes: [[number, number]];
};

export interface Token {
  address: string;
  decimals?: number;
  symbol?: string;
  price?: Price;
}

export interface PoolToken extends Token {
  balance: string;
  priceRate?: string;
  weight?: string | null;
  isExemptFromYieldProtocolFee?: boolean;
  token?: SubPoolMeta;
}

export interface SubPoolMeta {
  pool: SubPool | null;
  latestUSDPrice?: string;
  latestFXPrice?: string;
}

export interface SubPool {
  id: string;
  address: string;
  poolType: PoolType;
  totalShares: string;
  mainIndex: number;
  tokens?: PoolToken[];
}

export interface OnchainTokenData {
  balance: string;
  weight: number;
  decimals: number;
  logoURI: string | undefined;
  name: string;
  symbol: string;
}

export interface OnchainPoolData {
  tokens: Record<Address, OnchainTokenData>;
  totalSupply: string;
  decimals: number;
  swapFee: string;
  amp?: string;
  swapEnabled: boolean;
  tokenRates?: string[];
}

export enum PoolType {
  Weighted = 'Weighted',
  Investment = 'Investment',
  Stable = 'Stable',
  ComposableStable = 'ComposableStable',
  MetaStable = 'MetaStable',
  StablePhantom = 'StablePhantom',
  LiquidityBootstrapping = 'LiquidityBootstrapping',
  Element = 'Element',
  Gyro2 = 'Gyro2',
  Gyro3 = 'Gyro3',
  GyroE = 'GyroE',
  Managed = 'Managed',
  // Linear Pools defined below all operate the same mathematically but have different factories and names in Subgraph
  AaveLinear = 'AaveLinear',
  Linear = 'Linear',
  EulerLinear = 'EulerLinear',
  ERC4626Linear = 'ERC4626Linear',
  BeefyLinear = 'BeefyLinear',
  GearboxLinear = 'GearboxLinear',
  MidasLinear = 'MidasLinear',
  ReaperLinear = 'ReaperLinear',
  SiloLinear = 'SiloLinear',
  TetuLinear = 'TetuLinear',
  YearnLinear = 'YearnLinear',
  FX = 'FX',
}

export interface Pool {
  id: string;
  name: string;
  address: string;
  chainId: number;
  poolType: PoolType;
  poolTypeVersion: number;
  swapFee: string;
  protocolYieldFeeCache: string;
  protocolSwapFeeCache: string;
  owner?: string;
  factory?: string;
  tokens: PoolToken[];
  tokensList: string[];
  tokenAddresses?: string[];
  totalLiquidity: string;
  totalShares: string;
  totalSwapFee?: string;
  totalSwapVolume?: string;
  onchain?: OnchainPoolData;
  createTime?: number;
  mainTokens?: string[];
  wrappedTokens?: string[];
  unwrappedTokens?: string[];
  isNew?: boolean;
  volumeSnapshot?: string;
  feesSnapshot?: string;
  boost?: string;
  symbol?: string;
  swapEnabled: boolean;
  amp?: string;
  wrappedIndex?: number;
  mainIndex?: number;
  apr?: AprBreakdown;
  liquidity?: string;
  totalWeight: string;
  lowerTarget: string;
  upperTarget: string;
  priceRateProviders?: PriceRateProvider[];
  lastJoinExitInvariant?: string;
  isInRecoveryMode?: boolean;
  isPaused?: boolean;
  tokenRates?: string[];
}

export interface PriceRateProvider {
  address: string;
  token: {
    address: string;
  };
}

/**
 * Pool use-cases / controller layer
 */
export interface PoolWithMethods extends Pool, Queries.ParamsBuilder {
  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param joiner Account address joining pool
   * @param tokensIn Token addresses provided for joining pool (same length and order as amountsIn)
   * @param amountsIn Token amounts provided for joining pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps i.e. 50 = 0.5%
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildJoin: (
    joiner: string,
    tokensIn: string[],
    amountsIn: string[],
    slippage: string
  ) => JoinPoolAttributes;

  /**
   * Calculate price impact of bptAmount against zero price impact BPT amount.
   * @param tokenAmounts Token amounts. Needs a value for each pool token.
   * @param bptAmount BPT amount for comparison (in EVM scale).
   * @param isJoin boolean indicating if the price impact is for a join or exit.
   * @returns price impact in EVM scale.
   */
  calcPriceImpact: (
    tokenAmounts: string[],
    bptAmount: string,
    isJoin: boolean
  ) => Promise<string>;

  /**
   * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param bptIn BPT provided for exiting pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps. i.e. 50 = 5%
   * @param shouldUnwrapNativeAsset Indicates whether wrapped native asset should be unwrapped after exit. Defaults to false.
   * @param singleTokenOut Optional: token address that if provided will exit to given token
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildExitExactBPTIn: (
    exiter: string,
    bptIn: string,
    slippage: string,
    shouldUnwrapNativeAsset?: boolean,
    singleTokenOut?: string,
    toInternalBalance?: boolean
  ) => ExitExactBPTInAttributes;

  /**
   * Build exit pool transaction parameters with exact tokens out and maximum BPT in based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param tokensOut Tokens provided for exiting pool (same length and order as amountsOut)
   * @param amountsOut Amounts provided for exiting pool in EVM scale
   * @param slippage Maximum slippage tolerance in bps. i.e. 50 = 5%
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildExitExactTokensOut: (
    exiter: string,
    tokensOut: string[],
    amountsOut: string[],
    slippage: string,
    toInternalBalance?: boolean
  ) => ExitExactTokensOutAttributes;

  /**
   * Build recovery exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param exiter Account address exiting pool
   * @param bptIn BPT amount in EVM scale
   * @param slippage Maximum slippage tolerance in basis points. i.e. 50 = 5%
   * @returns transaction request ready to send with signer.sendTransaction
   */
  buildRecoveryExit: (
    exiter: string,
    bptIn: string,
    slippage: string,
    toInternalBalance?: boolean
  ) => ExitExactBPTInAttributes;

  /**
   * Calculate spot price for swapping tokenIn with tokenOut
   * @param tokenIn Token address
   * @param tokenOut Token address
   * @returns spot price for swapping tokenIn with tokenOut in EVM scale
   */
  calcSpotPrice: (tokenIn: string, tokenOut: string) => string;

  bptIndex: number;
}

export interface GraphQLQuery {
  args: GraphQLArgs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs: any;
}

export interface TenderlyRpcTransactionParameters {
  from?: Address; // hex encoded address "from"
  to: Address; // hex encoded address "to"
  gas?: number;
  maxFeePerGas?: number; // max fee: The maximum total fee per gas the sender is willing to pay (includes the network / base fee and miner / priority fee) in wei
  maxPriorityFeePerGas?: number; // max priority fee: Maximum fee per gas the sender is willing to pay to miners in wei
  gasPrice?: number; // The gas price willing to be paid by the sender in wei
  value?: number;
  data?: string;
  accessList?: AccessListTuple[];
}

export interface AccessListTuple {
  address: Address; //  hex encoded address
  storageKeys: string[]; // Array of 32 byte hex encoded storage key
}

export type TenderlyRpcSimulationBlockNumber =
  | string // Block Number or...
  | 'earliest' // Block tag
  | 'finalized'
  | 'safe'
  | 'latest'
  | 'pending';

export interface TenderlyRpcStateOverridesParameters {
  [key: Address]: {
    // the override specification
    nonce?: string; // hex encoded 8 byte nonce override for the account
    code?: string; // data of the code override for the account
    balance?: string; // hex encoded 32 byte balance override for the account in wei
    stateDiff: {
      // mapping of storage key to storage value override
      [key: string]: string; // key: the storage key -- value: the value override for the given storage key
    };
  };
}

export interface TenderlyRpcResponse {
  id: number | string;
  jsonrpc: string;
  result: {
    status: boolean | number;
    gasUsed: string;
    cumulativeGasUsed: string;
    blockNumber: string;
    type: string;
    logsBloom: string;
    logs: TenderlyRpcLog[];
    trace: TenderlyRpcTrace[];
  };
}

export interface TenderlyRpcLog {
  name: string;
  anonymous: boolean | number;
  input: {
    name: string;
    type: string;
    value?: string;
  }[];
  raw: {
    address: string;
    topics: string[];
    data: string;
  };
}

export interface TenderlyRpcTrace {
  type:
    | string
    | 'CALL'
    | 'CALLCODE'
    | 'STATICCALL'
    | 'DELEGATECALL'
    | 'CREATE'
    | 'CREATE2'
    | 'SELFDESTRUCT';
  from: Address;
  to: Address;
  gas: string;
  gasUsed: string;
  value: string;
  error: string;
  errorMessage: string;
  input: string;
  method: string | null;
  decodedInput:
    | {
        value: string;
        type: string;
        name: string;
      }[]
    | null;
  output: string;
  decodedOutput:
    | {
        value: string;
        type: string;
        name: string;
      }[]
    | null;
  subtraces: number;
  traceAddress: number[];
}
