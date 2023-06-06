import { OutputReference, Relayer } from '@/modules/relayer/relayer.module';
import * as actions from '@/modules/relayer/actions';
import { buildPaths, MigrationPool, balancerRelayerInterface } from './helpers';
import { BigNumber } from '@ethersproject/bignumber';

/**
 * Builds migration call data.
 *
 * @param account Address of the migrating account
 * @param relayer Address of the relayer
 * @param bptAmount Amount of BPT to migrate
 * @param minBptOut Minimal amount of BPT to receive
 * @param from Pool to migrate from
 * @param to Pool to migrate to
 * @param peek Add a peek call for the expected BPT amount, decodable by the `decodePeak` function
 * @param fromGauge Unstake from gauge before migrating
 * @param toGauge Restake to gauge after migrating
 * @param authorisation User's authorisation to approve relayer in the vault
 * @returns call data
 */
export const migrationBuilder = (
  account: string,
  relayer: string,
  bptAmount: string,
  minBptOut: string,
  from: MigrationPool,
  to: MigrationPool,
  peek = false,
  fromGauge?: string,
  toGauge?: string,
  authorisation?: string
): string => {
  if (
    !from.id ||
    !to.id ||
    !from.tokens ||
    !to.tokens ||
    !from.poolType ||
    !to.poolType
  ) {
    throw 'Pool data is missing';
  }

  // Define tokens
  const fromTokens = from.tokens.flatMap(({ address }) => address);
  const toTokens = to.tokens.flatMap(({ address }) => address);

  // Prefer proportional exit, except for ComposableStableV1
  // Choose 0 as the exit token index
  // TODO: make default exit token dynamic
  const exitTokenIndex =
    from.poolType == 'ComposableStable' && from.poolTypeVersion == 1 ? 0 : -1;

  // Define output references
  let exitOutputReferences: OutputReference[];
  let swapOutputReferences: BigNumber[] = [];
  if (exitTokenIndex > -1) {
    exitOutputReferences = [
      {
        index: exitTokenIndex,
        key: Relayer.toChainedReference(`10${exitTokenIndex}`),
      },
    ];
    swapOutputReferences = [Relayer.toChainedReference(`20${exitTokenIndex}`)];
  } else {
    exitOutputReferences = fromTokens.map((_, idx) => ({
      index: idx,
      key: Relayer.toChainedReference(`10${idx}`),
    }));
    swapOutputReferences = fromTokens.map((_, idx) =>
      Relayer.toChainedReference(`20${idx}`)
    );
  }

  const joinAmount = Relayer.toChainedReference('999');

  // Configure migration steps
  const migrationSteps = [];
  let needsSwap = false; // only if from is ComposableStable

  if (from.poolType === 'ComposableStable') {
    needsSwap = true;
  }

  // 0. Set relayer approval
  if (authorisation) {
    migrationSteps.push(
      actions.setRelayerApproval(relayer, true, authorisation)
    );
  }

  // 1. Withdraw from old gauge
  if (fromGauge) {
    migrationSteps.push(
      actions.gaugeWithdrawal(fromGauge, account, relayer, bptAmount)
    );
  }

  // 2. Exit old pool
  migrationSteps.push(
    actions.exit(
      from.id,
      from.poolType,
      from.poolTypeVersion || 1,
      fromTokens,
      exitTokenIndex,
      exitOutputReferences,
      bptAmount,
      fromGauge ? relayer : account,
      relayer
    )
  );

  // 3. Swap
  const swapPaths = buildPaths(from.tokens, to.tokens, exitTokenIndex);
  if (swapPaths.flat().length > 0) {
    // Match exit to swap amounts
    const swaps = swapPaths
      .map((path, idx) => ({
        path,
        inputAmount: String(exitOutputReferences[idx].key),
        outputReference: swapOutputReferences[idx],
      }))
      .filter(({ path }) => path.length > 0);

    migrationSteps.push(actions.swaps(relayer, relayer, swaps));
  }

  // 3. Join
  // Match swap or exit references to the positions of join tokens
  // In case no reference is defined, the default is 0
  const references = toTokens
    .filter((address) => to.address != address)
    .map((to) => {
      const fromIdx = fromTokens.indexOf(to);
      return String(
        (needsSwap && swapOutputReferences[fromIdx]) ||
          exitOutputReferences[fromIdx]?.key ||
          0
      );
    });

  migrationSteps.push(
    actions.join(
      to.id,
      to.poolType,
      to.poolTypeVersion || 1,
      toTokens,
      references,
      minBptOut,
      String(joinAmount),
      relayer,
      toGauge ? relayer : account,
      true
    )
  );

  // Peek the last join amount
  if (peek === true) {
    migrationSteps.push(actions.peekChainedReferenceValue(String(joinAmount)));
  }

  // 4. Deposit to the new gauge
  if (toGauge) {
    migrationSteps.push(
      actions.gaugeDeposit(toGauge, relayer, account, String(joinAmount))
    );
  }

  const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
    migrationSteps,
  ]);

  return callData;
};
