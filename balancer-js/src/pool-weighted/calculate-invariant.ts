// Invariant is used to collect protocol swap fees by comparing its value between two times.
// So we can round always to the same direction. It is also used to initiate the BPT amount
// and, because there is a minimum BPT, we round down the invariant.
import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';

export const calculateInvariant = ({
  normalizedWeights,
  balances,
}: {
  normalizedWeights: string[];
  balances: string[];
}): bigint => {
  /**********************************************************************************************
   // invariant               _____                                                             //
   // wi = weight index i      | |      wi                                                      //
   // bi = balance index i     | |  bi ^   = i                                                  //
   // i = invariant                                                                             //
   **********************************************************************************************/
  let invariant = ONE;
  for (let i = 0; i < normalizedWeights.length; i++) {
    invariant = SolidityMaths.mulDownFixed(
      invariant,
      SolidityMaths.powDownFixed(
        BigInt(balances[i]),
        BigInt(normalizedWeights[i])
      )
    );
  }
  return invariant;
};
