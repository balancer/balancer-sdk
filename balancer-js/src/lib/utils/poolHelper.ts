import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import {
  SolidityMaths,
  _computeScalingFactor,
  _upscaleArray,
} from '@/lib/utils/solidityMaths';
import { AssetHelpers } from '@/lib/utils/assetHelpers';

export const AMP_PRECISION = 3; // number of decimals -> precision 1000

type ParsedPoolInfo = {
  bptIndex: number;
  higherBalanceTokenIndex: number;
  ampWithPrecision: bigint;
  balancesEvm: bigint[];
  balancesEvmWithoutBpt: bigint[];
  priceRates: bigint[];
  priceRatesWithoutBpt: bigint[];
  swapFeeEvm: bigint;
  poolTokens: string[];
  poolTokensWithoutBpt: string[];
  weights: bigint[];
  scalingFactors: bigint[];
  scalingFactorsWithoutBpt: bigint[];
  scalingFactorsRaw: bigint[];
  scalingFactorsRawWithoutBpt: bigint[];
  upScaledBalances: bigint[];
  upScaledBalancesWithoutBpt: bigint[];
  totalSharesEvm: bigint;
};

export const parseBalancesFromPoolTokens = (
  poolTokens: {
    balance: string;
    decimals?: number;
  }[],
): bigint[] => {
  return poolTokens.map((token) => {
    return parseFixed(token.balance, token.decimals || 18).toBigInt();
  });
};

export const parsePriceRatesFromPoolTokens = (
  poolTokens: {
    priceRate?: string;
  }[],
): bigint[] => {
  return poolTokens.map((token) => {
    return parseFixed(token.priceRate ?? '1', 18).toBigInt();
  });
};

export const parseScalingFactorsRawFromPoolTokens = (
  poolTokens: {
    decimals?: number;
  }[],
): bigint[] => {
  return poolTokens.map((token) => {
    return _computeScalingFactor(BigInt(token.decimals || 18));
  });
};

export const parseScalingFactorsFromPoolTokens = (
  poolTokens: {
    decimals?: number;
    priceRate?: string;
  }[],
  scalingFactorsRaw?: bigint[],
  priceRates?: bigint[]
): bigint[] => {
  const sfRaw = scalingFactorsRaw ?? parseScalingFactorsRawFromPoolTokens(poolTokens);
  const pr = priceRates ?? parsePriceRatesFromPoolTokens(poolTokens);
  return sfRaw.map((sf, i) =>
    SolidityMaths.mulDownFixed(sf, pr[i])
  );
};

export const parseUpscaledBalancesFromPoolTokens = (
  poolTokens: {
    balance: string;
    decimals?: number;
    priceRate?: string;
  }[],
  scalingFactors?: bigint[],
  balancesEvm?: bigint[]
): bigint[] => {
  const sf = scalingFactors ?? parseScalingFactorsFromPoolTokens(poolTokens);
  const balEvm = balancesEvm ?? parseBalancesFromPoolTokens(poolTokens);
  return _upscaleArray(balEvm, sf);
};

/**
 * Parse pool info into EVM amounts. Sorts by token order if wrappedNativeAsset param passed.
 * @param pool Pool object to be parsed
 * @param wrappedNativeAsset e.g. wETH address
 * @param unwrapNativeAsset if true, changes wETH address to ETH address
 * @returns parsed pool info
 */
export const parsePoolInfo = (
  pool: {
    address: string;
    swapFee: string;
    amp?: string;
    totalShares?: string;
    tokens: {
      address: string;
      balance: string;
      weight?: string | null;
      decimals?: number;
      priceRate?: string;
    }[];
  },
  wrappedNativeAsset?: string,
  unwrapNativeAsset?: boolean
): ParsedPoolInfo => {
  let poolTokens = unwrapNativeAsset
    ? pool.tokens.map((token) =>
        token.address === wrappedNativeAsset ? AddressZero : token.address
      )
    : pool.tokens.map((token) => token.address);
  let decimals = pool.tokens.map((token) => {
    return token.decimals ?? 18;
  });
  let balancesEvm = parseBalancesFromPoolTokens(pool.tokens);
  let weights = pool.tokens.map((token) => {
    return parseFixed(token.weight ?? '1', 18).toBigInt();
  });
  let priceRates = parsePriceRatesFromPoolTokens(pool.tokens);
  let scalingFactorsRaw = parseScalingFactorsRawFromPoolTokens(pool.tokens);
  let scalingFactors = parseScalingFactorsFromPoolTokens(pool.tokens, scalingFactorsRaw, priceRates);
  // This assumes token.balance is in human scale (e.g. from SG)
  let upScaledBalances = parseUpscaledBalancesFromPoolTokens(pool.tokens, scalingFactors, balancesEvm);

  if (wrappedNativeAsset) {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    [
      poolTokens,
      decimals,
      scalingFactors,
      scalingFactorsRaw,
      balancesEvm,
      upScaledBalances,
      weights,
      priceRates,
    ] = assetHelpers.sortTokens(
      poolTokens,
      decimals,
      scalingFactors,
      scalingFactorsRaw,
      balancesEvm,
      upScaledBalances,
      weights,
      priceRates
    ) as [
      string[],
      number[],
      bigint[],
      bigint[],
      bigint[],
      bigint[],
      bigint[],
      bigint[]
    ];
  }

  // Solidity maths uses precison method for amp that must be replicated
  const ampWithPrecision = parseFixed(
    pool.amp ?? '1',
    AMP_PRECISION
  ).toBigInt();

  const higherBalanceTokenIndex = upScaledBalances.indexOf(
    SolidityMaths.max(upScaledBalances)
  );

  const scalingFactorsWithoutBpt = [...scalingFactors];
  const scalingFactorsRawWithoutBpt = [...scalingFactorsRaw];
  const poolTokensWithoutBpt = [...poolTokens];
  const balancesEvmWithoutBpt = [...balancesEvm];
  const priceRatesWithoutBpt = [...priceRates];
  const upScaledBalancesWithoutBpt = [...upScaledBalances];

  const bptIndex = poolTokens.indexOf(pool.address);
  if (bptIndex !== -1) {
    scalingFactorsWithoutBpt.splice(bptIndex, 1);
    scalingFactorsRawWithoutBpt.splice(bptIndex, 1);
    poolTokensWithoutBpt.splice(bptIndex, 1);
    balancesEvmWithoutBpt.splice(bptIndex, 1);
    priceRatesWithoutBpt.splice(bptIndex, 1);
    upScaledBalancesWithoutBpt.splice(bptIndex, 1);
  }

  return {
    bptIndex,
    higherBalanceTokenIndex,
    ampWithPrecision,
    balancesEvm,
    balancesEvmWithoutBpt,
    priceRates,
    priceRatesWithoutBpt,
    swapFeeEvm: parseFixed(pool.swapFee, 18).toBigInt(),
    poolTokens,
    poolTokensWithoutBpt,
    weights,
    scalingFactors,
    scalingFactorsWithoutBpt,
    scalingFactorsRaw,
    scalingFactorsRawWithoutBpt,
    upScaledBalances,
    upScaledBalancesWithoutBpt,
    totalSharesEvm: parseFixed(pool.totalShares || '0', 18).toBigInt(),
  };
};
