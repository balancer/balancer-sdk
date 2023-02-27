import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';
import { AMP_PRECISION } from '@/lib/utils';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export const calculateBalanceGivenInvariantAndAllOtherBalances = ({
  amplificationParameter,
  balances,
  invariant,
  tokenIndex,
}: {
  amplificationParameter: bigint;
  balances: bigint[];
  invariant: bigint;
  tokenIndex: number;
}): bigint => {
  const ampTimesTotal = amplificationParameter * BigInt(balances.length);
  const balancesSumWithoutChosenToken = balances.reduce(
    (acc, balance, index) => {
      return index === tokenIndex ? acc : acc + balance;
    },
    BigInt(0)
  );
  const balancesProductWithoutChosenToken = balances.reduce(
    (acc, balance, index) => {
      return index === tokenIndex
        ? acc
        : SolidityMaths.mulDownFixed(acc, balance);
    },
    BigInt(ONE)
  );
  // P_D = P*n^n/D^(n-1)
  const P_D = SolidityMaths.divDown(
    SolidityMaths.mul(
      balancesProductWithoutChosenToken,
      BigInt(balances.length) * BigInt(balances.length)
    ),
    SolidityMaths.powUpFixed(invariant, BigInt(balances.length - 1))
  );

  const inv2 = SolidityMaths.mul(invariant, invariant);

  const c = SolidityMaths.mul(
    SolidityMaths.divUp(inv2, SolidityMaths.mul(ampTimesTotal, P_D)),
    BigInt(AMP_PRECISION)
  );

  const b = SolidityMaths.add(
    balancesSumWithoutChosenToken,
    SolidityMaths.mul(
      SolidityMaths.divDown(invariant, ampTimesTotal),
      BigInt(AMP_PRECISION)
    )
  );

  let prevTokenBalance;
  let tokenBalance = SolidityMaths.divUp(
    SolidityMaths.add(inv2, c),
    SolidityMaths.add(invariant, b)
  );
  // The for loop is to calculate the invariant using Newton-Raphson approximation,
  // which means that it will stop when it comes to the most approximated result of the equation f(s) = 0
  // Newton-Raphson: A method to find the equation result using a recursive method that does the steps:
  // 1 - Set a random value for x, we will call it x0 (in this case the x is the balance of the chosen token(s),
  //     and the random value we are using is s0 = ((inv^2)+c)/(inv+b);
  // 2 - finds the y0 for x0, y0 = f(x0);
  // 3 - Calculates the derivative of the function x0, f'(x0), that will be our angular coefficient m;
  // 4 - Finds a x1 using the line equation(y1-y0)=m(x1-x0), with y1=0 and m=f'(x0), equation -> -f(x0) = f'(x0)(x1-x0)
  // 5 - if |x1-x0| < 1, returns x1, if not, repeats the step 2 using the x1 as the new x0;
  // first s0 = x0 = ((inv^2)+c)/(inv+b)
  // s1 = (s0^2 + c)/(s0*2 - b)
  for (let i = 0; i < 255; i++) {
    prevTokenBalance = tokenBalance;

    tokenBalance = SolidityMaths.divUp(
      SolidityMaths.add(SolidityMaths.mul(tokenBalance, tokenBalance), c),
      SolidityMaths.sub(
        SolidityMaths.add(SolidityMaths.mul(tokenBalance, BigInt(2)), b),
        invariant
      )
    );

    if (SolidityMaths.abs(tokenBalance - prevTokenBalance) < BigInt(1)) {
      return tokenBalance;
    }
  }
  throw new BalancerError(BalancerErrorCode.STABLE_GET_BALANCE_DIDNT_CONVERGE);
};
