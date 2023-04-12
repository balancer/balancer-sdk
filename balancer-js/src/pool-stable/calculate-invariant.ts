import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { AMP_PRECISION } from '@/lib/utils';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

/**********************************************************************************************
 // invariant                                                                                 //
 // D = invariant                                                  D^(n+1)                    //
 // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
 // S = sum of balances                                             n^n P                     //
 // P = product of balances                                                                   //
 // n = number of tokens                                                                      //
 **********************************************************************************************/

export const calculateStableInvariant = (
  amplificationParameter: bigint,
  normalizedBalances: bigint[]
): bigint => {
  const numTokens = normalizedBalances.length;
  const balancesSum: bigint = normalizedBalances.reduce((acc, balance) => {
    return acc + balance;
  }, BigInt(0));
  if (balancesSum === BigInt(0)) {
    return BigInt(0);
  }
  let previousInvariant; // in the for loop, it will compare the invariant from i with the i-1
  let invariant = balancesSum; // invariant starts being the sum of balances, but with each iteration, the invariant variable approximates more from the real invariant.
  const ampTimesTotal = SolidityMaths.mul(
    amplificationParameter,
    BigInt(numTokens)
  );
  // The for loop is to calculate the invariant using Newton-Raphson approximation,
  // which means that it will stop when it comes to the most approximated result of the equation f(D) = 0
  // In python: https://github.com/curvefi/curve-contract/blob/b0bbf77f8f93c9c5f4e415bce9cd71f0cdee960e/contracts/pool-templates/base/SwapTemplateBase.vy#L206
  // Newton-Raphson: A method to find the equation result using a recursive method that does the steps:
  // 1 - Set a random value for x, we will call it x0 (in this case the x is the invariant, and the random value we are using is the balances sum);
  // 2 - finds the y0 for x0, y0 = f(x0);
  // 3 - Calculates the derivative of the function x0, f'(x0), that will be our angular coefficient m;
  // 4 - Finds a x1 using the line equation(y1-y0)=m(x1-x0), with y1=0 and m=f'(x0), equation -> -f(x0) = f'(x0)(x1-x0)
  // 5 - if |x1-x0| < 1, returns x1, if not, repeats the step 2 using the x1 as the new x0;
  // first D' = x0 = sumBalances
  // f(D') = y0
  // f'(D') = m
  // y = 0
  // Invariant Equation = f(x) = x^(n+1)/n^n*P + x*(((A/ampPrecision)*n^n)-1) - (A/ampPrecision)*n^n*S
  // Derivative of Invariant Equation = f'(x) = x^n/n^(n-1)*P + (A/ampPrecision)*n^n - 1
  // (y - y0) = m (x - x0) => (0 -f(D')) = f'(D')*(D-D')
  // -f(D') = f'(D')*(D-D')
  // D = -f(D0)/f'(D') + D'
  // After a few steps...
  // D = g(D')/h(D')
  // g(D') = (A*S*n)/ampPrecision + (n*D'^(n+1)/P*n^n))*D'
  // h(D') = (A*n-ampPrecision)*D'/ampPrecision + (n+1)D'^(n+1)/P*n^n

  for (let i = 0; i < 256; i++) {
    let D_P = invariant;
    normalizedBalances.forEach((normalizedBalance) => {
      //D_P = D^(n+1)/P*(n^n)
      D_P = SolidityMaths.divDownFixed(
        SolidityMaths.mul(D_P, invariant),
        SolidityMaths.mul(normalizedBalance, BigInt(numTokens))
      );
    });
    previousInvariant = invariant;
    const g_D0 = SolidityMaths.mul(
      // (((ampTimesTotal * sum) / AMP_PRECISION) + D_P * numTokens) * invariant
      SolidityMaths.divDown(
        SolidityMaths.mul(ampTimesTotal, balancesSum),
        BigInt(AMP_PRECISION)
      ) + SolidityMaths.mul(D_P, BigInt(numTokens)),
      invariant
    );
    const h_D0 =
      SolidityMaths.divDown(
        // (((ampTimesTotal - _AMP_PRECISION) * invariant) / _AMP_PRECISION) + (numTokens + 1) * D_P
        SolidityMaths.mul(ampTimesTotal - BigInt(AMP_PRECISION), invariant),
        BigInt(AMP_PRECISION)
      ) + SolidityMaths.mul(BigInt(numTokens + 1), D_P);

    invariant = SolidityMaths.divDown(g_D0, h_D0);

    //if the difference between D0 and D1 is less than 1, returns D1
    if (SolidityMaths.abs(invariant - previousInvariant) < 1) {
      return invariant;
    }
  }
  throw new BalancerError(BalancerErrorCode.STABLE_INVARIANT_DIDNT_CONVERGE);
};
