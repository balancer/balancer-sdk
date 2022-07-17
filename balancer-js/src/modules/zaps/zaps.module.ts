import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther, Zero } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { BalancerSdkConfig } from '@/types';

/**
TO DOS

Update typechain Relayer and use this.
 */

export class Zaps {
  constructor(public config: BalancerSdkConfig) {}
}
