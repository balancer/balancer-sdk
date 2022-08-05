import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Pool = {
  __typename?: 'Pool';
  address?: Maybe<Scalars['String']>;
  amp?: Maybe<Scalars['String']>;
  chainId: Scalars['Int'];
  createTime?: Maybe<Scalars['Int']>;
  expiryTime?: Maybe<Scalars['String']>;
  factory?: Maybe<Scalars['String']>;
  holdersCount?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  lowerTarget?: Maybe<Scalars['String']>;
  mainIndex?: Maybe<Scalars['Int']>;
  managementFee?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  owner?: Maybe<Scalars['String']>;
  poolType?: Maybe<Scalars['String']>;
  swapEnabled?: Maybe<Scalars['Boolean']>;
  swapFee?: Maybe<Scalars['String']>;
  swapsCount?: Maybe<Scalars['String']>;
  symbol?: Maybe<Scalars['String']>;
  tokens?: Maybe<Array<Maybe<PoolToken>>>;
  tokensList?: Maybe<Array<Maybe<Scalars['String']>>>;
  totalLiquidity?: Maybe<Scalars['String']>;
  totalShares?: Maybe<Scalars['String']>;
  totalSwapFee?: Maybe<Scalars['String']>;
  totalSwapVolume?: Maybe<Scalars['String']>;
  totalWeight?: Maybe<Scalars['String']>;
  unitSeconds?: Maybe<Scalars['String']>;
  upperTarget?: Maybe<Scalars['String']>;
  wrappedIndex?: Maybe<Scalars['Int']>;
};

export type PoolConnection = {
  __typename?: 'PoolConnection';
  items?: Maybe<Array<Maybe<Pool>>>;
  nextToken?: Maybe<Scalars['String']>;
};

export type PoolToken = {
  __typename?: 'PoolToken';
  address?: Maybe<Scalars['String']>;
  balance?: Maybe<Scalars['String']>;
  decimals?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  priceRate?: Maybe<Scalars['String']>;
  symbol?: Maybe<Scalars['String']>;
  weight?: Maybe<Scalars['String']>;
};

export type Query = {
  __typename?: 'Query';
  pools?: Maybe<Array<Maybe<Pool>>>;
};


export type QueryPoolsArgs = {
  chainId: Scalars['Int'];
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Scalars['String']>;
  orderDirection?: InputMaybe<Scalars['String']>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<TablePoolsFilterInput>;
};

export type TableBooleanFilterInput = {
  eq?: InputMaybe<Scalars['Boolean']>;
  ne?: InputMaybe<Scalars['Boolean']>;
};

export type TableFloatFilterInput = {
  between?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
  contains?: InputMaybe<Scalars['Float']>;
  eq?: InputMaybe<Scalars['Float']>;
  ge?: InputMaybe<Scalars['Float']>;
  gt?: InputMaybe<Scalars['Float']>;
  le?: InputMaybe<Scalars['Float']>;
  lt?: InputMaybe<Scalars['Float']>;
  ne?: InputMaybe<Scalars['Float']>;
  notContains?: InputMaybe<Scalars['Float']>;
};

export type TableIdFilterInput = {
  beginsWith?: InputMaybe<Scalars['ID']>;
  between?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  contains?: InputMaybe<Scalars['ID']>;
  eq?: InputMaybe<Scalars['ID']>;
  ge?: InputMaybe<Scalars['ID']>;
  gt?: InputMaybe<Scalars['ID']>;
  le?: InputMaybe<Scalars['ID']>;
  lt?: InputMaybe<Scalars['ID']>;
  ne?: InputMaybe<Scalars['ID']>;
  notContains?: InputMaybe<Scalars['ID']>;
};

export type TableIntFilterInput = {
  between?: InputMaybe<Array<InputMaybe<Scalars['Int']>>>;
  contains?: InputMaybe<Scalars['Int']>;
  eq?: InputMaybe<Scalars['Int']>;
  ge?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  le?: InputMaybe<Scalars['Int']>;
  lt?: InputMaybe<Scalars['Int']>;
  ne?: InputMaybe<Scalars['Int']>;
  notContains?: InputMaybe<Scalars['Int']>;
};

export type TablePoolsFilterInput = {
  address?: InputMaybe<TableStringFilterInput>;
  amp?: InputMaybe<TableIntFilterInput>;
  chainId?: InputMaybe<TableIntFilterInput>;
  createTime?: InputMaybe<TableIntFilterInput>;
  expiryTime?: InputMaybe<TableIntFilterInput>;
  factory?: InputMaybe<TableStringFilterInput>;
  holdersCount?: InputMaybe<TableIntFilterInput>;
  id?: InputMaybe<TableStringFilterInput>;
  lowerTarget?: InputMaybe<TableFloatFilterInput>;
  mainIndex?: InputMaybe<TableIntFilterInput>;
  managementFee?: InputMaybe<TableFloatFilterInput>;
  owner?: InputMaybe<TableStringFilterInput>;
  poolType?: InputMaybe<TableStringFilterInput>;
  swapEnabled?: InputMaybe<TableBooleanFilterInput>;
  swapFee?: InputMaybe<TableFloatFilterInput>;
  swapsCount?: InputMaybe<TableIntFilterInput>;
  tokensList?: InputMaybe<TableStringFilterInput>;
  totalLiquidity?: InputMaybe<TableFloatFilterInput>;
  totalShares?: InputMaybe<TableFloatFilterInput>;
  totalSwapFee?: InputMaybe<TableFloatFilterInput>;
  totalSwapVolume?: InputMaybe<TableFloatFilterInput>;
  totalWeight?: InputMaybe<TableFloatFilterInput>;
  unitSeconds?: InputMaybe<TableIntFilterInput>;
  upperTarget?: InputMaybe<TableFloatFilterInput>;
  wrappedIndex?: InputMaybe<TableIntFilterInput>;
};

export type TableStringFilterInput = {
  beginsWith?: InputMaybe<Scalars['String']>;
  between?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  contains?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  eq?: InputMaybe<Scalars['String']>;
  ge?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  le?: InputMaybe<Scalars['String']>;
  lt?: InputMaybe<Scalars['String']>;
  ne?: InputMaybe<Scalars['String']>;
  notContains?: InputMaybe<Scalars['String']>;
  not_in?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};



export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {

  };
}
export type Sdk = ReturnType<typeof getSdk>;