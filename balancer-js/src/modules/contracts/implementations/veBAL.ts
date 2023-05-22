import { JsonFragment } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { Multicall, VeBal__factory } from '@/contracts';
import { Multicaller } from '@/lib/utils/multiCaller';
import { toJsTimestamp } from '@/lib/utils/time';

export type VeBalLockInfo = {
  lockedEndDate: number;
  lockedAmount: string;
  totalSupply: string;
  epoch: string;
  hasExistingLock: boolean;
  isExpired: boolean;
};

type VeBalLockInfoResult = {
  locked: BigNumber[];
  epoch: BigNumber;
  totalSupply: BigNumber;
};

export class VeBal {
  constructor(private veBalAddress: string, private multicall: Multicall) {}

  public async getLockInfo(
    account: string
  ): Promise<VeBalLockInfo | undefined> {
    if (!this.veBalAddress) throw new Error('veBal address must be defined');

    const multicaller = new Multicaller(this.multicall, [
      ...(VeBal__factory.abi as readonly JsonFragment[]),
    ]);

    multicaller.call('locked', this.veBalAddress, 'locked', [account]);
    multicaller.call('epoch', this.veBalAddress, 'epoch');
    multicaller.call('totalSupply', this.veBalAddress, 'totalSupply()');

    const result = <VeBalLockInfoResult>await multicaller.execute();

    return this.formatLockInfo(result);
  }

  public formatLockInfo(lockInfo: VeBalLockInfoResult): VeBalLockInfo {
    const [lockedAmount, lockedEndDate] = lockInfo.locked;

    const hasExistingLock = lockedAmount.gt(0);
    const lockedEndDateNormalised = toJsTimestamp(lockedEndDate.toNumber());
    const isExpired = hasExistingLock && Date.now() > lockedEndDateNormalised;

    return {
      lockedEndDate: lockedEndDateNormalised,
      lockedAmount: formatUnits(lockedAmount),
      totalSupply: formatUnits(lockInfo.totalSupply),
      epoch: formatUnits(lockInfo.epoch, 0),
      hasExistingLock,
      isExpired,
    };
  }
}
