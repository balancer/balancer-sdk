import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';

export function calcPriceImpact(
  bptAmount: bigint,
  bptZeroPriceImpact: bigint,
  isJoin: boolean
): bigint {
  if (isJoin) return calcPriceImpactJoin(bptAmount, bptZeroPriceImpact);
  else return calcPriceImpactExit(bptAmount, bptZeroPriceImpact);
}

function calcPriceImpactJoin(
  bptAmount: bigint,
  bptZeroPriceImpact: bigint
): bigint {
  // 1 - (bptAmount/bptZeroPI)
  const pi = ONE - SolidityMaths.divDownFixed(bptAmount, bptZeroPriceImpact);
  return pi < 0 ? BigInt(0) : pi;
}
function calcPriceImpactExit(
  bptAmount: bigint,
  bptZeroPriceImpact: bigint
): bigint {
  // (bptAmount/bptZeroPI) - 1
  const pi = SolidityMaths.divDownFixed(bptAmount, bptZeroPriceImpact) - ONE;
  return pi < 0 ? BigInt(0) : pi;
}
