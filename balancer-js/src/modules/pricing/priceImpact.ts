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
  return ONE - SolidityMaths.divDownFixed(bptAmount, bptZeroPriceImpact);
}
function calcPriceImpactExit(
  bptAmount: bigint,
  bptZeroPriceImpact: bigint
): bigint {
  // (bptAmount/bptZeroPI) - 1
  return SolidityMaths.divDownFixed(bptAmount, bptZeroPriceImpact) - ONE;
}
