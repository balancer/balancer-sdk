import { Provider } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { Multicaller } from '@/lib/utils/multiCaller';
import { toJsTimestamp } from '@/lib/utils/time';
import { ContractAddresses } from '@/types';
import veBalAbi from '@/lib/abi/veBal.json';

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
  addresses: ContractAddresses;
  provider: Provider;

  constructor(addresses: ContractAddresses, provider: Provider) {
    this.addresses = addresses;
    this.provider = provider;
  }

  public async getLockInfo(
    account: string
  ): Promise<VeBalLockInfo | undefined> {
    if (!this.addresses.veBal) throw new Error('veBal address must be defined');

    const multicaller = new Multicaller(
      this.addresses.multicall,
      this.provider,
      veBalAbi
    );

    multicaller.call('locked', this.addresses.veBal, 'locked', [account]);
    multicaller.call('epoch', this.addresses.veBal, 'epoch');
    multicaller.call('totalSupply', this.addresses.veBal, 'totalSupply()');

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
