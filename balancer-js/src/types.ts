import { BigNumberish } from '@ethersproject/bignumber';
import { Network } from './lib/constants/network';
import { Contract } from '@ethersproject/contracts';
import { PoolDataService, SubgraphPoolBase, TokenPriceService } from '@balancer-labs/sor';

export type Address = string;

export interface BalancerSdkConfig {
    //use a known network or provide an entirely custom config
    network: Network | BalancerNetworkConfig;
    rpcUrl: string;
    //overwrite the subgraph url if you don't want to use the balancer labs maintained version
    customSubgraphUrl?: string;
    //optionally overwrite parts of the standard SOR config
    sor?: Partial<BalancerSdkSorConfig>;
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

export interface BalancerNetworkConfig {
    chainId: Network;
    addresses: {
        contracts: {
            vault: string;
            multicall: string;
        };
        tokens: {
            wrappedNativeAsset: string;
            lbpRaisingTokens?: string[];
        };
    };
    urls: {
        subgraph: string;
    };
    pools: {
        staBal3Pool?: PoolReference;
        wethStaBal3?: PoolReference;
        bbausd?: PoolReference;
        wethBBausd?: PoolReference;
    };
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

export type Price = { [currency: string]: string };
export type TokenPrices = { [address: string]: Price };

export interface Token {
    address: string;
    decimals: number;
    symbol?: string;
    price?: Price;
    priceRate?: string;
}

export interface PoolToken {
    address: string;
    decimals: number;
    balance: string;
    weight: string | null;
    priceRate?: string;
    symbol?: string;
}

export interface TokenBalance {
    token: Token;
    balance: string;
    weight: string;
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

export interface Pool {
    id: string;
    address: string;
    poolType: string;
    swapFee: string;
    owner?: string;
    factory?: string;
    tokens: PoolToken[];
    tokensList: string[];
    tokenAddresses?: string[];
    totalLiquidity?: string;
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
}