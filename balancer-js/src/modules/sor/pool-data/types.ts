import { BigNumberish } from '@ethersproject/bignumber';

export type MulticallPool = {
  amp?: string[];
  swapFee: string;
  weights?: string[];
  poolTokens: {
    tokens: string[];
    balances: string[];
  };
  totalSupply: string;
  virtualSupply?: string;
  rate?: string;
  actualSupply?: string;
  tokenRates?: string[];
  targets: BigNumberish[];
};
