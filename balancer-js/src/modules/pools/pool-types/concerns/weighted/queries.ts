import { bn } from '@/lib/utils';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { BalancerHelpers, Vault } from '@balancer-labs/typechain';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';

const queryJoinExactOut = async (
  balancerHelpers: BalancerHelpers,
  sender: string,
  recipient: string,
  poolId: string,
  assets: string[],
  bptOut = bn(1),
  maxAmountsIn = [MaxUint256, MaxUint256, MaxUint256],
  fromInternalBalance = false
): ReturnType<BalancerHelpers['queryJoin']> => {
  const userData = WeightedPoolEncoder.joinAllTokensInForExactBPTOut(bptOut);
  const params = await balancerHelpers.queryJoin(poolId, sender, recipient, {
    assets,
    maxAmountsIn,
    userData,
    fromInternalBalance,
  });

  return params;
};

const queryJoinExactIn = async (
  balancerHelpers: BalancerHelpers,
  sender: string,
  recipient: string,
  poolId: string,
  assets: string[],
  maxAmountsIn: BigNumber[],
  minBPTOut = bn(0),
  fromInternalBalance = false
): ReturnType<BalancerHelpers['queryJoin']> => {
  const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
    maxAmountsIn,
    minBPTOut
  );

  const params = await balancerHelpers.queryJoin(poolId, sender, recipient, {
    assets,
    maxAmountsIn,
    userData,
    fromInternalBalance,
  });

  return params;
};

const queryExit = async (
  balancerHelpers: BalancerHelpers,
  poolId: string,
  sender: string,
  recipient: string,
  assets: string[],
  bptIn: BigNumber,
  toInternalBalance = false
): ReturnType<BalancerHelpers['queryExit']> => {
  const params = await balancerHelpers.queryExit(poolId, sender, recipient, {
    assets,
    minAmountsOut: [0, 0, 0].map(bn),
    userData: WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn),
    toInternalBalance,
  });

  return params;
};

const joinExactOut = (
  vault: Vault,
  sender: string,
  recipient: string,
  poolId: string,
  assets: string[],
  bptOut: BigNumber,
  maxAmountsIn: BigNumber[],
  fromInternalBalance = false
) => {
  const to = vault.address;
  const from = sender;
  const data = vault.interface.encodeFunctionData('joinPool', [
    poolId,
    sender,
    recipient,
    {
      assets,
      maxAmountsIn,
      userData: WeightedPoolEncoder.joinAllTokensInForExactBPTOut(bptOut),
      fromInternalBalance,
    },
  ]);

  return { to, from, data };
};

const joinExactIn = (
  vault: Vault,
  sender: string,
  recipient: string,
  poolId: string,
  assets: string[],
  maxAmountsIn: BigNumber[],
  bptOut: BigNumber,
  fromInternalBalance = false
) => {
  const to = vault.address;
  const from = sender;
  const data = vault.interface.encodeFunctionData('joinPool', [
    poolId,
    sender,
    recipient,
    {
      assets,
      maxAmountsIn,
      userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(
        maxAmountsIn,
        bptOut
      ),
      fromInternalBalance,
    },
  ]);

  return { to, from, data };
};

const exit = (
  vault: Vault,
  sender: string,
  recipient: string,
  poolId: string,
  assets: string[],
  minAmountsOut: BigNumber[],
  bptIn: BigNumber,
  toInternalBalance = false
) => {
  const to = vault.address;
  const from = sender;
  const data = vault.interface.encodeFunctionData('exitPool', [
    poolId,
    sender,
    recipient,
    {
      assets,
      minAmountsOut,
      userData: WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn),
      toInternalBalance,
    },
  ]);

  return { to, from, data };
};

export {
  queryJoinExactOut,
  queryJoinExactIn,
  queryExit,
  joinExactOut,
  joinExactIn,
  exit,
};
