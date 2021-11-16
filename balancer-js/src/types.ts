import { BigNumberish } from '@ethersproject/bignumber';

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
  minAmountsOut: BigNumberish[];
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
