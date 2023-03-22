import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Pool } from '../../types';
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

/**
 * Parse pool info into EVM amounts. Sorts by token order if wrappedNativeAsset param passed.
 * @param pool Pool object to be parsed
 * @param wrappedNativeAsset e.g. wETH address
 * @param unwrapNativeAsset if true, changes wETH address to ETH address
 * @returns parsed pool info
 */
export const parsePoolInfo = (
  pool: Pool,
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
  let balancesEvm = pool.tokens.map((token) =>
    parseFixed(token.balance, token.decimals).toBigInt()
  );
  let weights = pool.tokens.map((token) => {
    return parseFixed(token.weight ?? '1', 18).toBigInt();
  });
  let priceRates = pool.tokens.map((token) => {
    return parseFixed(token.priceRate ?? '1', 18).toBigInt();
  });

  let scalingFactorsRaw = decimals.map((d) => _computeScalingFactor(BigInt(d)));
  let scalingFactors = scalingFactorsRaw.map((sf, i) =>
    SolidityMaths.mulDownFixed(sf, priceRates[i])
  );
  // This assumes token.balance is in human scale (e.g. from SG)
  let upScaledBalances = _upscaleArray(balancesEvm, scalingFactors);
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
