import { toJsTimestamp } from '@/lib/utils/time';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import veBalAbi from '@/lib/abi/veBal.json';

export type VeBalLockInfo = {
  lockedEndDate: number;
  lockedAmount: string;
  totalSupply: string;
  epoch: string;
  hasExistingLock: boolean;
  isExpired: boolean;
};

export class VeBal {

  contract: Contract;

  constructor(address: string, provider: Provider) {
    this.contract =  new Contract(address, veBalAbi, provider);
  }

  public async getLockInfo(account: string): Promise<VeBalLockInfo> {

    const epoch = await this.contract.epoch();
    const locked = await this.contract.locked(account);
    const [totalSupply] = await this.contract.functions['totalSupply()']();
    const [lockedAmount, lockedEndDate] = locked;
    const hasExistingLock = lockedAmount.gt(0);
    const lockedEndDateNormalised = toJsTimestamp(lockedEndDate.toNumber());
    const isExpired = hasExistingLock && Date.now() > lockedEndDateNormalised;

    return {
      lockedEndDate: lockedEndDateNormalised,
      lockedAmount: formatUnits(lockedAmount),
      totalSupply: formatUnits(totalSupply),
      epoch: epoch.toString(),
      hasExistingLock,
      isExpired,
    };
  }

}
